// In-memory data layer for the support registry. Seed data is realistic
// (10 enterprise accounts, 25 tickets across statuses, 6 agents) so the
// composer's prompt has something concrete to reason about and the
// generated app has data to render on first boot. Replace with a real
// database client (Postgres, Supabase, etc.) before deploying — keep the
// `db.X.list` accessor shape so adapters don't have to change.

export type AccountPlan = "starter" | "growth" | "enterprise";

export type Account = {
  id: string;
  name: string;
  plan: AccountPlan;
  arr: number;
  healthScore: number;
  accountManagerId: string;
  createdAt: string;
};

export type TicketStatus = "new" | "open" | "pending" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketChannel = "email" | "slack" | "web";

export type Ticket = {
  id: string;
  accountId: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  channel: TicketChannel;
  assigneeId: string | null;
  requesterEmail: string;
  slaDueAt: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Conversation = {
  id: string;
  ticketId: string;
  channel: TicketChannel;
  status: TicketStatus;
};

export type Message = {
  id: string;
  conversationId: string;
  body: string;
  fromAgent: boolean;
  fromName: string;
  channel: TicketChannel;
  createdAt: string;
};

export type AgentRole = "agent" | "lead" | "engineer";

export type Agent = {
  id: string;
  name: string;
  email: string;
  role: AgentRole;
  avatarUrl: string;
  isActive: boolean;
};

export type Macro = {
  id: string;
  title: string;
  body: string;
  category: string;
};

export type AuditEntry = {
  id: string;
  ticketId: string | null;
  actorId: string;
  action: string;
  detail: string;
  at: string;
};

const now = () => new Date().toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000).toISOString();
const hoursAhead = (n: number) => new Date(Date.now() + n * 3600_000).toISOString();

const accounts: Account[] = [
  { id: "acc_acme",     name: "Acme Co",            plan: "enterprise", arr: 250000, healthScore: 78, accountManagerId: "ag_morgan",  createdAt: daysAgo(420) },
  { id: "acc_brio",     name: "Brio Labs",          plan: "growth",     arr:  68000, healthScore: 91, accountManagerId: "ag_sasha",   createdAt: daysAgo(220) },
  { id: "acc_celest",   name: "Celest Software",    plan: "enterprise", arr: 180000, healthScore: 62, accountManagerId: "ag_morgan",  createdAt: daysAgo(310) },
  { id: "acc_dover",    name: "Dover Logistics",    plan: "growth",     arr:  45000, healthScore: 84, accountManagerId: "ag_sasha",   createdAt: daysAgo(140) },
  { id: "acc_evergrn",  name: "Evergreen Health",   plan: "enterprise", arr: 210000, healthScore: 70, accountManagerId: "ag_morgan",  createdAt: daysAgo(540) },
  { id: "acc_finch",    name: "Finch Robotics",     plan: "starter",    arr:  12000, healthScore: 88, accountManagerId: "ag_sasha",   createdAt: daysAgo( 60) },
  { id: "acc_gleam",    name: "Gleam Studio",       plan: "growth",     arr:  52000, healthScore: 79, accountManagerId: "ag_sasha",   createdAt: daysAgo(180) },
  { id: "acc_helix",    name: "Helix Bio",          plan: "enterprise", arr: 195000, healthScore: 55, accountManagerId: "ag_morgan",  createdAt: daysAgo(380) },
  { id: "acc_iron",     name: "Iron & Co",          plan: "starter",    arr:  18000, healthScore: 93, accountManagerId: "ag_sasha",   createdAt: daysAgo( 90) },
  { id: "acc_juniper",  name: "Juniper Press",      plan: "growth",     arr:  72000, healthScore: 81, accountManagerId: "ag_morgan",  createdAt: daysAgo(260) },
];

