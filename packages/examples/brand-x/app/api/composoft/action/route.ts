import { NextResponse } from "next/server";
import { z } from "zod";
import { bindActions } from "@composoft/runtime";
import { registry } from "@/lib/registry";
import { composition } from "@/lib/composition";
import { contextSchema } from "@/lib/context";

const requestSchema = z.object({
  blockInstanceId: z.string().min(1),
  actionName: z.string().min(1),
  input: z.unknown(),
  context: z.unknown(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "request body must be JSON" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid request shape", detail: parsed.error.issues },
      { status: 400 },
    );
  }
  const { blockInstanceId, actionName, input, context } = parsed.data;

  // Find the block instance across pages — instanceIds are globally unique
  // (validateComposition enforces this).
  let blockId: string | undefined;
  let instanceConfig: unknown;
  for (const page of composition.pages) {
    const inst = page.blocks.find((b) => b.instanceId === blockInstanceId);
    if (inst) {
      blockId = inst.id;
      instanceConfig = inst.config;
      break;
    }
  }
  if (!blockId) {
    return NextResponse.json(
      { error: `unknown blockInstanceId: ${blockInstanceId}` },
      { status: 404 },
    );
  }

  const block = registry.blocks[blockId];
  if (!block) {
    return NextResponse.json({ error: `registry has no block "${blockId}"` }, { status: 500 });
  }

  // Validate the caller's context against the page's contextSchema, then
  // run the registry's enrichment (same path the page render uses).
  const validatedContext = contextSchema.safeParse(context);
  if (!validatedContext.success) {
    return NextResponse.json(
      { error: "invalid context", detail: validatedContext.error.issues },
      { status: 400 },
    );
  }
  const enrichedContext = registry.enrichContext
    ? await registry.enrichContext(validatedContext.data, registry)
    : validatedContext.data;

  const validatedConfig = block.config.parse(instanceConfig);

  const actions = bindActions(block, registry, enrichedContext, validatedConfig);
  const action = actions[actionName];
  if (!action) {
    return NextResponse.json(
      { error: `block "${blockId}" has no action "${actionName}"` },
      { status: 404 },
    );
  }

  try {
    const result = await action(input);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
