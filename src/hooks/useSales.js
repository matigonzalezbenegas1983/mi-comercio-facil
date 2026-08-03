import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";

export function useSales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSales = useCallback(async () => {
    const { data, error } = await supabase
      .from("sales")
      .select("*, sale_items(*)")
      .order("created_at", { ascending: false });
    if (!error) setSales(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const addSale = useCallback(async (sale, items) => {
    // Insertar venta
    const { data: saleData, error: saleError } = await supabase
      .from("sales")
      .insert([sale])
      .select()
      .single();
    if (saleError) return { error: saleError };

    // Insertar items de la venta
    const saleItems = items.map((item) => ({
      ...item,
      sale_id: saleData.id,
    }));
    const { error: itemsError } = await supabase
      .from("sale_items")
      .insert(saleItems);
    if (itemsError) return { error: itemsError };

    // Actualizar stock por cada producto vendido
    for (const item of items) {
      await supabase.rpc("decrement_stock", {
        product_id: item.product_id,
        qty: item.quantity,
      });
    }

    setSales((prev) => [{ ...saleData, sale_items: saleItems }, ...prev]);
    return { data: saleData };
  }, []);

  return { sales, loading, addSale, fetchSales };
}
