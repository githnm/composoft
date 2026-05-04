import { z } from "zod";
import { defineAdapter, defineBlock, defineWorkflow } from "@composoft/spec";
import {
  authenticateRequest,
  authorizeRequest,
  bindActions,
  mergeIdentityIntoContext,
  PathResolutionError,
  readPath,
  resolveDataSlots,
  resolveOneSlot,
  resolveParamSource,
  validateComposition,
  _resetAuthWarningForTests,
} from "./index.js";
import type { AuthRequest, Identity, Registry } from "@composoft/spec";

const failures: string[] = [];

function assert(cond: boolean, msg: string) {
  if (!cond) failures.push(msg);
}

function expectThrow(fn: () => unknown, msgFragment: string, label: string) {
  try {
    fn();
    failures.push(`${label}: expected throw containing "${msgFragment}"`);
  } catch (e) {
    const m = (e as Error).message;
    if (!m.includes(msgFragment)) {
      failures.push(`${label}: thrown message "${m}" did not contain "${msgFragment}"`);
    }
  }
}

// --- readPath ---
assert(readPath({ a: 1 }, "a") === 1, "readPath: simple key");
assert(readPath({ a: { b: { c: "x" } } }, "a.b.c") === "x", "readPath: nested");
assert(
  (() => {
    const v = readPath({ ticket: { id: "tk_001" } }, "ticket.id");
    return v === "tk_001";
  })(),
  "readPath: dotted",
);
expectThrow(() => readPath({}, "missing"), "missing", "readPath: missing key");
expectThrow(() => readPath(null, "a"), "null", "readPath: null root");
expectThrow(() => readPath(undefined, "a"), "undefined", "readPath: undefined root");
expectThrow(() => readPath({ a: 1 }, "a.b"), "from number", "readPath: scalar mid-path");
expectThrow(() => readPath({}, ""), "empty path", "readPath: empty path");

// --- resolveParamSource: dotted from-page-state paths ---
// These cases shadow the readPath tests above but exercise the
// public `resolveParamSource` API end-to-end. Cold-user testing on
// alpha.5 surfaced a Zod failure caused by a *template* writing the
// wrong-shape value to page state; these tests document the runtime's
// correct behavior so the next regression points the finger at the
// caller, not the resolver.
assert(
  resolveParamSource(
    { kind: "from-page-state", path: "selection.ticketId" },
    {},
    {},
    { selection: { ticketId: "tkt_001" } },
  ) === "tkt_001",
  "resolveParamSource: selection.ticketId returns leaf string",
);
assert(
  resolveParamSource(
    { kind: "from-page-state", path: "a.b.c" },
    {},
    {},
    { a: { b: { c: 42 } } },
  ) === 42,
  "resolveParamSource: deep nested numeric leaf",
);
assert(
  resolveParamSource(
    { kind: "from-page-state", path: "missing.key" },
    {},
    {},
    {},
  ) === undefined,
  "resolveParamSource: missing path returns undefined (no throw)",
);
assert(
  resolveParamSource(
    { kind: "from-page-state", path: "selection.ticketId" },
    {},
    {},
    undefined,
  ) === undefined,
  "resolveParamSource: undefined page state returns undefined",
);
// And the regression for the alpha.5 bug: if some block wrote
// `{ ticketId: "tkt_001" }` AT path `selection.ticketId` (instead of
// the leaf string), readers receive the OBJECT — exactly the failure
// the cold-user hit. The resolver's job is to surface the value at
// the path verbatim; the bug was upstream in the writer's call shape.
assert(
  (() => {
    const v = resolveParamSource(
      { kind: "from-page-state", path: "selection.ticketId" },
      {},
      {},
      { selection: { ticketId: { ticketId: "tkt_001" } } },
    );
    return (
      typeof v === "object" &&
      v !== null &&
      (v as Record<string, unknown>).ticketId === "tkt_001"
    );
  })(),
  "resolveParamSource: wrong-shape page state surfaces wrong-shape value (caller responsibility, not runtime)",
);

// --- resolveOneSlot: integration test with dotted from-page-state ---
const oneSlotEchoAdapter = defineAdapter({
  id: "test.echo-required-2",
  version: "0.1.0",
  description: "Echoes a required value.",
  params: z.object({ value: z.string() }),
  output: z.object({ echoed: z.string() }),
  run: async ({ value }) => ({ echoed: value }),
});

const oneSlotBlock = defineBlock({
  id: "test.one-slot",
  version: "0.1.0",
  description: "Single from-page-state slot for resolveOneSlot integration.",
  config: z.object({}),
  data: {
    selected: {
      adapter: "test.echo-required-2",
      params: { value: { kind: "from-page-state", path: "selection.ticketId" } },
    },
  },
  actions: {},
  component: () => null,
});

