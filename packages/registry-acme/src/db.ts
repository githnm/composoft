/**
 * In-memory data layer for Acme Support. Adapters and workflows call into
 * this module; blocks never touch it directly. The store is intentionally
 * boring — a SQLite or Postgres swap should not require changes to adapter
 * or workflow code.
 */

export type TicketStatus = "open" | "pending" | "closed";
export type TicketPriority = "low" | "normal" | "high" | "urgent";
export type AuthorKind = "customer" | "agent" | "system";

export type Customer = {
  id: string;
  name: string;
  email: string;
  vip: boolean;
  tags: readonly string[];
  createdAt: string;
};

export type Ticket = {
  id: string;
  subject: string;
  customerId: string;
  status: TicketStatus;
  priority: TicketPriority;
  escalated: boolean;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
};

export type Message = {
  id: string;
  ticketId: string;
  author: { kind: AuthorKind; id: string; name: string };
  body: string;
  createdAt: string;
};

export type AuditEntry = {
  id: string;
  action: string;
  ticketId?: string;
  actor: string;
  reason?: string;
  at: string;
};

const customers: Customer[] = [
  { id: "cust_acme", name: "Acme Corp", email: "ops@acme.example", vip: true, tags: ["enterprise", "multi-product"], createdAt: "2024-01-12T09:00:00.000Z" },
  { id: "cust_globex", name: "Globex", email: "support@globex.example", vip: true, tags: ["enterprise", "early-adopter"], createdAt: "2024-02-04T14:00:00.000Z" },
  { id: "cust_initech", name: "Initech", email: "it@initech.example", vip: false, tags: ["mid-market"], createdAt: "2024-03-22T10:00:00.000Z" },
  { id: "cust_umbrella", name: "Umbrella Inc", email: "platform@umbrella.example", vip: false, tags: ["mid-market", "regulated"], createdAt: "2024-04-15T11:00:00.000Z" },
  { id: "cust_stark", name: "Stark Industries", email: "tools@stark.example", vip: false, tags: ["mid-market"], createdAt: "2024-05-30T08:30:00.000Z" },
  { id: "cust_wayne", name: "Wayne Enterprises", email: "infra@wayne.example", vip: false, tags: ["mid-market", "trial"], createdAt: "2024-07-09T16:00:00.000Z" },
  { id: "cust_oscorp", name: "Oscorp", email: "support@oscorp.example", vip: false, tags: ["mid-market"], createdAt: "2024-08-18T12:00:00.000Z" },
  { id: "cust_dunder", name: "Dunder Mifflin", email: "admin@dundermifflin.example", vip: false, tags: ["smb"], createdAt: "2024-10-02T09:45:00.000Z" },
];

const NOW = Date.UTC(2026, 3, 28, 14, 0, 0);
const minutes = (n: number) => new Date(NOW - n * 60_000).toISOString();
const hours = (n: number) => minutes(n * 60);
const days = (n: number) => hours(n * 24);

