// In-memory data layer. Replace before deploying — see the README.
//
// Adapters and workflows depend on the accessor shape below
// (`db.eventTypes.list`, `db.bookings.create`, …). Keep that shape stable
// when swapping in a real backend so the rest of the registry doesn't
// need to change.

export type Host = {
  id: string;
  name: string;
  email: string;
  timezone: string;
  avatarUrl: string;
};

export type EventTypeColor =
  | "emerald"
  | "blue"
  | "purple"
  | "amber"
  | "rose"
  | "indigo";

export type EventType = {
  id: string;
  name: string;
  durationMinutes: number;
  hostId: string;
  color: EventTypeColor;
  description: string;
  requiresPayment: boolean;
  price: number;
  enabled: boolean;
  createdAt: string;
};

export type BookingStatus = "confirmed" | "cancelled" | "completed";

export type Booking = {
  id: string;
  eventTypeId: string;
  attendeeName: string;
  attendeeEmail: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  notes: string;
  cancelReason: string | null;
  createdAt: string;
};

export type AvailabilitySlot = {
  id: string;
  hostId: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalBookings: number;
  lastBookingAt: string | null;
};

const hosts: Host[] = [
  {
    id: "h_amelia",
    name: "Amelia Chen",
    email: "amelia@booklet.com",
    timezone: "America/Los_Angeles",
    avatarUrl: "https://i.pravatar.cc/96?u=amelia",
  },
  {
    id: "h_marcus",
    name: "Marcus Johnson",
    email: "marcus@booklet.com",
    timezone: "America/New_York",
    avatarUrl: "https://i.pravatar.cc/96?u=marcus",
  },
  {
    id: "h_priya",
    name: "Priya Patel",
    email: "priya@booklet.com",
    timezone: "Europe/London",
    avatarUrl: "https://i.pravatar.cc/96?u=priya",
  },
];

const eventTypes: EventType[] = [
  {
    id: "et_intro",
    name: "30-min intro call",
    durationMinutes: 30,
    hostId: "h_amelia",
    color: "blue",
    description: "Quick intro to see if we're a fit. Bring questions.",
    requiresPayment: false,
    price: 0,
    enabled: true,
    createdAt: "2026-01-08T15:00:00Z",
  },
  {
    id: "et_strategy",
    name: "60-min strategy session",
    durationMinutes: 60,
    hostId: "h_marcus",
    color: "purple",
    description: "Deep-dive working session on a specific problem.",
    requiresPayment: true,
    price: 250,
    enabled: true,
    createdAt: "2026-01-08T15:05:00Z",
  },
  {
    id: "et_coffee",
    name: "Coffee chat",
    durationMinutes: 15,
    hostId: "h_priya",
    color: "amber",
    description: "Casual 15-minute chat over coffee — no agenda.",
    requiresPayment: false,
    price: 0,
    enabled: true,
    createdAt: "2026-01-09T09:00:00Z",
  },
  {
    id: "et_onboarding",
    name: "Onboarding call",
    durationMinutes: 45,
    hostId: "h_amelia",
    color: "emerald",
    description: "Walk through setup with a new customer.",
    requiresPayment: false,
    price: 0,
    enabled: true,
    createdAt: "2026-01-12T11:30:00Z",
  },
  {
    id: "et_quarterly",
    name: "Quarterly review",
    durationMinutes: 60,
    hostId: "h_marcus",
    color: "rose",
    description: "Quarterly business review with key accounts.",
    requiresPayment: false,
    price: 0,
    enabled: true,
    createdAt: "2026-01-14T13:00:00Z",
  },
  {
    id: "et_demo",
    name: "Demo",
    durationMinutes: 30,
    hostId: "h_priya",
    color: "indigo",
    description: "Live product walkthrough.",
    requiresPayment: false,
    price: 0,
    enabled: false,
    createdAt: "2026-01-20T10:00:00Z",
  },
];

