import useSWR from "swr";

type Deal = { id: string; title: string };

export function SimpleDealsList() {
  const { data } = useSWR<Deal[]>("/api/deals");
  return (
    <ul>
      {data?.map((d) => (
        <li key={d.id}>{d.title}</li>
      ))}
    </ul>
  );
}
