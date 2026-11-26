-- QueueWise schema. Idempotent: safe to run again with `npm run db:migrate`.
-- For future changes that alter existing tables, switch to a versioned migration tool.

CREATE TABLE IF NOT EXISTS organizations (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS branches (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    name             text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
    slug             text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$'),
    timezone         text NOT NULL DEFAULT 'Asia/Manila',
    created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id      uuid NOT NULL REFERENCES branches (id) ON DELETE CASCADE,
    email          text NOT NULL CHECK (email = lower(email) AND char_length(email) <= 254),
    name           text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
    password_hash  text NOT NULL,
    role           text NOT NULL CHECK (role IN ('admin', 'staff')),
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (email);

-- Only a SHA-256 hash of each session token is stored, so a leaked table can't be used to log in.
CREATE TABLE IF NOT EXISTS sessions (
    token_hash  bytea PRIMARY KEY,
    user_id     uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    expires_at  timestamptz NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS password_resets (
    token_hash  bytea PRIMARY KEY,
    user_id     uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    expires_at  timestamptz NOT NULL,
    used_at     timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS services (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id            uuid NOT NULL REFERENCES branches (id) ON DELETE CASCADE,
    code                 text NOT NULL CHECK (code ~ '^[a-z0-9-]{2,30}$'),
    name                 text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 60),
    description          text NOT NULL DEFAULT '' CHECK (char_length(description) <= 120),
    icon                 text NOT NULL DEFAULT '•' CHECK (char_length(icon) <= 4),
    prefix               char(1) NOT NULL CHECK (prefix ~ '^[A-Z]$'),
    avg_service_minutes  int NOT NULL DEFAULT 6 CHECK (avg_service_minutes BETWEEN 1 AND 240),
    is_open              boolean NOT NULL DEFAULT true,
    sort_order           int NOT NULL DEFAULT 0,
    UNIQUE (branch_id, code),
    UNIQUE (branch_id, prefix)
);

-- One counter per branch, prefix and day, incremented atomically to number tickets (G-001, G-002, ...).
CREATE TABLE IF NOT EXISTS ticket_sequences (
    branch_id   uuid NOT NULL REFERENCES branches (id) ON DELETE CASCADE,
    prefix      char(1) NOT NULL,
    day         date NOT NULL,
    last_value  int NOT NULL,
    PRIMARY KEY (branch_id, prefix, day)
);

CREATE TABLE IF NOT EXISTS tickets (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id          uuid NOT NULL REFERENCES branches (id) ON DELETE CASCADE,
    service_id         uuid NOT NULL REFERENCES services (id) ON DELETE CASCADE,
    number             text NOT NULL CHECK (number ~ '^[A-Z]-[0-9]{3,4}$'),
    day                date NOT NULL,
    -- Personal data: nullable so the retention job can erase it.
    customer_name      text CHECK (char_length(customer_name) <= 60),
    phone              text CHECK (char_length(phone) <= 16),
    priority           text NOT NULL DEFAULT 'none' CHECK (priority IN ('none', 'senior', 'pwd', 'pregnant', 'urgent')),
    status             text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'called', 'completed', 'cancelled', 'no_show')),
    scheduled_for      timestamptz,
    queue_at           timestamptz NOT NULL,
    counter            int CHECK (counter BETWEEN 1 AND 99),
    called_by          uuid REFERENCES users (id) ON DELETE SET NULL,
    recall_count       int NOT NULL DEFAULT 0,
    access_token_hash  bytea NOT NULL,
    created_at         timestamptz NOT NULL DEFAULT now(),
    called_at          timestamptz,
    finished_at        timestamptz,
    UNIQUE (branch_id, day, number)
);
CREATE INDEX IF NOT EXISTS tickets_queue_idx ON tickets (branch_id, day, status, queue_at);
CREATE INDEX IF NOT EXISTS tickets_service_idx ON tickets (service_id, day, called_at DESC);
CREATE INDEX IF NOT EXISTS tickets_slot_idx ON tickets (service_id, scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX IF NOT EXISTS tickets_created_idx ON tickets (created_at);
-- Each counter serves one ticket at a time (also stops double-click races on "Call Next").
-- One staff member may run several counters, so this is per counter, not per user.
DROP INDEX IF EXISTS tickets_one_active_call_idx;
CREATE UNIQUE INDEX IF NOT EXISTS tickets_one_call_per_counter_idx ON tickets (branch_id, day, counter) WHERE status = 'called';

-- Data fix: the old "Priority Lane" service duplicated the per-ticket priority choice. Move any of its tickets to
-- the branch's General Consultation service (keeping their numbers and priority), then remove it.
-- Safe to run repeatedly; branches without a General service are left untouched.
UPDATE tickets t SET service_id = g.id
FROM services p
JOIN services g ON g.branch_id = p.branch_id AND g.code = 'general'
WHERE p.code = 'priority' AND t.service_id = p.id;

DELETE FROM services p
WHERE p.code = 'priority'
  AND EXISTS (SELECT 1 FROM services g WHERE g.branch_id = p.branch_id AND g.code = 'general')
  AND NOT EXISTS (SELECT 1 FROM tickets t WHERE t.service_id = p.id);

-- Counters belong to the branch, not to a service: every counter serves every service from one shared line.
-- First run only: add branches.counter_count, carrying over the sum of the old per-service open counters.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'branches' AND column_name = 'counter_count'
    ) THEN
        ALTER TABLE branches ADD COLUMN counter_count int NOT NULL DEFAULT 1 CHECK (counter_count BETWEEN 0 AND 99);
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema() AND table_name = 'services' AND column_name = 'open_counters'
        ) THEN
            EXECUTE 'UPDATE branches b SET counter_count = LEAST(99, GREATEST(1, COALESCE(
                (SELECT sum(s.open_counters) FROM services s WHERE s.branch_id = b.id AND s.is_open), 1)))';
        END IF;
    END IF;
END $$;

ALTER TABLE services DROP COLUMN IF EXISTS open_counters;

-- Appointments join the line only once checked in (by the visitor within the check-in window, or by staff).
-- First run only: add tickets.checked_in_at. Bookings already in line under the old rules (their time has passed)
-- count as checked in, so they aren't expired as no-shows by the new rule.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'tickets' AND column_name = 'checked_in_at'
    ) THEN
        ALTER TABLE tickets ADD COLUMN checked_in_at timestamptz;
        UPDATE tickets SET checked_in_at = scheduled_for
        WHERE scheduled_for IS NOT NULL AND scheduled_for <= now() AND status IN ('waiting', 'called');
    END IF;
END $$;

-- Finds bookings whose check-in window has passed (see jobs/maintenance.js).
CREATE INDEX IF NOT EXISTS tickets_awaiting_checkin_idx ON tickets (scheduled_for)
    WHERE status = 'waiting' AND scheduled_for IS NOT NULL AND checked_in_at IS NULL;