const customers: Customer[] = [
  {
    id: "c_001",
    name: "Sofia Reyes",
    email: "sofia@northwind.test",
    phone: "+1-415-555-0117",
    totalBookings: 3,
    lastBookingAt: "2026-04-28T17:00:00Z",
  },
  {
    id: "c_002",
    name: "Liam O'Connor",
    email: "liam@contoso.test",
    phone: "+1-212-555-0142",
    totalBookings: 1,
    lastBookingAt: "2026-05-03T14:00:00Z",
  },
  {
    id: "c_003",
    name: "Yuki Tanaka",
    email: "yuki@globex.test",
    phone: "+1-650-555-0188",
    totalBookings: 4,
    lastBookingAt: "2026-05-12T18:30:00Z",
  },
  {
    id: "c_004",
    name: "Ahmed Hassan",
    email: "ahmed@initech.test",
    phone: "+44-20-7946-0991",
    totalBookings: 2,
    lastBookingAt: "2026-04-19T10:00:00Z",
  },
  {
    id: "c_005",
    name: "Elena Volkov",
    email: "elena@umbrella.test",
    phone: "+1-312-555-0124",
    totalBookings: 2,
    lastBookingAt: "2026-05-08T16:00:00Z",
  },
  {
    id: "c_006",
    name: "Dakota Williams",
    email: "dakota@hooli.test",
    phone: "+1-206-555-0163",
    totalBookings: 1,
    lastBookingAt: "2026-05-15T20:00:00Z",
  },
  {
    id: "c_007",
    name: "Rafael Costa",
    email: "rafael@piedpiper.test",
    phone: "+1-512-555-0107",
    totalBookings: 1,
    lastBookingAt: "2026-04-30T15:30:00Z",
  },
  {
    id: "c_008",
    name: "Mira Sundqvist",
    email: "mira@wayne.test",
    phone: "+46-8-555-0145",
    totalBookings: 3,
    lastBookingAt: "2026-05-21T09:00:00Z",
  },
  {
    id: "c_009",
    name: "Theo Nguyen",
    email: "theo@stark.test",
    phone: "+1-408-555-0196",
    totalBookings: 0,
    lastBookingAt: null,
  },
  {
    id: "c_010",
    name: "Beatriz Alvarez",
    email: "beatriz@acme.test",
    phone: "+34-91-555-0182",
    totalBookings: 2,
    lastBookingAt: "2026-05-06T13:00:00Z",
  },
  {
    id: "c_011",
    name: "Jonas Berg",
    email: "jonas@duff.test",
    phone: "+47-22-555-0119",
    totalBookings: 1,
    lastBookingAt: "2026-05-18T11:00:00Z",
  },
  {
    id: "c_012",
    name: "Asha Iyer",
    email: "asha@cyberdyne.test",
    phone: "+91-22-5550-0173",
    totalBookings: 0,
    lastBookingAt: null,
  },
];

