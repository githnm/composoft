import useSWR from "swr";
import { useAccount } from "./use-account";

// Deep custom hook (2 levels: this calls useAccount which calls useSWR).
// The analyzer should add a limitation about deep custom hooks.
export function useAccountWithTickets(id: string) {
  const { account } = useAccount(id);
  const { data: tickets } = useSWR(`/api/accounts/${id}/tickets`);
  return { account, tickets };
}
