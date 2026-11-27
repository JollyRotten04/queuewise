// Shapes returned by the Express API (backend/src/services/queue.js and routes).

export type Priority = "none" | "senior" | "pwd" | "pregnant" | "urgent";
export type TicketStatus = "waiting" | "scheduled" | "called" | "completed" | "cancelled" | "no_show";

export interface PublicService {
    id: string;
    code: string;
    name: string;
    description: string;
    icon: string;
    prefix: string;
    isOpen: boolean;
    waiting: number;
    nowServing: string | null;
    estimatedWaitMinutes: number;
}

export interface BranchInfo {
    branch: { name: string; slug: string; timezone: string };
    services: PublicService[];
    booking: { slots: string[]; maxDays: number; today: string };
}

export interface ActiveTicket {
    number: string;
    day: string;
    status: "waiting" | "scheduled" | "called";
}

export interface TicketInfo {
    number: string;
    day: string;
    status: TicketStatus;
    service: { name: string; code: string };
    priority: Priority;
    ahead: number | null;
    estimatedMinutes: number | null;
    nowServing: string | null;
    counter: number | null;
    recallCount: number;
    scheduledFor: string | null;
    // Appointments only. They join the line by themselves at scheduledFor; early check-in is optional from opensAt.
    checkIn: { opensAt: string; isOpen: boolean; checkedInAt: string | null } | null;
    isOwner: boolean;
}

export interface DisplayInfo {
    branch: { name: string };
    // One entry per open counter; every counter serves every service.
    counters: { counter: number; serving: { number: string; calledAt: string } | null }[];
    upNext: string[];
}

export interface StaffTicket {
    id: string;
    number: string;
    customerName: string | null;
    service: { id: string; name: string };
    priority: Priority;
    status: TicketStatus;
    queueAt: string;
    scheduledFor: string | null;
    checkedInAt: string | null;
    counter: number | null;
    recallCount: number;
    calledAt: string | null;
}

export interface TodayStats {
    waitingNow: number;
    scheduledLater: number;
    servedToday: number;
    noShows: number;
    avgWaitMinutes: number;
    priorityServed: number;
}

export interface Overview {
    stats: TodayStats;
    waiting: StaffTicket[];
    // Tickets being served right now, one per busy counter. canAct: this user may recall/complete it.
    active: (StaffTicket & { canAct: boolean })[];
    // Today's bookings whose time hasn't come yet and that haven't checked in early (not in line yet).
    appointments: StaffTicket[];
    checkInWindow: { earlyMinutes: number };
    services: { id: string; name: string; isOpen: boolean }[];
    // Counters open at this branch. Every counter serves every service.
    counterCount: number;
    branch: { name: string; slug: string };
}

export interface QueueService {
    id: string;
    code: string;
    name: string;
    icon: string;
    prefix: string;
    avgServiceMinutes: number;
    isOpen: boolean;
    waiting: number;
    nowServing: string | null;
    avgWaitMinutes: number;
}

export interface QueuesResponse {
    services: QueueService[];
    counterCount: number;
    canManage: boolean;
    branch: { name: string; slug: string };
}

export interface Analytics {
    stats: TodayStats;
    hourlyWait: { hour: number; minutes: number }[];
    servedByService: { name: string; served: number }[];
}

export interface Me {
    user: { name: string; email: string; role: "admin" | "staff" };
    branch: { name: string; slug: string; timezone: string };
}

export const priorityLabels: Record<Priority, string> = {
    none: "Regular",
    senior: "Senior Citizen",
    pwd: "Person with Disability",
    pregnant: "Pregnant",
    urgent: "Urgent Case",
};

export const statusLabels: Record<TicketStatus, string> = {
    waiting: "Waiting",
    scheduled: "Scheduled",
    called: "Called",
    completed: "Completed",
    cancelled: "Cancelled",
    no_show: "No-show",
};

export const TICKET_NUMBER_PATTERN = /^[A-Z]-\d{3,4}$/;
export const SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$/;
export const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