// Bookings spread across 2026-05-01 through 2026-05-31. Mix of statuses:
// past dates → completed/cancelled, future dates → confirmed/cancelled.
const bookings: Booking[] = [
  {
    id: "bk_001",
    eventTypeId: "et_intro",
    attendeeName: "Sofia Reyes",
    attendeeEmail: "sofia@northwind.test",
    startTime: "2026-05-02T17:00:00Z",
    endTime: "2026-05-02T17:30:00Z",
    status: "completed",
    notes: "Wanted to discuss expansion plans for Q3.",
    cancelReason: null,
    createdAt: "2026-04-25T14:12:00Z",
  },
  {
    id: "bk_002",
    eventTypeId: "et_strategy",
    attendeeName: "Liam O'Connor",
    attendeeEmail: "liam@contoso.test",
    startTime: "2026-05-03T14:00:00Z",
    endTime: "2026-05-03T15:00:00Z",
    status: "completed",
    notes: "Pricing model review. Bring last quarter's data.",
    cancelReason: null,
    createdAt: "2026-04-22T09:30:00Z",
  },
  {
    id: "bk_003",
    eventTypeId: "et_coffee",
    attendeeName: "Yuki Tanaka",
    attendeeEmail: "yuki@globex.test",
    startTime: "2026-05-04T10:15:00Z",
    endTime: "2026-05-04T10:30:00Z",
    status: "completed",
    notes: "",
    cancelReason: null,
    createdAt: "2026-04-30T18:00:00Z",
  },
  {
    id: "bk_004",
    eventTypeId: "et_onboarding",
    attendeeName: "Elena Volkov",
    attendeeEmail: "elena@umbrella.test",
    startTime: "2026-05-06T16:00:00Z",
    endTime: "2026-05-06T16:45:00Z",
    status: "completed",
    notes: "Initial setup, two seats.",
    cancelReason: null,
    createdAt: "2026-04-29T12:00:00Z",
  },
  {
    id: "bk_005",
    eventTypeId: "et_intro",
    attendeeName: "Beatriz Alvarez",
    attendeeEmail: "beatriz@acme.test",
    startTime: "2026-05-06T13:00:00Z",
    endTime: "2026-05-06T13:30:00Z",
    status: "cancelled",
    notes: "Reschedule via email.",
    cancelReason: "Attendee had a conflict.",
    createdAt: "2026-04-26T11:00:00Z",
  },
  {
    id: "bk_006",
    eventTypeId: "et_quarterly",
    attendeeName: "Ahmed Hassan",
    attendeeEmail: "ahmed@initech.test",
    startTime: "2026-05-07T15:00:00Z",
    endTime: "2026-05-07T16:00:00Z",
    status: "completed",
    notes: "Q1 review. Account at risk — discuss renewal.",
    cancelReason: null,
    createdAt: "2026-04-15T10:00:00Z",
  },
  {
    id: "bk_007",
    eventTypeId: "et_strategy",
    attendeeName: "Yuki Tanaka",
    attendeeEmail: "yuki@globex.test",
    startTime: "2026-05-12T18:30:00Z",
    endTime: "2026-05-12T19:30:00Z",
    status: "confirmed",
    notes: "Follow-on session — pricing redesign deep dive.",
    cancelReason: null,
    createdAt: "2026-05-01T08:30:00Z",
  },
  {
    id: "bk_008",
    eventTypeId: "et_intro",
    attendeeName: "Dakota Williams",
    attendeeEmail: "dakota@hooli.test",
    startTime: "2026-05-15T20:00:00Z",
    endTime: "2026-05-15T20:30:00Z",
    status: "confirmed",
    notes: "Referred by Sofia at Northwind.",
    cancelReason: null,
    createdAt: "2026-05-01T17:45:00Z",
  },
  {
    id: "bk_009",
    eventTypeId: "et_demo",
    attendeeName: "Rafael Costa",
    attendeeEmail: "rafael@piedpiper.test",
    startTime: "2026-04-30T15:30:00Z",
    endTime: "2026-04-30T16:00:00Z",
    status: "completed",
    notes: "Demo of the analytics module.",
    cancelReason: null,
    createdAt: "2026-04-20T13:15:00Z",
  },
  {
    id: "bk_010",
    eventTypeId: "et_onboarding",
    attendeeName: "Mira Sundqvist",
    attendeeEmail: "mira@wayne.test",
    startTime: "2026-05-21T09:00:00Z",
    endTime: "2026-05-21T09:45:00Z",
    status: "confirmed",
    notes: "Migrating from a competitor; needs SSO walkthrough.",
    cancelReason: null,
    createdAt: "2026-05-01T19:20:00Z",
  },
  {
    id: "bk_011",
    eventTypeId: "et_coffee",
    attendeeName: "Jonas Berg",
    attendeeEmail: "jonas@duff.test",
    startTime: "2026-05-18T11:00:00Z",
    endTime: "2026-05-18T11:15:00Z",
    status: "confirmed",
    notes: "",
    cancelReason: null,
    createdAt: "2026-05-01T10:00:00Z",
  },
  {
    id: "bk_012",
    eventTypeId: "et_quarterly",
    attendeeName: "Sofia Reyes",
    attendeeEmail: "sofia@northwind.test",
    startTime: "2026-05-25T17:00:00Z",
    endTime: "2026-05-25T18:00:00Z",
    status: "confirmed",
    notes: "Q2 numbers; expansion discussion continued.",
    cancelReason: null,
    createdAt: "2026-04-28T16:00:00Z",
  },
  {
    id: "bk_013",
    eventTypeId: "et_strategy",
    attendeeName: "Mira Sundqvist",
    attendeeEmail: "mira@wayne.test",
    startTime: "2026-05-28T14:00:00Z",
    endTime: "2026-05-28T15:00:00Z",
    status: "confirmed",
    notes: "Architecture review.",
    cancelReason: null,
    createdAt: "2026-05-01T19:25:00Z",
  },
  {
    id: "bk_014",
    eventTypeId: "et_intro",
    attendeeName: "Elena Volkov",
    attendeeEmail: "elena@umbrella.test",
    startTime: "2026-05-29T16:30:00Z",
    endTime: "2026-05-29T17:00:00Z",
    status: "cancelled",
    notes: "",
    cancelReason: "No-show.",
    createdAt: "2026-05-01T11:00:00Z",
  },
  {
    id: "bk_015",
    eventTypeId: "et_onboarding",
    attendeeName: "Ahmed Hassan",
    attendeeEmail: "ahmed@initech.test",
    startTime: "2026-05-30T10:00:00Z",
    endTime: "2026-05-30T10:45:00Z",
    status: "confirmed",
    notes: "Second-team onboarding for the EMEA branch.",
    cancelReason: null,
    createdAt: "2026-04-29T15:30:00Z",
  },
];

