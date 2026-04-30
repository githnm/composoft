import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authenticateRequest,
  authorizeRequest,
  mergeIdentityIntoContext,
  resolveOneSlot,
} from "@composoft/runtime";
import { registry } from "@/lib/registry";
import { composition } from "@/lib/composition";
import { contextSchema } from "@/lib/context";

/**
 * Re-resolve a single data slot for a block instance. Called by
 * <ComposoftBlockHost> on the client whenever a from-page-state path the
 * slot reads changes value. The handler validates the requested slot
 * exists on the named instance, runs the registry's enrichContext, then
 * reuses the runtime's resolveOneSlot.
 *
 * Security: the client cannot construct arbitrary adapter calls. Only
 * (instanceId, slotName) pairs that exist in the composition resolve.
 */

const requestSchema = z.object({
  blockInstanceId: z.string().min(1),
  slotName: z.string().min(1),
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
  const { blockInstanceId, slotName, context, pageState } = parsed.data;

  // Authenticate first; same gate shape as the action route.
  const auth = await authenticateRequest(registry, req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

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

  const slot = block.data[slotName];
  if (!slot) {
    return NextResponse.json(
      { error: `block "${blockId}" has no slot "${slotName}"` },
      { status: 404 },
    );
  }

  // Authorize — adapter id and the page state the client controls are the
  // permission-relevant inputs. Server-resolved params come later.
  const authz = await authorizeRequest(registry, auth.identity, {
    kind: "resolve",
    adapterId: slot.adapter,
    params: pageState ?? {},
    blockInstanceId,
    slotName,
  });
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

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

  try {
    const data = await resolveOneSlot(
      block,
      slotName,
      registry,
      enrichedContext,
      validatedConfig,
      pageState ?? {},
    );
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