const oneSlotResolved = await resolveOneSlot(
  oneSlotBlock,
  "selected",
  { adapters: { "test.echo-required-2": oneSlotEchoAdapter } },
  {},
  {},
  { selection: { ticketId: "tkt_007" } },
);
assert(
  (oneSlotResolved as { echoed: string }).echoed === "tkt_007",
  `resolveOneSlot integration: expected echoed=tkt_007, got ${JSON.stringify(oneSlotResolved)}`,
);

const oneSlotSkipped = await resolveOneSlot(
  oneSlotBlock,
  "selected",
  { adapters: { "test.echo-required-2": oneSlotEchoAdapter } },
  {},
  {},
  {}, // no selection.ticketId → auto-skip
);
assert(
  oneSlotSkipped === null,
  `resolveOneSlot integration: expected null on missing page state, got ${JSON.stringify(oneSlotSkipped)}`,
);
assert(
  (() => {
    try {
      readPath({}, "x");
      return false;
    } catch (e) {
      return e instanceof PathResolutionError;
    }
  })(),
  "readPath: throws PathResolutionError subclass",
);

// --- resolveDataSlots ---
const echoAdapter = defineAdapter({
  id: "test.echo",
  version: "0.1.0",
  description: "Echoes its `value` param.",
  params: z.object({ value: z.string() }),
  output: z.object({ echoed: z.string() }),
  run: async ({ value }) => ({ echoed: value }),
});

const slottedBlock = defineBlock({
  id: "test.slotted",
  version: "0.1.0",
  description: "Exercises all three ParamSource kinds.",
  config: z.object({ defaultValue: z.string() }),
  data: {
    fromConfig: {
      adapter: "test.echo",
      params: { value: { kind: "from-config", path: "defaultValue" } },
    },
    fromContext: {
      adapter: "test.echo",
      params: { value: { kind: "from-context", path: "user.name" } },
    },
    fromStatic: {
      adapter: "test.echo",
      params: { value: { kind: "static", value: "literal" } },
    },
  },
  actions: {},
  component: () => null,
});

const data = await resolveDataSlots(
  slottedBlock,
  { adapters: { "test.echo": echoAdapter } },
  { user: { name: "alice" } },
  { defaultValue: "from-config-value" },
);

const fromConfig = data.fromConfig as { echoed: string };
const fromContext = data.fromContext as { echoed: string };
const fromStatic = data.fromStatic as { echoed: string };
assert(fromConfig.echoed === "from-config-value", `fromConfig: ${fromConfig.echoed}`);
assert(fromContext.echoed === "alice", `fromContext: ${fromContext.echoed}`);
assert(fromStatic.echoed === "literal", `fromStatic: ${fromStatic.echoed}`);

// Missing from-context path on a REQUIRED adapter param: resolves to
// undefined, then the adapter's Zod schema rejects. Error comes from Zod,
// not from PathResolutionError — the schema is the source of truth.
try {
  await resolveDataSlots(
    slottedBlock,
    { adapters: { "test.echo": echoAdapter } },
    { user: {} }, // missing name
    { defaultValue: "x" },
  );
  failures.push("resolveDataSlots: expected throw for missing required path");
} catch (e) {
  const m = (e as Error).message.toLowerCase();
  if (!m.includes("required") && !m.includes("invalid_type")) {
    failures.push(`resolveDataSlots: expected Zod required/invalid_type error, got: "${(e as Error).message}"`);
  }
}

// Missing from-config path on an OPTIONAL adapter param: resolves to
// undefined, adapter accepts. Should not throw.
const optionalAdapter = defineAdapter({
  id: "test.echo-optional",
  version: "0.1.0",
  description: "Echoes an optional value.",
  params: z.object({ value: z.string().optional() }),
  output: z.object({ echoed: z.string().nullable() }),
  run: async ({ value }) => ({ echoed: value ?? null }),
});

const optionalBlock = defineBlock({
  id: "test.optional-slot",
  version: "0.1.0",
  description: "Reads from a config field that doesn't exist.",
  config: z.object({}),
  data: {
    slot: {
      adapter: "test.echo-optional",
      params: { value: { kind: "from-config", path: "missingField" } },
    },
  },
  actions: {},
  component: () => null,
});

const optionalResult = await resolveDataSlots(
  optionalBlock,
  { adapters: { "test.echo-optional": optionalAdapter } },
  {},
  {}, // no missingField
);
const optionalSlot = optionalResult.slot as { echoed: string | null };
assert(
  optionalSlot.echoed === null,
  `optional from-config missing path: expected null, got ${optionalSlot.echoed}`,
);

