import useSWR from "swr";

type Deal = { id: string; title: string; stage: string; amount: number };

type Props = {
  stage?: string;
};

export function DealsList({ stage }: Props) {
  const { data, error } = useSWR<Deal[]>(`/api/deals?stage=${stage ?? "all"}`);
  if (error) return <div>Error loading deals</div>;
  if (!data) return <div>Loading...</div>;
  return (
    <ul>
      {data.map((d) => (
        <li key={d.id}>
          {d.title} — {d.stage} — ${d.amount}
        </li>
      ))}
    </ul>
  );
}
