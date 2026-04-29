import { ComposoftRuntime } from "@composoft/runtime";
import { registry } from "@/lib/registry";
import { composition } from "@/lib/composition";
import { buildContext } from "@/lib/context";

// Composoft defaults to dynamic rendering so adapters always see fresh data.
// Edit this for static or ISR semantics if your adapters are cache-friendly.
export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;

export default async function Page({ params }: { params: Promise<Params> }) {
  const resolvedParams = await params;
  const context = buildContext(resolvedParams);
  return (
    <ComposoftRuntime
      registry={registry}
      composition={composition}
      context={context}
      pagePath="/purchase-orders/[poId]"
    />
  );
}
