// In-memory CRM data layer. Replace before deploying — see the README.
//
// The shape (`db.leads.list`, `db.deals.byId`, etc.) is the contract that
// adapters and workflows depend on. Keep it stable when swapping the backend
// and the rest of the registry will not need to change.

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "unqualified"
  | "converted";

export type DealStage =
  | "discovery"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "closed-won"
  | "closed-lost";

export type ActivityType = "call" | "email" | "meeting" | "note" | "task";

export type Lead = {
  id: string;
  name: string;
  company: string;
  email: string;
  source: string;
  status: LeadStatus;
  createdAt: string;
};

export type Deal = {
  id: string;
  name: string;
  leadId: string | null;
  stage: DealStage;
  value: number;
  ownerId: string | null;
  closeDate: string;
  createdAt: string;
};

export type Contact = {
  id: string;
  name: string;
  email: string;
  company: string;
  dealId: string | null;
  role: string;
  createdAt: string;
};

export type Activity = {
  id: string;
  type: ActivityType;
  dealId: string | null;
  contactId: string | null;
  summary: string;
  at: string;
};

export type Rep = {
  id: string;
  name: string;
  email: string;
};

const reps: Rep[] = [
  { id: "rep_amelia",  name: "Amelia Chen",     email: "amelia@acme-sales.com"  },
  { id: "rep_marcus",  name: "Marcus Webb",     email: "marcus@acme-sales.com"  },
  { id: "rep_priya",   name: "Priya Natarajan", email: "priya@acme-sales.com"   },
  { id: "rep_diego",   name: "Diego Alvarez",   email: "diego@acme-sales.com"   },
];

const leads: Lead[] = [
  { id: "lead_001", name: "Sarah Patel",     company: "Northwind Logistics",   email: "sarah@northwind.io",      source: "inbound-form",   status: "qualified",   createdAt: "2026-03-02T14:21:00Z" },
  { id: "lead_002", name: "Tom Bailey",      company: "Helix Biotech",         email: "tbailey@helixbio.com",    source: "outbound",       status: "contacted",   createdAt: "2026-03-05T10:02:00Z" },
  { id: "lead_003", name: "Lina Park",       company: "Glacier Capital",       email: "lina.park@glaciercap.co", source: "referral",       status: "new",         createdAt: "2026-03-11T16:48:00Z" },
  { id: "lead_004", name: "Jordan Reeves",   company: "Brightline Robotics",   email: "jordan@brightline.ai",    source: "event-booth",    status: "qualified",   createdAt: "2026-03-14T09:33:00Z" },
  { id: "lead_005", name: "Emi Tanaka",      company: "Kettle & Forge",        email: "emi@kettleforge.com",     source: "linkedin",       status: "converted",   createdAt: "2026-03-18T11:10:00Z" },
  { id: "lead_006", name: "Ravi Krishnan",   company: "Anchor Health",         email: "ravi@anchorhealth.org",   source: "inbound-form",   status: "contacted",   createdAt: "2026-03-22T13:55:00Z" },
  { id: "lead_007", name: "Mara Solis",      company: "Cobblestone Realty",    email: "mara@cobblestone.co",     source: "outbound",       status: "unqualified", createdAt: "2026-03-27T08:42:00Z" },
  { id: "lead_008", name: "Henrik Olsson",   company: "Polaris Freight",       email: "henrik@polarisfreight.eu", source: "referral",      status: "new",         createdAt: "2026-04-04T15:18:00Z" },
];

