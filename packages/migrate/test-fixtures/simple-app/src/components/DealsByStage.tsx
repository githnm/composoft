import useSWR from "swr";

type Deal = { id: string; title: string; stage: string };

export function DealsByStage({ stage }: { stage: string }) {
  const { data } = useSWR<Deal[]>(`/api/deals?stage=${stage}`);
  return (
    <section>
      <h3>{stage}</h3>
      <ul>{data?.map((d) => <li key={d.id}>{d.title}</li>)}</ul>
    </section>
  );
}