const tickets: Ticket[] = [
  { id: "tk_001", subject: "Login broken after SSO migration", customerId: "cust_acme", status: "open", priority: "urgent", escalated: true, assignedTo: "queue:senior", createdAt: days(2), updatedAt: minutes(45), lastActivityAt: minutes(45) },
  { id: "tk_002", subject: "Reports export missing fields", customerId: "cust_acme", status: "pending", priority: "high", escalated: false, assignedTo: "agent_priya", createdAt: days(5), updatedAt: hours(8), lastActivityAt: hours(8) },
  { id: "tk_003", subject: "Onboarding question about audit log retention", customerId: "cust_acme", status: "closed", priority: "normal", escalated: false, assignedTo: "agent_diego", createdAt: days(20), updatedAt: days(15), lastActivityAt: days(15) },
  { id: "tk_004", subject: "Production data missing for last 6 hours", customerId: "cust_globex", status: "open", priority: "urgent", escalated: true, assignedTo: "queue:senior", createdAt: hours(7), updatedAt: minutes(12), lastActivityAt: minutes(12) },
  { id: "tk_005", subject: "Slow dashboard load times during peak hours", customerId: "cust_globex", status: "open", priority: "high", escalated: false, assignedTo: "agent_priya", createdAt: days(3), updatedAt: hours(2), lastActivityAt: hours(2) },
  { id: "tk_006", subject: "Custom report request: weekly revenue by region", customerId: "cust_globex", status: "pending", priority: "normal", escalated: false, assignedTo: "agent_marco", createdAt: days(7), updatedAt: days(2), lastActivityAt: days(2) },
  { id: "tk_007", subject: "How do I reset team admin?", customerId: "cust_initech", status: "open", priority: "normal", escalated: false, assignedTo: null, createdAt: hours(20), updatedAt: hours(20), lastActivityAt: hours(20) },
  { id: "tk_008", subject: "Billing question on March invoice", customerId: "cust_initech", status: "pending", priority: "normal", escalated: false, assignedTo: "agent_diego", createdAt: days(4), updatedAt: days(1), lastActivityAt: days(1) },
  { id: "tk_009", subject: "Profile picture upload returns 500", customerId: "cust_initech", status: "closed", priority: "low", escalated: false, assignedTo: "agent_marco", createdAt: days(18), updatedAt: days(12), lastActivityAt: days(12) },
  { id: "tk_010", subject: "Outage in EU region — multiple services affected", customerId: "cust_umbrella", status: "open", priority: "urgent", escalated: true, assignedTo: "queue:senior", createdAt: hours(3), updatedAt: minutes(8), lastActivityAt: minutes(8) },
  { id: "tk_011", subject: "API rate limits hit during nightly sync", customerId: "cust_umbrella", status: "open", priority: "high", escalated: false, assignedTo: "agent_priya", createdAt: days(1), updatedAt: hours(5), lastActivityAt: hours(5) },
  { id: "tk_012", subject: "Email notifications not arriving for some users", customerId: "cust_umbrella", status: "closed", priority: "normal", escalated: false, assignedTo: "agent_diego", createdAt: days(14), updatedAt: days(9), lastActivityAt: days(9) },
  { id: "tk_013", subject: "Jira integration not syncing new tickets", customerId: "cust_stark", status: "open", priority: "high", escalated: false, assignedTo: "agent_marco", createdAt: days(2), updatedAt: hours(11), lastActivityAt: hours(11) },
  { id: "tk_014", subject: "Trial extension request — pilot through Q3", customerId: "cust_stark", status: "pending", priority: "normal", escalated: false, assignedTo: "agent_priya", createdAt: days(6), updatedAt: days(3), lastActivityAt: days(3) },
  { id: "tk_015", subject: "Add custom domain to dashboard", customerId: "cust_wayne", status: "open", priority: "normal", escalated: false, assignedTo: null, createdAt: days(2), updatedAt: days(2), lastActivityAt: days(2) },
  { id: "tk_016", subject: "Feature request — dark mode for embedded views", customerId: "cust_wayne", status: "closed", priority: "low", escalated: false, assignedTo: "agent_diego", createdAt: days(28), updatedAt: days(22), lastActivityAt: days(22) },
  { id: "tk_017", subject: "Data import failing on CSV with > 10k rows", customerId: "cust_oscorp", status: "open", priority: "high", escalated: false, assignedTo: "agent_marco", createdAt: days(1), updatedAt: hours(4), lastActivityAt: hours(4) },
  { id: "tk_018", subject: "User permissions docs unclear for read-only roles", customerId: "cust_oscorp", status: "pending", priority: "normal", escalated: false, assignedTo: "agent_priya", createdAt: days(8), updatedAt: days(4), lastActivityAt: days(4) },
  { id: "tk_019", subject: "Migration to v3 completed, thanks for the help", customerId: "cust_dunder", status: "closed", priority: "normal", escalated: false, assignedTo: "agent_diego", createdAt: days(11), updatedAt: days(7), lastActivityAt: days(7) },
  { id: "tk_020", subject: "Cosmetic — logo alignment on report PDFs", customerId: "cust_dunder", status: "open", priority: "low", escalated: false, assignedTo: null, createdAt: days(5), updatedAt: days(5), lastActivityAt: days(5) },
];

type ThreadStep = {
  kind: AuthorKind;
  who: string;
  body: string;
  agoMin: number;
};

function thread(ticketId: string, steps: ThreadStep[]): Message[] {
  return steps.map((s, i) => ({
    id: `${ticketId}_m${i + 1}`,
    ticketId,
    author: {
      kind: s.kind,
      id: s.kind === "system" ? "system" : `${s.kind}_${s.who.toLowerCase().replace(/\s+/g, "")}`,
      name: s.who,
    },
    body: s.body,
    createdAt: new Date(NOW - s.agoMin * 60_000).toISOString(),
  }));
}

