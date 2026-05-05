import useSWR from "swr";

type Rep = { id: string; name: string; quota: number; closedThisQuarter: number };

export function RepLeaderboard() {
  const { data } = useSWR<Rep[]>("/api/reps");
  if (!data) return null;
  const sorted = [...data].sort((a, b) => b.closedThisQuarter - a.closedThisQuarter);
  return (
    <table>
      <tbody>
        {sorted.map((r) => (
          <tr key={r.id}>
            <td>{r.name}</td>
            <td>{r.closedThisQuarter}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