const agents: Agent[] = [
  { id: "ag_morgan", name: "Morgan Reyes",  email: "morgan@beam.test",  role: "lead",     avatarUrl: "/avatars/morgan.png",  isActive: true  },
  { id: "ag_sasha",  name: "Sasha Patel",   email: "sasha@beam.test",   role: "lead",     avatarUrl: "/avatars/sasha.png",   isActive: true  },
  { id: "ag_devon",  name: "Devon Kim",     email: "devon@beam.test",   role: "agent",    avatarUrl: "/avatars/devon.png",   isActive: true  },
  { id: "ag_riley",  name: "Riley Nguyen",  email: "riley@beam.test",   role: "agent",    avatarUrl: "/avatars/riley.png",   isActive: true  },
  { id: "ag_jordan", name: "Jordan Park",   email: "jordan@beam.test",  role: "engineer", avatarUrl: "/avatars/jordan.png",  isActive: true  },
  { id: "ag_alex",   name: "Alex Cole",     email: "alex@beam.test",    role: "engineer", avatarUrl: "/avatars/alex.png",    isActive: false },
];

// 25 tickets across statuses with realistic subjects.
const tickets: Ticket[] = [
  { id: "t_001", accountId: "acc_acme",    subject: "SAML SSO failing for new SCIM-provisioned users",            status: "open",     priority: "high",   channel: "slack", assigneeId: "ag_devon",  requesterEmail: "ops@acme.test",       slaDueAt: hoursAhead(  4), resolvedAt: null,         createdAt: daysAgo( 2), updatedAt: daysAgo(0) },
  { id: "t_002", accountId: "acc_brio",    subject: "Webhook deliveries dropped to 0 after region migration",      status: "new",      priority: "urgent", channel: "slack", assigneeId: null,        requesterEmail: "team@brio.test",      slaDueAt: hoursAhead(  1), resolvedAt: null,         createdAt: daysAgo( 0), updatedAt: daysAgo(0) },
  { id: "t_003", accountId: "acc_celest",  subject: "Bulk import job stuck at 87% for 3 hours",                    status: "open",     priority: "high",   channel: "email", assigneeId: "ag_riley",  requesterEmail: "ops@celest.test",     slaDueAt: hoursAhead( 12), resolvedAt: null,         createdAt: daysAgo( 1), updatedAt: daysAgo(0) },
  { id: "t_004", accountId: "acc_dover",   subject: "How do I configure inbound webhooks with HMAC?",              status: "pending",  priority: "low",    channel: "web",   assigneeId: "ag_devon",  requesterEmail: "kev@dover.test",      slaDueAt: hoursAhead( 48), resolvedAt: null,         createdAt: daysAgo( 3), updatedAt: daysAgo(1) },
  { id: "t_005", accountId: "acc_evergrn", subject: "PHI data showing in audit log — need redaction",              status: "open",     priority: "urgent", channel: "email", assigneeId: "ag_jordan", requesterEmail: "compliance@ever.test",slaDueAt: hoursAhead(  2), resolvedAt: null,         createdAt: daysAgo( 1), updatedAt: daysAgo(0) },
  { id: "t_006", accountId: "acc_finch",   subject: "Trial expired but still being charged",                        status: "open",     priority: "medium", channel: "email", assigneeId: "ag_riley",  requesterEmail: "finance@finch.test",  slaDueAt: hoursAhead( 24), resolvedAt: null,         createdAt: daysAgo( 2), updatedAt: daysAgo(1) },
  { id: "t_007", accountId: "acc_gleam",   subject: "API rate limits hitting on bulk export",                       status: "new",      priority: "medium", channel: "slack", assigneeId: null,        requesterEmail: "alex@gleam.test",     slaDueAt: hoursAhead( 18), resolvedAt: null,         createdAt: daysAgo( 0), updatedAt: daysAgo(0) },
  { id: "t_008", accountId: "acc_helix",   subject: "Custom report shows wrong totals after Q3 schema change",      status: "open",     priority: "high",   channel: "email", assigneeId: "ag_devon",  requesterEmail: "data@helix.test",     slaDueAt: hoursAhead(  8), resolvedAt: null,         createdAt: daysAgo( 1), updatedAt: daysAgo(0) },
  { id: "t_009", accountId: "acc_iron",    subject: "Onboarding question: how to invite team members",              status: "resolved", priority: "low",    channel: "web",   assigneeId: "ag_riley",  requesterEmail: "kim@iron.test",       slaDueAt: hoursAhead( -2), resolvedAt: daysAgo( 1), createdAt: daysAgo( 2), updatedAt: daysAgo(1) },
  { id: "t_010", accountId: "acc_juniper", subject: "Custom domain SSL certificate not auto-renewing",              status: "open",     priority: "medium", channel: "slack", assigneeId: "ag_jordan", requesterEmail: "ops@juniper.test",    slaDueAt: hoursAhead( 16), resolvedAt: null,         createdAt: daysAgo( 1), updatedAt: daysAgo(0) },
  { id: "t_011", accountId: "acc_acme",    subject: "Workspace search returning stale results",                     status: "pending",  priority: "low",    channel: "web",   assigneeId: "ag_devon",  requesterEmail: "lee@acme.test",       slaDueAt: hoursAhead( 36), resolvedAt: null,         createdAt: daysAgo( 4), updatedAt: daysAgo(2) },
  { id: "t_012", accountId: "acc_brio",    subject: "Slack app permissions reset — channels can't post",            status: "open",     priority: "high",   channel: "slack", assigneeId: "ag_riley",  requesterEmail: "team@brio.test",      slaDueAt: hoursAhead(  6), resolvedAt: null,         createdAt: daysAgo( 1), updatedAt: daysAgo(0) },
  { id: "t_013", accountId: "acc_celest",  subject: "Need to bulk-tag 1200 records with a category",                status: "new",      priority: "low",    channel: "email", assigneeId: null,        requesterEmail: "ops@celest.test",     slaDueAt: hoursAhead( 72), resolvedAt: null,         createdAt: daysAgo( 0), updatedAt: daysAgo(0) },
  { id: "t_014", accountId: "acc_dover",   subject: "Billing invoice has wrong VAT rate for EU entity",             status: "open",     priority: "medium", channel: "email", assigneeId: "ag_devon",  requesterEmail: "finance@dover.test",  slaDueAt: hoursAhead( 24), resolvedAt: null,         createdAt: daysAgo( 2), updatedAt: daysAgo(1) },
  { id: "t_015", accountId: "acc_evergrn", subject: "User suspended but still receiving notifications",             status: "resolved", priority: "medium", channel: "web",   assigneeId: "ag_riley",  requesterEmail: "it@evergrn.test",     slaDueAt: hoursAhead( -8), resolvedAt: daysAgo( 0), createdAt: daysAgo( 3), updatedAt: daysAgo(0) },
  { id: "t_016", accountId: "acc_finch",   subject: "Mobile app crashes on iOS 18 when opening reports",            status: "open",     priority: "high",   channel: "email", assigneeId: "ag_jordan", requesterEmail: "kim@finch.test",      slaDueAt: hoursAhead(  6), resolvedAt: null,         createdAt: daysAgo( 1), updatedAt: daysAgo(0) },
  { id: "t_017", accountId: "acc_gleam",   subject: "Can we get a custom retention policy for an account?",         status: "pending",  priority: "low",    channel: "slack", assigneeId: "ag_devon",  requesterEmail: "alex@gleam.test",     slaDueAt: hoursAhead( 96), resolvedAt: null,         createdAt: daysAgo( 5), updatedAt: daysAgo(2) },
  { id: "t_018", accountId: "acc_helix",   subject: "OAuth token refresh failing intermittently",                   status: "open",     priority: "high",   channel: "slack", assigneeId: "ag_jordan", requesterEmail: "eng@helix.test",      slaDueAt: hoursAhead( 10), resolvedAt: null,         createdAt: daysAgo( 1), updatedAt: daysAgo(0) },
  { id: "t_019", accountId: "acc_iron",    subject: "Export contains rows from another tenant — security",          status: "open",     priority: "urgent", channel: "email", assigneeId: "ag_jordan", requesterEmail: "kim@iron.test",       slaDueAt: hoursAhead(  1), resolvedAt: null,         createdAt: daysAgo( 0), updatedAt: daysAgo(0) },
  { id: "t_020", accountId: "acc_juniper", subject: "How to set up SSO with Okta?",                                  status: "closed",   priority: "low",    channel: "web",   assigneeId: "ag_riley",  requesterEmail: "ops@juniper.test",    slaDueAt: hoursAhead(-72), resolvedAt: daysAgo( 7), createdAt: daysAgo(10), updatedAt: daysAgo(7) },
  { id: "t_021", accountId: "acc_acme",    subject: "Search API returning 504 under load",                          status: "new",      priority: "urgent", channel: "slack", assigneeId: null,        requesterEmail: "ops@acme.test",       slaDueAt: hoursAhead(  2), resolvedAt: null,         createdAt: daysAgo( 0), updatedAt: daysAgo(0) },
  { id: "t_022", accountId: "acc_brio",    subject: "Onboarding email link expired before user clicked",            status: "resolved", priority: "low",    channel: "email", assigneeId: "ag_devon",  requesterEmail: "team@brio.test",      slaDueAt: hoursAhead( -1), resolvedAt: daysAgo( 0), createdAt: daysAgo( 2), updatedAt: daysAgo(0) },
  { id: "t_023", accountId: "acc_celest",  subject: "Zapier integration disconnected itself overnight",             status: "open",     priority: "medium", channel: "email", assigneeId: "ag_riley",  requesterEmail: "ops@celest.test",     slaDueAt: hoursAhead( 14), resolvedAt: null,         createdAt: daysAgo( 1), updatedAt: daysAgo(0) },
  { id: "t_024", accountId: "acc_dover",   subject: "Bug: timezone showing UTC for non-UTC users",                   status: "open",     priority: "low",    channel: "web",   assigneeId: "ag_devon",  requesterEmail: "kev@dover.test",      slaDueAt: hoursAhead( 32), resolvedAt: null,         createdAt: daysAgo( 2), updatedAt: daysAgo(1) },
  { id: "t_025", accountId: "acc_evergrn", subject: "SOC2 report request — need latest copy",                       status: "pending",  priority: "low",    channel: "email", assigneeId: "ag_riley",  requesterEmail: "trust@ever.test",     slaDueAt: hoursAhead( 60), resolvedAt: null,         createdAt: daysAgo( 4), updatedAt: daysAgo(2) },
];

