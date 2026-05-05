import useSWR from "swr";

function useAccountInternal(id: string) {
  return useSWR(`/api/accounts/${id}`);
}

function useAccountWithMeta(id: string) {
  const inner = useAccountInternal(id);
  const meta = useSWR(`/api/accounts/${id}/meta`);
  return { ...inner, meta };
}

// 3 levels deep: useDeepAccount → useAccountWithMeta → useAccountInternal → useSWR.
// Analyzer should detect and add a limitation about deep custom hooks.
export function useDeepAccount(id: string) {
  return useAccountWithMeta(id);
}