const messages: Message[] = [
  ...thread("tk_001", [
    { kind: "customer", who: "Jordan Lee", body: "After we cut over to the new SSO provider this morning, none of our agents can log in. Getting a 401 immediately.", agoMin: 60 * 48 },
    { kind: "system", who: "system", body: "Auto-routed to senior queue (priority: urgent).", agoMin: 60 * 47 },
    { kind: "agent", who: "Priya Shah", body: "Looking now. Can you share the IdP entity ID and a screenshot of the failure?", agoMin: 60 * 46 },
    { kind: "customer", who: "Jordan Lee", body: "Sent both via the secure share link.", agoMin: 60 * 24 },
    { kind: "agent", who: "Priya Shah", body: "Got it — investigating an audience-claim mismatch on our end.", agoMin: 45 },
  ]),
  ...thread("tk_002", [
    { kind: "customer", who: "Jordan Lee", body: "When we export the weekly report, the 'department' and 'cost center' columns come back blank.", agoMin: 60 * 24 * 5 },
    { kind: "agent", who: "Priya Shah", body: "Can you paste a sample row? I want to confirm whether the field is missing or just empty.", agoMin: 60 * 24 * 4 },
    { kind: "customer", who: "Jordan Lee", body: "Pasted in the share link. The header is there, the values are blank.", agoMin: 60 * 24 * 3 },
    { kind: "agent", who: "Priya Shah", body: "Confirmed — backend filter is dropping those columns for orgs with custom fields. Patch is queued.", agoMin: 60 * 8 },
  ]),
  ...thread("tk_003", [
    { kind: "customer", who: "Sam Patel", body: "How long do you retain audit logs by default?", agoMin: 60 * 24 * 20 },
    { kind: "agent", who: "Diego Ruiz", body: "Standard plans get 90 days; enterprise gets 13 months. You're on enterprise.", agoMin: 60 * 24 * 19 },
    { kind: "customer", who: "Sam Patel", body: "Perfect, that's what we needed for the audit. Closing this out.", agoMin: 60 * 24 * 15 },
    { kind: "system", who: "system", body: "Ticket closed by customer.", agoMin: 60 * 24 * 15 },
  ]),
  ...thread("tk_004", [
    { kind: "customer", who: "Maya Okafor", body: "We're missing the last 6 hours of production telemetry. Dashboards show a flat line at 08:00.", agoMin: 60 * 7 },
    { kind: "system", who: "system", body: "Auto-routed to senior queue (priority: urgent).", agoMin: 60 * 7 - 1 },
    { kind: "agent", who: "Priya Shah", body: "Pulling logs. I see the ingest pipeline paused at 08:02 — investigating why.", agoMin: 60 * 6 },
    { kind: "agent", who: "Priya Shah", body: "Cause identified: a stuck Kafka consumer. Backfill in progress, ETA 30 min.", agoMin: 60 * 2 },
    { kind: "agent", who: "Priya Shah", body: "Backfill complete. Please confirm dashboards look right on your side.", agoMin: 12 },
  ]),
  ...thread("tk_005", [
    { kind: "customer", who: "Maya Okafor", body: "The main dashboard takes 8–12 seconds to load between 9–11am ET. Outside that window it's fine.", agoMin: 60 * 24 * 3 },
    { kind: "agent", who: "Priya Shah", body: "Likely the cohort-rollup query. I'll add an index and report back tomorrow.", agoMin: 60 * 24 * 2 },
    { kind: "agent", who: "Priya Shah", body: "Index deployed. Median load is 1.4s in our staging replay. Watch tomorrow's morning peak and let me know.", agoMin: 60 * 2 },
  ]),
  ...thread("tk_006", [
    { kind: "customer", who: "Maya Okafor", body: "Can we get a saved report: weekly revenue by region, scheduled Mondays at 7am?", agoMin: 60 * 24 * 7 },
    { kind: "agent", who: "Marco Lin", body: "Yes — I'll mock it up and share before adding to your account.", agoMin: 60 * 24 * 6 },
    { kind: "agent", who: "Marco Lin", body: "Mock attached in the share link. If it looks right, I'll wire up the schedule.", agoMin: 60 * 24 * 2 },
  ]),
  ...thread("tk_007", [
    { kind: "customer", who: "Pat Nguyen", body: "Our admin left the company. How do I take over the team owner role?", agoMin: 60 * 20 },
    { kind: "system", who: "system", body: "Auto-categorized: account-management.", agoMin: 60 * 20 - 1 },
    { kind: "customer", who: "Pat Nguyen", body: "I have access to the admin's email if that helps.", agoMin: 60 * 19 },
  ]),
  ...thread("tk_008", [
    { kind: "customer", who: "Pat Nguyen", body: "Our March invoice shows two charges for the analytics add-on. We only have one.", agoMin: 60 * 24 * 4 },
    { kind: "agent", who: "Diego Ruiz", body: "Looking at the billing log — appears to be a duplicate from the prorated upgrade. I'll issue a credit.", agoMin: 60 * 24 * 3 },
    { kind: "agent", who: "Diego Ruiz", body: "Credit applied; you'll see it on next month's invoice.", agoMin: 60 * 24 },
  ]),
  ...thread("tk_009", [
    { kind: "customer", who: "Pat Nguyen", body: "Trying to upload a profile picture, returns 500.", agoMin: 60 * 24 * 18 },
    { kind: "agent", who: "Marco Lin", body: "What format and size?", agoMin: 60 * 24 * 17 },
    { kind: "customer", who: "Pat Nguyen", body: "PNG, 4MB.", agoMin: 60 * 24 * 16 },
    { kind: "agent", who: "Marco Lin", body: "Limit was 2MB undocumented; raised to 8MB. Try again.", agoMin: 60 * 24 * 13 },
    { kind: "customer", who: "Pat Nguyen", body: "Works, thanks!", agoMin: 60 * 24 * 12 },
  ]),
  ...thread("tk_010", [
    { kind: "customer", who: "Riya Sharma", body: "EU region is unreachable for our team. Status page says all green but we can't connect.", agoMin: 60 * 3 },
    { kind: "system", who: "system", body: "Auto-routed to senior queue (priority: urgent).", agoMin: 60 * 3 - 1 },
    { kind: "agent", who: "Priya Shah", body: "Confirming on our side — partial loss of one EU AZ. Failing over now.", agoMin: 60 * 2 },
    { kind: "agent", who: "Priya Shah", body: "Failover complete. Please retest.", agoMin: 8 },
  ]),
  ...thread("tk_011", [
    { kind: "customer", who: "Riya Sharma", body: "Our nightly sync hits the 1000 req/min limit around 3am UTC and partially fails.", agoMin: 60 * 24 },
    { kind: "agent", who: "Priya Shah", body: "Burst budget can be raised to 2500/min for your tier. Want me to enable it?", agoMin: 60 * 12 },
    { kind: "customer", who: "Riya Sharma", body: "Yes please.", agoMin: 60 * 5 },
  ]),
  ...thread("tk_012", [
    { kind: "customer", who: "Riya Sharma", body: "Some users on @umbrella.example aren't getting notification emails.", agoMin: 60 * 24 * 14 },
    { kind: "agent", who: "Diego Ruiz", body: "Checked — the domain was on a soft-bounce list from a previous bad signup. Cleared.", agoMin: 60 * 24 * 11 },
    { kind: "customer", who: "Riya Sharma", body: "Working now. Thanks.", agoMin: 60 * 24 * 9 },
  ]),
  ...thread("tk_013", [
    { kind: "customer", who: "Avi Goldberg", body: "New tickets in our Jira project aren't showing up here anymore. Stopped about 3 days ago.", agoMin: 60 * 24 * 2 },
    { kind: "agent", who: "Marco Lin", body: "Webhook secret rotated on Jira's side. I'll send a fresh secret you can paste in.", agoMin: 60 * 24 },
    { kind: "agent", who: "Marco Lin", body: "Sent. Let me know once pasted and I'll trigger a backfill.", agoMin: 60 * 11 },
  ]),
  ...thread("tk_014", [
    { kind: "customer", who: "Avi Goldberg", body: "We'd like to extend our trial through end of Q3 — the rollout is taking longer than planned.", agoMin: 60 * 24 * 6 },
    { kind: "agent", who: "Priya Shah", body: "I'll loop in your AE. From a support side we can keep things running in the meantime.", agoMin: 60 * 24 * 5 },
    { kind: "agent", who: "Priya Shah", body: "AE confirmed extension through Sept 30.", agoMin: 60 * 24 * 3 },
  ]),
  ...thread("tk_015", [
    { kind: "customer", who: "Bruce Tan", body: "We want to point dashboard.wayne.example at our deployment.", agoMin: 60 * 24 * 2 },
    { kind: "system", who: "system", body: "Auto-categorized: configuration.", agoMin: 60 * 24 * 2 - 1 },
    { kind: "customer", who: "Bruce Tan", body: "Our DNS team is ready when you are.", agoMin: 60 * 24 * 2 - 5 },
  ]),
  ...thread("tk_016", [
    { kind: "customer", who: "Bruce Tan", body: "Any chance of a dark theme for the embedded analytics views? Some of our internal tools are dark-default.", agoMin: 60 * 24 * 28 },
    { kind: "agent", who: "Diego Ruiz", body: "Filed as a feature request with product. I'll close this here and link to the public roadmap entry.", agoMin: 60 * 24 * 23 },
    { kind: "system", who: "system", body: "Ticket closed; linked to product request PRD-414.", agoMin: 60 * 24 * 22 },
  ]),
  ...thread("tk_017", [
    { kind: "customer", who: "Liu Chen", body: "Importing a 12k-row CSV via the bulk upload UI fails after a couple of minutes.", agoMin: 60 * 24 },
    { kind: "agent", who: "Marco Lin", body: "What does the error say? And which timezone is your account in?", agoMin: 60 * 18 },
    { kind: "customer", who: "Liu Chen", body: "'Internal error 502'. Account is UTC-5.", agoMin: 60 * 6 },
    { kind: "agent", who: "Marco Lin", body: "Reproduced internally — proxy timeout at 120s. Working on a chunked-upload path.", agoMin: 60 * 4 },
  ]),
  ...thread("tk_018", [
    { kind: "customer", who: "Liu Chen", body: "The docs for read-only roles list 'view dashboards' but our read-only users can also export. Is that intended?", agoMin: 60 * 24 * 8 },
    { kind: "agent", who: "Priya Shah", body: "It's intentional — export inherits view. We'll clarify the docs.", agoMin: 60 * 24 * 6 },
    { kind: "agent", who: "Priya Shah", body: "Docs updated; let me know if the new wording works for your audit team.", agoMin: 60 * 24 * 4 },
  ]),
  ...thread("tk_019", [
    { kind: "customer", who: "Holly Park", body: "v3 migration completed last night with no surprises. Thanks for staying on the line.", agoMin: 60 * 24 * 11 },
    { kind: "agent", who: "Diego Ruiz", body: "Glad it went smoothly. Closing this out — ping us if anything pops up.", agoMin: 60 * 24 * 8 },
    { kind: "system", who: "system", body: "Ticket closed.", agoMin: 60 * 24 * 7 },
  ]),
  ...thread("tk_020", [
    { kind: "customer", who: "Holly Park", body: "Our logo on report PDFs is shifted ~10px to the right vs. the dashboard preview.", agoMin: 60 * 24 * 5 },
    { kind: "system", who: "system", body: "Auto-categorized: visual-bug.", agoMin: 60 * 24 * 5 - 1 },
    { kind: "customer", who: "Holly Park", body: "Not blocking, just cosmetic.", agoMin: 60 * 24 * 5 - 5 },
  ]),
];

