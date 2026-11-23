// Services every new branch starts with. Admins can adjust counters and times from the dashboard.
export const DEFAULT_SERVICES = [
    { code: "general", name: "General Consultation", description: "Walk-in and scheduled consultations", icon: "✚", prefix: "G", avgServiceMinutes: 6 },
    { code: "documents", name: "Document Processing", description: "Requests, releases, and certifications", icon: "🗎", prefix: "D", avgServiceMinutes: 9 },
    { code: "priority", name: "Priority Lane", description: "Seniors, PWDs, pregnant, and urgent cases", icon: "☆", prefix: "P", avgServiceMinutes: 5 },
];

export async function insertDefaultServices(client, branchId) {
    for (const [index, service] of DEFAULT_SERVICES.entries()) {
        await client.query(
            `INSERT INTO services (branch_id, code, name, description, icon, prefix, avg_service_minutes, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (branch_id, code) DO NOTHING`,
            [branchId, service.code, service.name, service.description, service.icon, service.prefix, service.avgServiceMinutes, index],
        );
    }
}
