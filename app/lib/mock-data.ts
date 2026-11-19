// Mock data and shared types for the frontend.
// TODO(backend): replace these exports with API calls. The types are the contract the UI expects.

export type ServiceId = "general" | "documents" | "priority";
export type PriorityCategory = "none" | "senior" | "pwd" | "pregnant" | "urgent";
export type TicketStatus = "waiting" | "called" | "serving" | "completed" | "cancelled" | "no-show";

export interface Service {
    id: ServiceId;
    name: string;
    description: string;
    icon: string;
    prefix: "G" | "D" | "P";
    avgServiceMinutes: number;
}

export interface Ticket {
    number: string;
    customerName: string;
    serviceId: ServiceId;
    priority: PriorityCategory;
    status: TicketStatus;
    joinedAt: string; // "HH:MM" display time
}

export interface QueueSummary {
    serviceId: ServiceId;
    isOpen: boolean;
    counters: number;
    waiting: number;
    nowServing: string | null;
    avgWaitMinutes: number;
}

export const services: Service[] = [
    { id: "general", name: "General Consultation", description: "Walk-in and scheduled consultations", icon: "✚", prefix: "G", avgServiceMinutes: 6 },
    { id: "documents", name: "Document Processing", description: "Requests, releases, and certifications", icon: "🗎", prefix: "D", avgServiceMinutes: 9 },
    { id: "priority", name: "Priority Lane", description: "Seniors, PWDs, pregnant, and urgent cases", icon: "☆", prefix: "P", avgServiceMinutes: 5 },
];

export const priorityLabels: Record<PriorityCategory, string> = {
    none: "Regular",
    senior: "Senior Citizen",
    pwd: "Person with Disability",
    pregnant: "Pregnant",
    urgent: "Urgent Case",
};

export const statusLabels: Record<TicketStatus, string> = {
    waiting: "Waiting",
    called: "Called",
    serving: "Serving",
    completed: "Completed",
    cancelled: "Cancelled",
    "no-show": "No-show",
};

export const mockTickets: Ticket[] = [
    { number: "P-003", customerName: "Lorna B.", serviceId: "priority", priority: "senior", status: "waiting", joinedAt: "09:02" },
    { number: "G-024", customerName: "Carlo M.", serviceId: "general", priority: "none", status: "waiting", joinedAt: "09:05" },
    { number: "D-011", customerName: "Aira T.", serviceId: "documents", priority: "none", status: "waiting", joinedAt: "09:07" },
    { number: "G-025", customerName: "Ben R.", serviceId: "general", priority: "none", status: "waiting", joinedAt: "09:10" },
    { number: "P-004", customerName: "Nestor V.", serviceId: "priority", priority: "pwd", status: "waiting", joinedAt: "09:11" },
    { number: "D-012", customerName: "Kim A.", serviceId: "documents", priority: "none", status: "waiting", joinedAt: "09:14" },
    { number: "G-026", customerName: "Rhea S.", serviceId: "general", priority: "none", status: "waiting", joinedAt: "09:16" },
    { number: "G-027", customerName: "Paolo D.", serviceId: "general", priority: "none", status: "waiting", joinedAt: "09:19" },
];

export const mockQueues: QueueSummary[] = [
    { serviceId: "general", isOpen: true, counters: 3, waiting: 4, nowServing: "G-023", avgWaitMinutes: 14 },
    { serviceId: "documents", isOpen: true, counters: 2, waiting: 2, nowServing: "D-010", avgWaitMinutes: 18 },
    { serviceId: "priority", isOpen: true, counters: 1, waiting: 2, nowServing: "P-002", avgWaitMinutes: 6 },
];

export const mockStats = {
    waitingNow: 8,
    servedToday: 57,
    avgWaitMinutes: 13,
    noShows: 3,
};

export const mockHourlyWait = [
    { hour: "8 AM", minutes: 9 },
    { hour: "9 AM", minutes: 16 },
    { hour: "10 AM", minutes: 21 },
    { hour: "11 AM", minutes: 18 },
    { hour: "12 PM", minutes: 11 },
    { hour: "1 PM", minutes: 15 },
    { hour: "2 PM", minutes: 19 },
    { hour: "3 PM", minutes: 12 },
    { hour: "4 PM", minutes: 7 },
];

export const mockServedByService: { serviceId: ServiceId; served: number }[] = [
    { serviceId: "general", served: 31 },
    { serviceId: "documents", served: 17 },
    { serviceId: "priority", served: 9 },
];

const ticketPattern = /^[GDP]-\d{3}$/;

export function isValidTicketNumber(value: string): boolean {
    return ticketPattern.test(value);
}

export function getService(id: ServiceId): Service {
    return services.find((s) => s.id === id) ?? services[0];
}

export function getServiceByPrefix(prefix: string): Service | undefined {
    return services.find((s) => s.prefix === prefix);
}
