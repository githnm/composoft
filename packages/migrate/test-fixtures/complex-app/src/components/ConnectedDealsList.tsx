import { useSelector } from "react-redux";

type Deal = { id: string; title: string };

// Connected via Redux selector — analyzer should detect react-redux import
// and add a limitation about Redux selectors.
export function ConnectedDealsList() {
  const deals = useSelector((s: { deals: { items: Deal[] } }) => s.deals.items);
  return (
    <ul>
      {deals.map((d) => (
        <li key={d.id}>{d.title}</li>
      ))}
    </ul>
  );
}