const auditLog: AuditEntry[] = [];

let auditCounter = 1;

export const db = {
  tickets: {
    list(filter: {
      status?: TicketStatus;
      priority?: TicketPriority;
      assignedTo?: string;
      customerId?: string;
      escalated?: boolean;
    }): Ticket[] {
      return tickets.filter((t) =>
        (filter.status === undefined || t.status === filter.status) &&
        (filter.priority === undefined || t.priority === filter.priority) &&
        (filter.assignedTo === undefined || t.assignedTo === filter.assignedTo) &&
        (filter.customerId === undefined || t.customerId === filter.customerId) &&
        (filter.escalated === undefined || t.escalated === filter.escalated),
      );
    },
    byId(id: string): Ticket | undefined {
      return tickets.find((t) => t.id === id);
    },
    update(id: string, patch: Partial<Omit<Ticket, "id" | "createdAt">>): Ticket {
      const t = tickets.find((tk) => tk.id === id);
      if (!t) throw new Error(`ticket ${id} not found`);
      const now = new Date().toISOString();
      Object.assign(t, patch, { updatedAt: now, lastActivityAt: now });
      return t;
    },
  },
  customers: {
    byId(id: string): Customer | undefined {
      return customers.find((c) => c.id === id);
    },
    recentTicketIds(customerId: string, limit = 5): string[] {
      return tickets
        .filter((t) => t.customerId === customerId)
        .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))
        .slice(0, limit)
        .map((t) => t.id);
    },
  },
  conversations: {
    byTicketId(ticketId: string): Message[] {
      return messages
        .filter((m) => m.ticketId === ticketId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    append(message: Message): void {
      messages.push(message);
    },
  },
  auditLog: {
    write(entry: Omit<AuditEntry, "id">): AuditEntry {
      const e: AuditEntry = { id: `aud_${auditCounter++}`, ...entry };
      auditLog.push(e);
      return e;
    },
    all(): readonly AuditEntry[] {
      return auditLog;
    },
  },
};