// One conversation per ticket; messages run 3-5 each.
const conversations: Conversation[] = tickets.map((t) => ({
  id: `c_${t.id.slice(2)}`,
  ticketId: t.id,
  channel: t.channel,
  status: t.status,
}));

// Generate messages: alternating between requester and assigned agent.
const messages: Message[] = [];
for (const c of conversations) {
  const ticket = tickets.find((t) => t.id === c.ticketId);
  if (!ticket) continue;
  const requester = { name: ticket.requesterEmail.split("@")[0] ?? "user", channel: c.channel };
  const agent = ticket.assigneeId
    ? agents.find((a) => a.id === ticket.assigneeId)
    : undefined;
  const baseAt = ticket.createdAt;
  const messageCount = 3 + (parseInt(c.id.slice(-1), 16) % 3); // 3-5
  for (let i = 0; i < messageCount; i++) {
    const fromAgent = i % 2 === 1 && agent !== undefined;
    messages.push({
      id: `m_${c.id.slice(2)}_${i}`,
      conversationId: c.id,
      body: fromAgent
        ? `Looking into this now. Will follow up shortly with more details on ${ticket.subject.toLowerCase()}.`
        : `Hey team — ${ticket.subject.toLowerCase()}. Any update?`,
      fromAgent,
      fromName: fromAgent && agent ? agent.name : (requester.name ?? "user"),
      channel: c.channel,
      createdAt: new Date(new Date(baseAt).getTime() + i * 1800_000).toISOString(),
    });
  }
}

