import { DealsList } from "../components/DealsList";
import { RepLeaderboard } from "../components/RepLeaderboard";

export default function Home() {
  return (
    <main>
      <h1>Sales overview</h1>
      <DealsList />
      <RepLeaderboard />
    </main>
  );
}
