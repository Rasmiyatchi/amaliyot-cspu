import { useEffect, useState } from "react";

/** Qiymatni belgilangan ms davomida kutib turadi va shundan keyin yangilaydi.
 *
 * Misol:
 *   const [search, setSearch] = useState("");
 *   const debouncedSearch = useDebounce(search, 300);
 *   const { data } = useQuery({ queryKey: ["x", debouncedSearch], ... });
 */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