const macros: Macro[] = [
  { id: "mac_thanks",        title: "Thanks for reaching out",         body: "Thanks for reaching out. We'll get back to you shortly.",                                          category: "general" },
  { id: "mac_resolved",      title: "Marking as resolved",             body: "Marking this resolved. Reply to reopen if anything else comes up.",                              category: "general" },
  { id: "mac_oncall",        title: "Escalating to on-call",           body: "I'm escalating this to our on-call engineer. You'll hear back within 30 minutes.",              category: "escalation" },
  { id: "mac_status_check",  title: "Status check",                    body: "Just checking in — is this still happening or did it resolve on its own?",                       category: "followup" },
  { id: "mac_billing_route", title: "Routing billing question",        body: "I'm routing this to our billing team — they'll respond within one business day.",               category: "routing" },
  { id: "mac_security_ack",  title: "Security incident acknowledgement", body: "Acknowledged. Treating this as a security incident. Engineering is involved and timeline TBD.", category: "security" },
  { id: "mac_doc_link",      title: "Pointing to docs",                body: "We have a runbook for this here: https://docs.beam.test/runbooks. Try that first and reply if it doesn't help.", category: "general" },
  { id: "mac_close_silent",  title: "Closing silent ticket",           body: "We haven't heard back in a while, so I'm closing this. Reply to reopen if you still need help.",  category: "followup" },
];

