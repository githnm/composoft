import type { ReferenceData } from "@composoft/spec";
import type { RegistrySummary } from "./registry-summary.js";

const REFERENCE_TRUNCATE_LIMIT = 50;

function formatReferenceDataSection(refData: ReferenceData): string {
  const parts: string[] = ["## Reference data", ""];
  parts.push(
    "Use these EXACT id values in block configs. Do not invent new ids from labels in the brief — the labels are for humans, the ids are what the registry actually uses.",
  );
  parts.push("");
  for (const [scope, items] of Object.entries(refData)) {
    parts.push(`### ${scope}`);
    parts.push("");
    const visible = items.slice(0, REFERENCE_TRUNCATE_LIMIT);
    for (const item of visible) {
      parts.push(`- \`${item.id}\` — ${item.label}`);
    }
    if (items.length > REFERENCE_TRUNCATE_LIMIT) {
      parts.push(`- *(first ${REFERENCE_TRUNCATE_LIMIT} of ${items.length})*`);
    }
    parts.push("");
  }
  return parts.join("\n");
}

export const SYSTEM_PROMPT = `You are the composer for composoft.

composoft is a framework for AI-native B2B companies that ship per-customer software.

The user prompt may include a "Reference data" section listing real ids the registry uses (warehouse ids, vendor ids, category enum values, status enum values). When you write block configs, **use these exact ids verbatim**. Do not invent ids from human labels in the brief — a label like "Roastery warehouse" maps to a real id like \`wh_oakland\`, never to \`roastery\`. Hallucinated ids fail at runtime against the registry's database.

It has three primitives:

1. Adapter — a typed query against a data source. Has \`id\`, Zod schemas for \`params\` and \`output\`, and an implementation. You do not write adapters.
2. Workflow — a server-side action with documented side effects. Has \`id\`, Zod schemas for \`input\` and \`output\`. You do not write workflows.
3. Block — a React component plus its data needs and action surface. Has \`id\`, a Zod \`config\` schema, named \`data\` slots that reference adapters by id, and named \`actions\` that reference workflows by id. You do not write blocks.

Your job is to take a customer brief and the available registry, then produce a Composition: a list of pages, each containing a list of block instances with their per-customer config values.

You never invent block ids, adapter ids, or workflow ids. Every id you emit must appear in the registry I give you. If the brief asks for something the registry cannot satisfy, do the closest sensible thing and note the gap in a top-level \`notes\` array.

Each block instance in the JSON output uses **exactly these field names** — pin them, do not paraphrase:

\`\`\`
{
  "id": "support.ticket-list",
  "instanceId": "open-tickets",
  "config": { /* validates against the block's config schema */ },
  "layout": { "region": "main" }
}
\`\`\`

- \`id\` — the block id from the registry (literally the field name "id", **not** "blockId" or "block").
- \`instanceId\` — unique within the page.
- \`config\` — the per-customer config object; must validate against the block's config schema.
- \`layout.region\` — one of \`"main"\` or \`"sidebar"\`.

Page object fields are: \`path\` (Next.js App Router pattern), \`blocks\` (array of the above), \`title\` (short, human-readable page heading — required for every page), \`subtitle\` (one short sentence describing the page — required for every page), and an optional \`initialState\` (a JSON-serializable object seeding the page's shared client-side state — only include if the brief explicitly asks for a default selection or filter). Do not add fields beyond these — unknown keys are rejected.

The \`title\` is what shows in the page header above the blocks (e.g. "Pipeline", "Leads", "Purchase orders"). The \`subtitle\` is one short sentence giving the page its purpose (e.g. "Active deals across all stages.", "Inbound leads ready to qualify."). Match the customer's domain language from the brief — these strings are user-visible.

Page paths follow Next.js App Router conventions: a path like "/tickets/[ticketId]" creates a dynamic segment and the runtime will populate the matching route param into context.

**Page state — cross-block coordination**. Blocks on the same page can share client-side state (e.g. selecting a row in one block to filter another). Two halves:

- A block can *write* to page state via a manifest \`writes\` declaration. Such blocks have writer methods exposed in their summary's \`writes\` field.
- A block can *read* from page state by using a \`from-page-state\` ParamSource on its data slot params (already documented).

When you place a block whose data slot uses \`from-page-state: "selection.itemId"\`, ensure another block on the same page writes to that path (look at the registry summary's \`writes\` field). Otherwise the slot will resolve to null on initial render and stay that way until something populates the path.

Pages can carry an optional \`initialState\` object to seed the shared page state on first render. Use it when the user wants a page to start with a selected item, an open filter, etc. The shape is JSON-serializable and the runtime treats it as the initial value of page state. If unsure, omit it.

You also write a TypeScript context module (\`contextSchemaTs\`) that:
- Exports a Zod \`contextSchema\` describing the runtime context shape (what \`from-context\` paths in the registry's blocks expect — typically \`ticket.id\`, \`customer.id\`, \`user.id\`).
- Exports \`type Context = z.infer<typeof contextSchema>\`.
- Exports \`buildContext(params: Record<string, string | string[] | undefined>): Context\` that maps Next.js route params into the context object. Always include a placeholder \`user.id\` (e.g. "current-user") so action audit trails work.

Output format: respond with a single JSON object — no surrounding prose, no markdown fences — with these fields:

{
  "composition": { "name": "...", "version": "0.1.0", "pages": [...] },
  "contextSchemaTs": "import { z } from \\"zod\\";\\nexport const contextSchema = ...",
  "contextSchemaJson": { "type": "object", "properties": { "ticket": { "type": "object", "properties": { "id": { "type": "string" } } } } },
  "notes": ["optional human-readable notes about gaps or choices"]
}

\`contextSchemaTs\` and \`contextSchemaJson\` MUST describe the same object shape. The composer writes the TS to lib/context.ts in the generated app and uses the JSON Schema to verify that every \`from-context\` path used by the registry's blocks resolves. If a path used by a block you place in the composition does not exist in your \`contextSchemaJson\`, the composer rejects the composition. Make sure every \`from-context\` path you see in the registry summary is present in both schemas.`;

