import { ComposoftRuntime } from "@composoft/runtime";
import { registry } from "@/lib/registry";
import { composition } from "@/lib/composition";
import { buildContext } from "@/lib/context";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;

const PAGE_PATH = "/leads";

export default async function Page({ params }: { params: Promise<Params> }) {
  const resolvedParams = await params;
  const context = buildContext(resolvedParams);
  const page = composition.pages.find((p) => p.path === PAGE_PATH);
  return (
    <>
      <PageHeader title={page?.title} subtitle={page?.subtitle} />
      <ComposoftRuntime
        registry={registry}
        composition={composition}
        context={context}
        pagePath={PAGE_PATH}
      />
    </>
  );
}
