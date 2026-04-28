import { z } from "zod";
import { defineAdapter, defineBlock, defineWorkflow } from "@composoft/spec";
import {
  bindActions,
  PathResolutionError,
  readPath,
  resolveDataSlots,
  validateComposition,
} from "./index.js";

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

// from-context path that doesn't resolve should throw with slot info
try {
  await resolveDataSlots(
    slottedBlock,
    { adapters: { "test.echo": echoAdapter } },
    { user: {} }, // missing name
    { defaultValue: "x" },
  );
  failures.push("resolveDataSlots: expected throw for missing context path");
} catch (e) {
  const m = (e as Error).message;
  if (!m.includes("fromContext") || !m.includes("user.name")) {
    failures.push(`resolveDataSlots: error did not mention slot/path: "${m}"`);
  }
}

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

if (failures.length > 0) {
  console.error(`FAIL — ${failures.length} runtime test failures`);
  for (const f of failures) console.error("  -", f);
  process.exit(1);
}

console.log(
  `OK — runtime tests passed: readPath, resolveDataSlots (3 ParamSource kinds + 2 error cases), bindActions (prefilled merge + conflict), validateComposition (good + 2 bad).`,
);