// Unknown adapter should throw with the offending id
const orphanBlock = defineBlock({
  id: "test.orphan",
  version: "0.1.0",
  description: "References a missing adapter.",
  config: z.object({}),
  data: {
    nope: {
      adapter: "test.does-not-exist",
      params: {},
    },
  },
  actions: {},
  component: () => null,
});
try {
  await resolveDataSlots(orphanBlock, { adapters: {} }, {}, {});
  failures.push("resolveDataSlots: expected throw for unknown adapter");
} catch (e) {
  if (!(e as Error).message.includes("test.does-not-exist")) {
    failures.push(`resolveDataSlots: error did not name unknown adapter: "${(e as Error).message}"`);
  }
}

// --- from-page-state: auto-skip when path resolves to undefined ---
const requiredEchoAdapter = defineAdapter({
  id: "test.echo-required",
  version: "0.1.0",
  description: "Echoes a required value.",
  params: z.object({ value: z.string() }),
  output: z.object({ echoed: z.string() }),
  run: async ({ value }) => ({ echoed: value }),
});

const pageStateBlock = defineBlock({
  id: "test.page-state-slot",
  version: "0.1.0",
  description: "Reads a from-page-state path that may be undefined.",
  config: z.object({}),
  data: {
    selected: {
      adapter: "test.echo-required",
      params: { value: { kind: "from-page-state", path: "selection.itemId" } },
    },
  },
  actions: {},
  component: () => null,
});

// Page state empty → required path resolves undefined → slot is auto-skipped to null.
const skipResult = await resolveDataSlots(
  pageStateBlock,
  { adapters: { "test.echo-required": requiredEchoAdapter } },
  {},
  {},
  {}, // empty page state
);
assert(
  skipResult.selected === null,
  `auto-skip: expected null, got ${JSON.stringify(skipResult.selected)}`,
);

// Page state populated → adapter runs, slot resolves normally.
const populatedResult = await resolveDataSlots(
  pageStateBlock,
  { adapters: { "test.echo-required": requiredEchoAdapter } },
  {},
  {},
  { selection: { itemId: "itm_001" } },
);
const sel = populatedResult.selected as { echoed: string };
assert(sel.echoed === "itm_001", `populated page state: got ${sel.echoed}`);

// --- bindActions ---
const noopWorkflow = defineWorkflow({
  id: "test.noop",
  version: "0.1.0",
  description: "Returns the merged input back.",
  input: z.object({ ticketId: z.string(), reason: z.string() }),
  output: z.object({ ticketId: z.string(), reason: z.string() }),
  run: async (input) => input,
});

const actionBlock = defineBlock({
  id: "test.actions",
  version: "0.1.0",
  description: "Action with prefilled ticketId from context.",
  config: z.object({}),
  data: {},
  actions: {
    submit: {
      workflow: "test.noop",
      params: { ticketId: { kind: "from-context", path: "ticket.id" } },
    },
  },
  component: () => null,
});

const actions = bindActions(
  actionBlock,
  { workflows: { "test.noop": noopWorkflow } },
  { ticket: { id: "tk_007" } },
  {},
);

const submit = actions.submit;
if (!submit) {
  failures.push("bindActions: submit action missing");
} else {
  const result = (await submit({ reason: "manual review" })) as {
    ticketId: string;
    reason: string;
  };
  assert(result.ticketId === "tk_007", `bindActions: prefilled ticketId, got ${result.ticketId}`);
  assert(result.reason === "manual review", `bindActions: caller reason, got ${result.reason}`);
}

// Prefilled wins on conflict
if (submit) {
  const result = (await submit({ ticketId: "tk_other", reason: "x" })) as {
    ticketId: string;
  };
  assert(
    result.ticketId === "tk_007",
    `bindActions: prefilled should win on conflict, got ${result.ticketId}`,
  );
}

// --- validateComposition ---
const goodComposition = validateComposition({
  name: "test",
  version: "0.1.0",
  pages: [
    {
      path: "/tickets/[ticketId]",
      blocks: [
        {
          id: "support.ticket-list",
          instanceId: "list-1",
          config: {},
        },
      ],
    },
  ],
});
assert(goodComposition.pages.length === 1, "validateComposition: parses good shape");

expectThrow(
  () =>
    validateComposition({
      name: "x",
      version: "0.1.0",
      pages: [
        {
          path: "/x",
          blocks: [
            { id: "a.b", instanceId: "i", config: {} },
            { id: "a.c", instanceId: "i", config: {} },
          ],
        },
      ],
    }),
  "duplicate instanceId",
  "validateComposition: duplicate instanceId",
);

expectThrow(
  () =>
    validateComposition({
      name: "x",
      version: "not-semver",
      pages: [{ path: "/x", blocks: [{ id: "a.b", instanceId: "i", config: {} }] }],
    }),
  "semver",
  "validateComposition: bad version",
);

// --- auth helpers ---

