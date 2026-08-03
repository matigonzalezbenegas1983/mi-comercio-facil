import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";

export function useProviders() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProviders = useCallback(async () => {
    const { data, error } = await supabase
      .from("providers")
      .select("*")
      .order("name");
    if (!error) setProviders(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const addProvider = useCallback(async (provider) => {
    const { data, error } = await supabase
      .from("providers")
      .insert([provider])
      .select()
      .single();
    if (!error) setProviders((prev) => [...prev, data]);
    return { data, error };
  }, []);

  const updateProvider = useCallback(async (id, changes) => {
    const { data, error } = await supabase
      .from("providers")
      .update(changes)
      .eq("id", id)
      .select()
      .single();
    if (!error)
      setProviders((prev) => prev.map((p) => (p.id === id ? data : p)));
    return { data, error };
  }, []);

  const deleteProvider = useCallback(async (id) => {
    const { error } = await supabase.from("providers").delete().eq("id", id);
    if (!error) setProviders((prev) => prev.filter((p) => p.id !== id));
    return { error };
  }, []);

  return { providers, loading, addProvider, updateProvider, deleteProvider };
}