const auditLog: AuditEntry[] = [];

// Helpers ---------------------------------------------------------------

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function findOrThrow<T extends { id: string }>(coll: T[], id: string, kind: string): T {
  const found = coll.find((x) => x.id === id);
  if (!found) throw new Error(`${kind} not found: ${id}`);
  return found;
}

// Public accessor surface. Adapters/workflows import `db` from this file
// and call its methods. The shape (named tables, CRUD-ish methods) lets us
// swap the implementation later without changing the consumers.

export const db = {
  accounts: {
    list: (params: { search?: string; page?: number; pageSize?: number } = {}) => {
      const { search, page = 1, pageSize = 50 } = params;
      let rows = clone(accounts);
      if (search) {
        const s = search.toLowerCase();
        rows = rows.filter((a) => a.name.toLowerCase().includes(s));
      }
      const start = (page - 1) * pageSize;
      return { rows: rows.slice(start, start + pageSize), total: rows.length, page, pageSize };
    },
    byId: (id: string) => clone(accounts.find((a) => a.id === id) ?? null),
    nameById: (id: string) => accounts.find((a) => a.id === id)?.name ?? id,
  },
  agents: {
    list: (params: { activeOnly?: boolean } = {}) => {
      const { activeOnly = false } = params;
      const rows = clone(agents).filter((a) => (activeOnly ? a.isActive : true));
      return rows;
    },
    byId: (id: string) => clone(agents.find((a) => a.id === id) ?? null),
  },
  macros: {
    list: (params: { category?: string } = {}) => {
      const { category } = params;
      const rows = clone(macros).filter((m) => (category ? m.category === category : true));
      return rows;
    },
  },
  tickets: {
    list: (params: {
      status?: TicketStatus;
      priority?: TicketPriority;
      channel?: TicketChannel;
      assigneeId?: string;
      accountId?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    } = {}) => {
      const { status, priority, channel, assigneeId, accountId, search, page = 1, pageSize = 50 } = params;
      let rows = clone(tickets);
      if (status) rows = rows.filter((t) => t.status === status);
      if (priority) rows = rows.filter((t) => t.priority === priority);
      if (channel) rows = rows.filter((t) => t.channel === channel);
      if (assigneeId) rows = rows.filter((t) => t.assigneeId === assigneeId);
      if (accountId) rows = rows.filter((t) => t.accountId === accountId);
      if (search) {
        const s = search.toLowerCase();
        rows = rows.filter((t) => t.subject.toLowerCase().includes(s));
      }
      // Sort: open/new first, then by priority (urgent>high>medium>low), then by createdAt desc.
      const statusRank: Record<TicketStatus, number> = { new: 0, open: 1, pending: 2, resolved: 3, closed: 4 };
      const priorityRank: Record<TicketPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      rows.sort((a, b) => {
        const sd = statusRank[a.status] - statusRank[b.status];
        if (sd !== 0) return sd;
        const pd = priorityRank[a.priority] - priorityRank[b.priority];
        if (pd !== 0) return pd;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      const enriched = rows.map((t) => ({
        ...t,
        accountName: db.accounts.nameById(t.accountId),
      }));
      const start = (page - 1) * pageSize;
      return { rows: enriched.slice(start, start + pageSize), total: enriched.length, page, pageSize };
    },
    byId: (id: string) => {
      const t = clone(tickets.find((x) => x.id === id) ?? null);
      if (!t) return null;
      return { ...t, accountName: db.accounts.nameById(t.accountId) };
    },
    metrics: () => {
      const open = tickets.filter((t) => t.status === "open" || t.status === "new").length;
      const todayCutoff = Date.now() - 24 * 3600_000;
      const newToday = tickets.filter((t) => new Date(t.createdAt).getTime() >= todayCutoff).length;
      const slaAtRisk = tickets.filter(
        (t) => t.status !== "resolved" && t.status !== "closed" && new Date(t.slaDueAt).getTime() <= Date.now() + 4 * 3600_000,
      ).length;
      const resolved = tickets.filter((t) => t.resolvedAt !== null);
      const avgResolutionHours =
        resolved.length === 0
          ? 0
          : resolved.reduce((acc, t) => {
              const created = new Date(t.createdAt).getTime();
              const done = new Date(t.resolvedAt as string).getTime();
              return acc + (done - created) / 3600_000;
            }, 0) / resolved.length;
      const byChannel: Record<TicketChannel, number> = { email: 0, slack: 0, web: 0 };
      for (const t of tickets) byChannel[t.channel]++;
      return {
        openCount: open,
        newToday,
        slaAtRisk,
        avgResolutionHours: Math.round(avgResolutionHours * 10) / 10,
        byChannel,
      };
    },
    setAssignee: (ticketId: string, agentId: string) => {
      const t = findOrThrow(tickets, ticketId, "ticket");
      t.assigneeId = agentId;
      t.updatedAt = now();
      return clone(t);
    },
    setStatus: (ticketId: string, status: TicketStatus) => {
      const t = findOrThrow(tickets, ticketId, "ticket");
      t.status = status;
      t.updatedAt = now();
      if (status === "resolved" || status === "closed") t.resolvedAt = now();
      else if (t.resolvedAt && (status === "open" || status === "new")) t.resolvedAt = null;
      return clone(t);
    },
    setPriority: (ticketId: string, priority: TicketPriority) => {
      const t = findOrThrow(tickets, ticketId, "ticket");
      t.priority = priority;
      t.updatedAt = now();
      return clone(t);
    },
    countOpenByAssignee: () => {
      const counts: Record<string, number> = {};
      for (const t of tickets) {
        if (t.status === "resolved" || t.status === "closed") continue;
        if (!t.assigneeId) continue;
        counts[t.assigneeId] = (counts[t.assigneeId] ?? 0) + 1;
      }
      return counts;
    },
  },
  conversations: {
    byTicket: (ticketId: string) => {
      const conv = conversations.find((c) => c.ticketId === ticketId);
      if (!conv) return null;
      const msgs = clone(messages.filter((m) => m.conversationId === conv.id));
      msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      return { ...clone(conv), messages: msgs };
    },
    /**
     * Append a message to a ticket's conversation.
     *
     * The caller (the workflow) is responsible for resolving the sender's
     * display name and `fromAgent` flag — usually by looking up the
     * authenticated userId in `db.agents`. This keeps the data layer
     * dumb: it accepts whatever sender the caller hands it, doesn't
     * throw on unknown identifiers, and stays decoupled from auth.
     */
    addMessage: (
      ticketId: string,
      params: { body: string; channel?: TicketChannel; fromName: string; fromAgent: boolean },
    ) => {
      const conv = conversations.find((c) => c.ticketId === ticketId);
      if (!conv) throw new Error(`conversation for ticket ${ticketId} not found`);
      const m: Message = {
        id: `m_${conv.id.slice(2)}_${messages.filter((x) => x.conversationId === conv.id).length}`,
        conversationId: conv.id,
        body: params.body,
        fromAgent: params.fromAgent,
        fromName: params.fromName,
        channel: params.channel ?? conv.channel,
        createdAt: now(),
      };
      messages.push(m);
      const t = tickets.find((x) => x.id === ticketId);
      if (t) {
        t.updatedAt = now();
        if (t.status === "new") t.status = "open";
      }
      return clone(m);
    },
    recentMessages: (limit = 20) => {
      const sorted = clone(messages).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      return sorted.slice(0, limit);
    },
  },
  audit: {
    log: (entry: Omit<AuditEntry, "id" | "at">) => {
      const e: AuditEntry = {
        ...entry,
        id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        at: now(),
      };
      auditLog.push(e);
      return clone(e);
    },
    list: () => clone(auditLog),
  },
};