const fakeRegistry = (overrides: Partial<Registry> = {}): Registry => ({
  name: "test",
  version: "0.1.0",
  adapters: {},
  workflows: {},
  blocks: {},
  ...overrides,
});

const fakeReq = (headers: Record<string, string> = {}): Request =>
  new Request("http://localhost/test", { method: "POST", headers });

// Case 1: no authenticate hook → ok with anonymous identity, warning fires.
_resetAuthWarningForTests();
const noAuthResult = await authenticateRequest(fakeRegistry(), fakeReq());
assert(
  noAuthResult.ok && noAuthResult.identity.userId === "anonymous",
  `no-authenticate should return anonymous, got ${JSON.stringify(noAuthResult)}`,
);

// Case 2: authenticate returns null → 401.
const reject: Registry["authenticate"] = async () => null;
const rejected = await authenticateRequest(fakeRegistry({ authenticate: reject }), fakeReq());
assert(
  !rejected.ok && rejected.status === 401,
  `null-identity should 401, got ${JSON.stringify(rejected)}`,
);

// Case 3: authenticate returns identity → ok.
const accept: Registry["authenticate"] = async (req) => {
  const userId = req.headers.get("x-user");
  if (!userId) return null;
  return { userId, claims: { role: "admin" } };
};
const accepted = await authenticateRequest(
  fakeRegistry({ authenticate: accept }),
  fakeReq({ "x-user": "alice" }),
);
assert(
  accepted.ok && accepted.identity.userId === "alice",
  `accepted should give userId, got ${JSON.stringify(accepted)}`,
);
const rejectedNoHeader = await authenticateRequest(
  fakeRegistry({ authenticate: accept }),
  fakeReq(),
);
assert(
  !rejectedNoHeader.ok && rejectedNoHeader.status === 401,
  `no-header should 401, got ${JSON.stringify(rejectedNoHeader)}`,
);

// Case 4: authenticate throws → 500 with generic message.
const thrower: Registry["authenticate"] = async () => {
  throw new Error("internal db hiccup");
};
const threw = await authenticateRequest(fakeRegistry({ authenticate: thrower }), fakeReq());
assert(
  !threw.ok && threw.status === 500 && !threw.error.includes("hiccup"),
  `throw should 500 with generic message, got ${JSON.stringify(threw)}`,
);

// Case 5: authorize returns false → 403.
const identity: Identity = { userId: "alice", claims: { role: "viewer" } };
const denyAuthz: Registry["authorize"] = async () => false;
const denied = await authorizeRequest(
  fakeRegistry({ authorize: denyAuthz }),
  identity,
  { kind: "action", workflowId: "wf.test", input: {}, blockInstanceId: "i" } satisfies AuthRequest,
);
assert(
  !denied.ok && denied.status === 403,
  `false should 403, got ${JSON.stringify(denied)}`,
);

// Case 6: authorize allows → ok.
const allowAuthz: Registry["authorize"] = async () => true;
const allowed = await authorizeRequest(
  fakeRegistry({ authorize: allowAuthz }),
  identity,
  { kind: "action", workflowId: "wf.test", input: {}, blockInstanceId: "i" },
);
assert(allowed.ok, `true should allow, got ${JSON.stringify(allowed)}`);

// Case 7: authorize missing → ok.
const noAuthz = await authorizeRequest(fakeRegistry(), identity, {
  kind: "action",
  workflowId: "wf.test",
  input: {},
  blockInstanceId: "i",
});
assert(noAuthz.ok, `no-authorize should allow, got ${JSON.stringify(noAuthz)}`);

// Case 8: identity merge — userId is authoritative.
const merged = mergeIdentityIntoContext(
  { user: { id: "from-route", role: "old" }, ticket: { id: "tk_1" } },
  { userId: "alice", claims: { role: "admin", id: "evil-attempt" } },
);
const mergedTyped = merged as { user: { id: string; role: string }; ticket: { id: string } };
assert(mergedTyped.user.id === "alice", `userId should win, got ${mergedTyped.user.id}`);
assert(mergedTyped.user.role === "admin", `claims.role should apply, got ${mergedTyped.user.role}`);
assert(
  mergedTyped.ticket.id === "tk_1",
  `non-user fields preserved, got ${mergedTyped.ticket.id}`,
);

if (failures.length > 0) {
  console.error(`FAIL — ${failures.length} runtime test failures`);
  for (const f of failures) console.error("  -", f);
  process.exit(1);
}

console.log(
  `OK — runtime tests passed: readPath, resolveDataSlots (4 ParamSource kinds + missing-required-Zod-error + missing-optional-undefined + page-state-auto-skip + page-state-populated), bindActions (prefilled merge + conflict), validateComposition (good + 2 bad), auth (no-hook + null + accept + reject + throw-500 + authorize allow/deny/missing + identity-merge userId-authoritative).`,
);