const deals: Deal[] = [
  { id: "deal_001", name: "Northwind — annual platform",   leadId: "lead_001", stage: "qualified",   value:  48000, ownerId: "rep_amelia", closeDate: "2026-06-30", createdAt: "2026-03-04T17:00:00Z" },
  { id: "deal_002", name: "Helix Biotech — pilot",         leadId: "lead_002", stage: "discovery",   value:  18000, ownerId: "rep_marcus", closeDate: "2026-07-15", createdAt: "2026-03-07T12:00:00Z" },
  { id: "deal_003", name: "Brightline Robotics — rollout", leadId: "lead_004", stage: "proposal",    value: 124000, ownerId: "rep_priya",  closeDate: "2026-05-22", createdAt: "2026-03-16T09:00:00Z" },
  { id: "deal_004", name: "Kettle & Forge — expansion",    leadId: "lead_005", stage: "negotiation", value:  32500, ownerId: "rep_amelia", closeDate: "2026-05-08", createdAt: "2026-03-20T14:00:00Z" },
  { id: "deal_005", name: "Anchor Health — pilot",         leadId: "lead_006", stage: "discovery",   value:  22000, ownerId: "rep_diego",  closeDate: "2026-08-01", createdAt: "2026-03-25T10:30:00Z" },
  { id: "deal_006", name: "Glacier Capital — data feed",   leadId: "lead_003", stage: "proposal",    value:  64000, ownerId: "rep_priya",  closeDate: "2026-06-12", createdAt: "2026-03-29T11:45:00Z" },
];

const contacts: Contact[] = [
  { id: "ct_001", name: "Sarah Patel",      email: "sarah@northwind.io",         company: "Northwind Logistics",   dealId: "deal_001", role: "VP Operations",       createdAt: "2026-03-04T17:05:00Z" },
  { id: "ct_002", name: "Daniel Wong",      email: "dwong@northwind.io",         company: "Northwind Logistics",   dealId: "deal_001", role: "Director of IT",      createdAt: "2026-03-09T15:30:00Z" },
  { id: "ct_003", name: "Tom Bailey",       email: "tbailey@helixbio.com",       company: "Helix Biotech",         dealId: "deal_002", role: "Head of Research",    createdAt: "2026-03-07T12:05:00Z" },
  { id: "ct_004", name: "Jordan Reeves",    email: "jordan@brightline.ai",       company: "Brightline Robotics",   dealId: "deal_003", role: "CTO",                 createdAt: "2026-03-16T09:05:00Z" },
  { id: "ct_005", name: "Vivian Cho",       email: "vivian.cho@brightline.ai",   company: "Brightline Robotics",   dealId: "deal_003", role: "Procurement Lead",    createdAt: "2026-03-19T13:42:00Z" },
  { id: "ct_006", name: "Marcus Liu",       email: "marcus@brightline.ai",       company: "Brightline Robotics",   dealId: "deal_003", role: "VP Engineering",      createdAt: "2026-03-21T10:15:00Z" },
  { id: "ct_007", name: "Emi Tanaka",       email: "emi@kettleforge.com",        company: "Kettle & Forge",        dealId: "deal_004", role: "COO",                 createdAt: "2026-03-20T14:05:00Z" },
  { id: "ct_008", name: "Avery Stone",      email: "avery@kettleforge.com",      company: "Kettle & Forge",        dealId: "deal_004", role: "Finance Manager",     createdAt: "2026-03-24T11:00:00Z" },
  { id: "ct_009", name: "Ravi Krishnan",    email: "ravi@anchorhealth.org",      company: "Anchor Health",         dealId: "deal_005", role: "Director of Tech",    createdAt: "2026-03-25T10:35:00Z" },
  { id: "ct_010", name: "Naomi Bell",       email: "nbell@anchorhealth.org",     company: "Anchor Health",         dealId: "deal_005", role: "Compliance Officer",  createdAt: "2026-03-28T16:08:00Z" },
  { id: "ct_011", name: "Lina Park",        email: "lina.park@glaciercap.co",    company: "Glacier Capital",       dealId: "deal_006", role: "Head of Data",        createdAt: "2026-03-29T11:50:00Z" },
  { id: "ct_012", name: "Owen Hartley",     email: "owen@glaciercap.co",         company: "Glacier Capital",       dealId: "deal_006", role: "Quant Researcher",    createdAt: "2026-04-02T09:20:00Z" },
];