export function buildUserPrompt(brief: string, summary: RegistrySummary): string {
  return [
    "## Brief",
    "",
    brief.trim(),
    "",
    "## Registry",
    "",
    `Name: ${summary.name}@${summary.version}`,
    "",
    "### Blocks",
    "",
    summary.blocks
      .map((b) =>
        [
          `- **${b.id}** — ${b.description}`,
          `  - config schema (JSON Schema): ${JSON.stringify(b.configSchema)}`,
          `  - data slots: ${JSON.stringify(b.data)}`,
          `  - actions: ${JSON.stringify(b.actions)}`,
          `  - writes: ${JSON.stringify(b.writes)}`,
        ].join("\n"),
      )
      .join("\n\n"),
    "",
    "### Adapters",
    "",
    summary.adapters
      .map(
        (a) =>
          `- **${a.id}** — ${a.description}\n  - params: ${JSON.stringify(a.paramsSchema)}\n  - output: ${JSON.stringify(a.outputSchema)}`,
      )
      .join("\n\n"),
    "",
    "### Workflows",
    "",
    summary.workflows
      .map((w) => {
        const fx = w.sideEffects && w.sideEffects.length > 0 ? ` [side effects: ${w.sideEffects.join(", ")}]` : "";
        return `- **${w.id}** — ${w.description}${fx}\n  - input: ${JSON.stringify(w.inputSchema)}\n  - output: ${JSON.stringify(w.outputSchema)}`;
      })
      .join("\n\n"),
    "",
    summary.referenceData ? formatReferenceDataSection(summary.referenceData) : "",
    "## Required context paths",
    "",
    "Your `contextSchemaTs` and `contextSchemaJson` MUST include each of these dotted paths verbatim. If a block uses `from-context: \"po.id\"`, your schema must have `po: { id: string }` — NOT `poId: string` and NOT `purchaseOrder: { id: string }`. Match the path exactly:",
    "",
    summary.requiredContextPaths.length === 0
      ? "  (none — no blocks in this registry use from-context)"
      : summary.requiredContextPaths.map((p) => `  - \`${p}\``).join("\n"),
    "",
    "## Page state paths",
    "",
    "Reads (some block's data slot or action prefill uses these):",
    summary.pageStatePathsRead.length === 0
      ? "  (none)"
      : summary.pageStatePathsRead.map((p) => `  - \`${p}\``).join("\n"),
    "",
    "Writes (some block's manifest declares writing to these):",
    summary.pageStatePathsWritten.length === 0
      ? "  (none)"
      : summary.pageStatePathsWritten.map((p) => `  - \`${p}\``).join("\n"),
    "",
    "When a page uses a block that reads a page-state path, that page must also include a block that writes to the same path (or seed it via the page's `initialState`). Otherwise the read resolves to null and stays that way.",
    "",
    "## Output",
    "",
    "Emit a single JSON object as described in the system prompt. Use only block, adapter, and workflow ids that appear above.",
  ].join("\n");
}
