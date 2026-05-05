import useSWR from "swr";

type Account = { id: string; name: string; plan: string };

export function AccountList() {
  const { data } = useSWR<Account[]>("/api/accounts");
  return (
    <ul>
      {data?.map((a) => (
        <li key={a.id}>
          {a.name} ({a.plan})
        </li>
      ))}
    </ul>
  );
}
