import useSWR from "swr";

type Contact = { id: string; name: string; email: string };

export function ContactCard({ id }: { id: string }) {
  const { data } = useSWR<Contact>(`/api/contacts/${id}`);
  if (!data) return <div>Loading…</div>;
  return (
    <article>
      <h3>{data.name}</h3>
      <p>{data.email}</p>
    </article>
  );
}
