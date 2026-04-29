import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authenticateRequest,
  authorizeRequest,
  bindActions,
  mergeIdentityIntoContext,
} from "@composoft/runtime";
import { registry } from "@/lib/registry";
import { composition } from "@/lib/composition";
import { contextSchema } from "@/lib/context";

const requestSchema = z.object({
  blockInstanceId: z.string().min(1),
  actionName: z.string().min(1),
  input: z.unknown(),
  context: z.unknown(),
  pageState: z.record(z.string(), z.unknown()).optional(),
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
  const { blockInstanceId, actionName, input, context, pageState } = parsed.data;

  // Authenticate. Missing hook → warn-once + anonymous identity. Returns
  // 401 if registry.authenticate returns null, 500 if it throws.
  const auth = await authenticateRequest(registry, req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

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

  const actionRef = block.actions[actionName];
  if (!actionRef) {
    return NextResponse.json(
      { error: `block "${blockId}" has no action "${actionName}"` },
      { status: 404 },
    );
  }

  // Authorize — receives the workflow id and caller-supplied input.
  // Permission gate. Tenancy filtering belongs in the workflow/adapter SQL
  // via context.user.id, not here.
  const authz = await authorizeRequest(registry, auth.identity, {
    kind: "action",
    workflowId: actionRef.workflow,
    input: input ?? {},
    blockInstanceId,
  });
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  // Validate the caller's context against the page's contextSchema, splice
  // the authenticated identity into context.user, then run enrichContext.
  const validatedContext = contextSchema.safeParse(context);
  if (!validatedContext.success) {
    return NextResponse.json(
      { error: "invalid context", detail: validatedContext.error.issues },
      { status: 400 },
    );
  }
  const withIdentity = mergeIdentityIntoContext(validatedContext.data, auth.identity);
  const enrichedContext = registry.enrichContext
    ? await registry.enrichContext(withIdentity, registry)
    : withIdentity;

  const validatedConfig = block.config.parse(instanceConfig);

  const actions = bindActions(block, registry, enrichedContext, validatedConfig, pageState ?? {});
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