// Mon–Fri working hours per host (minute since midnight in the host's tz).
// 540 = 9:00, 600 = 10:00, 720 = 12:00, 1020 = 17:00, 1080 = 18:00.
const availability: AvailabilitySlot[] = [
  // Amelia: Mon–Fri 9:00–17:00, blocks lunch implicitly via two slots
  { id: "av_001", hostId: "h_amelia", dayOfWeek: 1, startMinute: 540, endMinute: 720 },
  { id: "av_002", hostId: "h_amelia", dayOfWeek: 1, startMinute: 780, endMinute: 1020 },
  { id: "av_003", hostId: "h_amelia", dayOfWeek: 2, startMinute: 540, endMinute: 720 },
  { id: "av_004", hostId: "h_amelia", dayOfWeek: 2, startMinute: 780, endMinute: 1020 },
  { id: "av_005", hostId: "h_amelia", dayOfWeek: 3, startMinute: 540, endMinute: 720 },
  { id: "av_006", hostId: "h_amelia", dayOfWeek: 3, startMinute: 780, endMinute: 1020 },
  { id: "av_007", hostId: "h_amelia", dayOfWeek: 4, startMinute: 540, endMinute: 720 },
  { id: "av_008", hostId: "h_amelia", dayOfWeek: 4, startMinute: 780, endMinute: 1020 },
  { id: "av_009", hostId: "h_amelia", dayOfWeek: 5, startMinute: 540, endMinute: 780 },
  // Marcus: Mon–Thu 8:00–16:00, Fri short day 8:00–12:00
  { id: "av_010", hostId: "h_marcus", dayOfWeek: 1, startMinute: 480, endMinute: 960 },
  { id: "av_011", hostId: "h_marcus", dayOfWeek: 2, startMinute: 480, endMinute: 960 },
  { id: "av_012", hostId: "h_marcus", dayOfWeek: 3, startMinute: 480, endMinute: 960 },
  { id: "av_013", hostId: "h_marcus", dayOfWeek: 4, startMinute: 480, endMinute: 960 },
  { id: "av_014", hostId: "h_marcus", dayOfWeek: 5, startMinute: 480, endMinute: 720 },
  // Priya: Mon–Fri 10:00–18:00
  { id: "av_015", hostId: "h_priya", dayOfWeek: 1, startMinute: 600, endMinute: 1080 },
  { id: "av_016", hostId: "h_priya", dayOfWeek: 2, startMinute: 600, endMinute: 1080 },
  { id: "av_017", hostId: "h_priya", dayOfWeek: 3, startMinute: 600, endMinute: 1080 },
  { id: "av_018", hostId: "h_priya", dayOfWeek: 4, startMinute: 600, endMinute: 1080 },
  { id: "av_019", hostId: "h_priya", dayOfWeek: 5, startMinute: 600, endMinute: 1080 },
];

let bookingSeq = bookings.length;
let eventTypeSeq = eventTypes.length;

function nextId(prefix: string, seq: number): string {
  return `${prefix}_${String(seq).padStart(3, "0")}`;
}

export type DateRange = { from?: string; to?: string };

function inRange(iso: string, range?: DateRange): boolean {
  if (!range) return true;
  if (range.from && iso < range.from) return false;
  if (range.to && iso > range.to) return false;
  return true;
}

