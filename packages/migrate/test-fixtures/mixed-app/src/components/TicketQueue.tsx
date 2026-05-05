import { useQuery } from "@tanstack/react-query";

type Ticket = { id: string; subject: string; status: string };

export function TicketQueue({ status }: { status?: string }) {
  const { data, isLoading } = useQuery<Ticket[]>({
    queryKey: ["tickets", status],
    queryFn: async () => {
      const res = await fetch(`/api/tickets?status=${status ?? "open"}`);
      return res.json();
    },
  });
  if (isLoading) return <div>Loading…</div>;
  return (
    <ul>
      {data?.map((t) => (
        <li key={t.id}>{t.subject}</li>
      ))}
    </ul>
  );
}