const activities: Activity[] = [
  { id: "act_001", type: "call",    dealId: "deal_001", contactId: "ct_001", summary: "Intro call with VP Ops; sized fleet at 240 trucks.",         at: "2026-03-04T17:30:00Z" },
  { id: "act_002", type: "email",   dealId: "deal_001", contactId: "ct_002", summary: "Sent SOC2 packet and security questionnaire.",                at: "2026-03-09T16:00:00Z" },
  { id: "act_003", type: "meeting", dealId: "deal_001", contactId: "ct_001", summary: "Discovery — current dispatch pain points and KPIs.",         at: "2026-03-15T19:00:00Z" },
  { id: "act_004", type: "call",    dealId: "deal_002", contactId: "ct_003", summary: "Pilot scope: single lab, 4 instruments, 60-day window.",     at: "2026-03-08T15:45:00Z" },
  { id: "act_005", type: "note",    dealId: "deal_002", contactId: null,     summary: "Champion identified internal blocker (legal review).",       at: "2026-03-12T18:10:00Z" },
  { id: "act_006", type: "meeting", dealId: "deal_003", contactId: "ct_004", summary: "Technical deep-dive with CTO; reviewed integration plan.",   at: "2026-03-17T20:00:00Z" },
  { id: "act_007", type: "email",   dealId: "deal_003", contactId: "ct_005", summary: "Procurement walkthrough — vendor onboarding form sent.",     at: "2026-03-21T14:25:00Z" },
  { id: "act_008", type: "task",    dealId: "deal_003", contactId: null,     summary: "Draft proposal v1 — owner Priya, due Apr 4.",                at: "2026-03-23T13:00:00Z" },
  { id: "act_009", type: "meeting", dealId: "deal_003", contactId: "ct_006", summary: "Proposal review with VP Eng; pricing pushback on tier 2.",   at: "2026-04-08T18:30:00Z" },
  { id: "act_010", type: "call",    dealId: "deal_004", contactId: "ct_007", summary: "Renewal conversation — expansion to 3 facilities.",          at: "2026-03-21T16:15:00Z" },
  { id: "act_011", type: "email",   dealId: "deal_004", contactId: "ct_008", summary: "Sent revised quote; net-45 terms acceptable.",               at: "2026-03-26T13:50:00Z" },
  { id: "act_012", type: "meeting", dealId: "deal_004", contactId: "ct_007", summary: "Negotiation: agreed on a 12% multi-year discount.",         at: "2026-04-12T17:00:00Z" },
  { id: "act_013", type: "call",    dealId: "deal_005", contactId: "ct_009", summary: "Kickoff call; identified HIPAA review as gating step.",     at: "2026-03-26T14:00:00Z" },
  { id: "act_014", type: "note",    dealId: "deal_005", contactId: "ct_010", summary: "Compliance sent BAA template — awaiting redline.",          at: "2026-03-30T19:45:00Z" },
  { id: "act_015", type: "meeting", dealId: "deal_006", contactId: "ct_011", summary: "Data feed scoping — daily snapshots vs. streaming.",        at: "2026-04-01T15:30:00Z" },
  { id: "act_016", type: "email",   dealId: "deal_006", contactId: "ct_012", summary: "Sent sample dataset and schema doc.",                       at: "2026-04-05T12:10:00Z" },
  { id: "act_017", type: "task",    dealId: "deal_006", contactId: null,     summary: "Follow up on procurement timeline by EOW.",                 at: "2026-04-15T09:00:00Z" },
  { id: "act_018", type: "call",    dealId: "deal_002", contactId: "ct_003", summary: "Legal cleared pilot; ready to schedule kickoff.",           at: "2026-04-18T15:20:00Z" },
  { id: "act_019", type: "meeting", dealId: "deal_005", contactId: "ct_009", summary: "Re-engaged after BAA redline; targeting May start.",        at: "2026-04-22T17:45:00Z" },
  { id: "act_020", type: "note",    dealId: "deal_001", contactId: null,     summary: "Champion mentioned competitor proposal at lower price.",    at: "2026-04-26T11:30:00Z" },
];