export const db = {
  hosts: {
    list(): Host[] {
      return [...hosts];
    },
    byId(id: string): Host | null {
      return hosts.find((h) => h.id === id) ?? null;
    },
  },
  eventTypes: {
    list(filter: { hostId?: string } = {}): EventType[] {
      return eventTypes.filter(
        (e) => filter.hostId === undefined || e.hostId === filter.hostId,
      );
    },
    byId(id: string): EventType | null {
      return eventTypes.find((e) => e.id === id) ?? null;
    },
    create(input: {
      name: string;
      durationMinutes: number;
      hostId: string;
      color: EventTypeColor;
      description: string;
      requiresPayment: boolean;
      price: number;
    }): EventType {
      eventTypeSeq += 1;
      const created: EventType = {
        id: nextId("et", eventTypeSeq),
        ...input,
        enabled: true,
        createdAt: new Date().toISOString(),
      };
      eventTypes.push(created);
      return created;
    },
    toggle(id: string): EventType {
      const e = eventTypes.find((it) => it.id === id);
      if (!e) throw new Error(`event type ${id} not found`);
      e.enabled = !e.enabled;
      return e;
    },
  },
  bookings: {
    list(
      filter: {
        eventTypeId?: string;
        status?: BookingStatus;
        dateRange?: DateRange;
      } = {},
    ): Booking[] {
      return bookings.filter(
        (b) =>
          (filter.eventTypeId === undefined || b.eventTypeId === filter.eventTypeId) &&
          (filter.status === undefined || b.status === filter.status) &&
          inRange(b.startTime, filter.dateRange),
      );
    },
    byId(id: string): Booking | null {
      return bookings.find((b) => b.id === id) ?? null;
    },
    upcoming(now: Date = new Date()): Booking[] {
      const horizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return bookings
        .filter(
          (b) =>
            b.status === "confirmed" &&
            new Date(b.startTime) >= now &&
            new Date(b.startTime) <= horizon,
        )
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    },
    create(input: {
      eventTypeId: string;
      attendeeName: string;
      attendeeEmail: string;
      startTime: string;
      notes?: string;
    }): Booking {
      const et = eventTypes.find((e) => e.id === input.eventTypeId);
      if (!et) throw new Error(`event type ${input.eventTypeId} not found`);
      const start = new Date(input.startTime);
      const end = new Date(start.getTime() + et.durationMinutes * 60_000);
      bookingSeq += 1;
      const created: Booking = {
        id: nextId("bk", bookingSeq),
        eventTypeId: input.eventTypeId,
        attendeeName: input.attendeeName,
        attendeeEmail: input.attendeeEmail,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        status: "confirmed",
        notes: input.notes ?? "",
        cancelReason: null,
        createdAt: new Date().toISOString(),
      };
      bookings.push(created);
      return created;
    },
    cancel(id: string, reason?: string): Booking {
      const b = bookings.find((it) => it.id === id);
      if (!b) throw new Error(`booking ${id} not found`);
      b.status = "cancelled";
      b.cancelReason = reason ?? null;
      return b;
    },
    reschedule(id: string, newStartTime: string): Booking {
      const b = bookings.find((it) => it.id === id);
      if (!b) throw new Error(`booking ${id} not found`);
      const et = eventTypes.find((e) => e.id === b.eventTypeId);
      if (!et) throw new Error(`event type ${b.eventTypeId} not found`);
      const start = new Date(newStartTime);
      b.startTime = start.toISOString();
      b.endTime = new Date(start.getTime() + et.durationMinutes * 60_000).toISOString();
      return b;
    },
  },
  customers: {
    list(opts: { page?: number; pageSize?: number } = {}): {
      items: Customer[];
      total: number;
      page: number;
      pageSize: number;
    } {
      const page = opts.page ?? 1;
      const pageSize = opts.pageSize ?? 20;
      const sorted = [...customers].sort((a, b) => {
        const la = a.lastBookingAt ?? "";
        const lb = b.lastBookingAt ?? "";
        return lb.localeCompare(la);
      });
      const start = (page - 1) * pageSize;
      return {
        items: sorted.slice(start, start + pageSize),
        total: sorted.length,
        page,
        pageSize,
      };
    },
    byId(id: string): Customer | null {
      return customers.find((c) => c.id === id) ?? null;
    },
  },
  availability: {
    forHost(hostId: string, date: string): { startMinute: number; endMinute: number }[] {
      const day = new Date(date).getUTCDay();
      return availability
        .filter((a) => a.hostId === hostId && a.dayOfWeek === day)
        .map((a) => ({ startMinute: a.startMinute, endMinute: a.endMinute }))
        .sort((a, b) => a.startMinute - b.startMinute);
    },
  },
};
