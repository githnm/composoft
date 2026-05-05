import useSWR from "swr";

type Account = { id: string; name: string; plan: string };

// Custom hook (1-level deep). Should be analyzable.
export function useAccount(id: string) {
  const { data, error } = useSWR<Account>(`/api/accounts/${id}`);
  return { account: data, error, isLoading: !data && !error };
}