let seq = {
  deal: deals.length,
  activity: activities.length,
};

function nextId(prefix: "deal" | "act"): string {
  if (prefix === "deal") {
    seq.deal += 1;
    return `deal_${String(seq.deal).padStart(3, "0")}`;
  }
  seq.activity += 1;
  return `act_${String(seq.activity).padStart(3, "0")}`;
}

export const db = {
  leads: {
    list(filter: { status?: LeadStatus; limit?: number; offset?: number } = {}): Lead[] {
      const filtered = leads.filter(
        (l) => filter.status === undefined || l.status === filter.status,
      );
      const offset = filter.offset ?? 0;
      const limit = filter.limit ?? filtered.length;
      return filtered.slice(offset, offset + limit);
    },
    byId(id: string): Lead | null {
      return leads.find((l) => l.id === id) ?? null;
    },
    setStatus(id: string, status: LeadStatus): Lead {
      const l = leads.find((lead) => lead.id === id);
      if (!l) throw new Error(`lead ${id} not found`);
      l.status = status;
      return l;
    },
  },

  deals: {
    list(filter: { stage?: DealStage; ownerId?: string } = {}): Deal[] {
      return deals.filter(
        (d) =>
          (filter.stage === undefined || d.stage === filter.stage) &&
          (filter.ownerId === undefined || d.ownerId === filter.ownerId),
      );
    },
    byId(id: string): Deal | null {
      return deals.find((d) => d.id === id) ?? null;
    },
    create(input: {
      name: string;
      leadId: string | null;
      stage: DealStage;
      value: number;
      ownerId: string | null;
      closeDate: string;
    }): Deal {
      const deal: Deal = {
        id: nextId("deal"),
        name: input.name,
        leadId: input.leadId,
        stage: input.stage,
        value: input.value,
        ownerId: input.ownerId,
        closeDate: input.closeDate,
        createdAt: new Date().toISOString(),
      };
      deals.push(deal);
      return deal;
    },
    setStage(id: string, stage: DealStage): Deal {
      const d = deals.find((deal) => deal.id === id);
      if (!d) throw new Error(`deal ${id} not found`);
      d.stage = stage;
      return d;
    },
    setOwner(id: string, ownerId: string): Deal {
      const d = deals.find((deal) => deal.id === id);
      if (!d) throw new Error(`deal ${id} not found`);
      d.ownerId = ownerId;
      return d;
    },
  },

  contacts: {
    list(filter: { dealId?: string } = {}): Contact[] {
      return contacts.filter(
        (c) => filter.dealId === undefined || c.dealId === filter.dealId,
      );
    },
    byId(id: string): Contact | null {
      return contacts.find((c) => c.id === id) ?? null;
    },
  },

  activities: {
    list(filter: { dealId?: string } = {}): Activity[] {
      const filtered = activities.filter(
        (a) => filter.dealId === undefined || a.dealId === filter.dealId,
      );
      return [...filtered].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
    },
    create(input: {
      type: ActivityType;
      dealId: string | null;
      contactId: string | null;
      summary: string;
    }): Activity {
      const activity: Activity = {
        id: nextId("act"),
        type: input.type,
        dealId: input.dealId,
        contactId: input.contactId,
        summary: input.summary,
        at: new Date().toISOString(),
      };
      activities.push(activity);
      return activity;
    },
  },

  reps: {
    list(): Rep[] {
      return [...reps];
    },
    byId(id: string): Rep | null {
      return reps.find((r) => r.id === id) ?? null;
    },
  },
};
