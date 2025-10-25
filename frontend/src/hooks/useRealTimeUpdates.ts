import { useEffect, useState } from 'react';

export function useRealTimeUpdates(dataType: string, fetchFunction: () => Promise<any>) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await fetchFunction();
      setData(Array.isArray(result) ? result : result.results || []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error(`Error fetching ${dataType}:`, error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchData();

    // Listen for real-time updates
    const handleRefresh = () => {
      fetchData();
    };

    const eventName = `refresh-${dataType}-data`;
    window.addEventListener(eventName, handleRefresh);

    return () => {
      window.removeEventListener(eventName, handleRefresh);
    };
  }, [dataType]);

  return {
    data,
    loading,
    lastUpdate,
    refresh: fetchData,
  };
}
