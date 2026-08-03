import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";

export function useProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("name");
    if (!error) setProducts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const addProduct = useCallback(async (product) => {
    const { data, error } = await supabase
      .from("products")
      .insert([product])
      .select()
      .single();
    if (!error) setProducts((prev) => [...prev, data]);
    return { data, error };
  }, []);

  const updateProduct = useCallback(async (id, changes) => {
    const { data, error } = await supabase
      .from("products")
      .update(changes)
      .eq("id", id)
      .select()
      .single();
    if (!error)
      setProducts((prev) => prev.map((p) => (p.id === id ? data : p)));
    return { data, error };
  }, []);

  const deleteProduct = useCallback(async (id) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (!error) setProducts((prev) => prev.filter((p) => p.id !== id));
    return { error };
  }, []);

  return { products, loading, addProduct, updateProduct, deleteProduct, fetchProducts };
}
