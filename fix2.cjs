const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// Fix lectura: mapear provider_name a provider
code = code.replace(
  `supabase.from("products").select("*").order("name").then(({ data }) => { if (data) setProducts(data); });`,
  `supabase.from("products").select("*").order("name").then(({ data }) => { if (data) setProducts(data.map(p => ({...p, provider: p.provider_name || p.provider || ''}))); });`
);

// Fix addProduct: guardar en Supabase
code = code.replace(
  `setProducts([
      {
        id: crypto.randomUUID(),
        barcode: form.barcode.trim(),
        name: form.name,
        stock: Number(form.stock || 0),
        cost: Number(form.cost || 0),
        price: Number(form.price || 0),
        provider: form.provider || "Sin proveedor",
      },
      ...products,
    ]);`,
  `const newProduct = {
      barcode: form.barcode.trim(),
      name: form.name,
      stock: Number(form.stock || 0),
      cost: Number(form.cost || 0),
      price: Number(form.price || 0),
      provider_name: form.provider || "Sin proveedor",
    };
    supabase.from("products").insert([newProduct]).select().single().then(({ data, error }) => {
      if (!error && data) setProducts(prev => [{...data, provider: data.provider_name}, ...prev]);
      else alert("Error al guardar: " + (error?.message || ""));
    });`
);

// Fix deleteProduct: borrar en Supabase
code = code.replace(
  `setProducts(products.filter((product) => product.id !== id));`,
  `supabase.from("products").delete().eq("id", id).then(({ error }) => {
    if (!error) setProducts(products.filter((product) => product.id !== id));
    else alert("Error al eliminar: " + (error?.message || ""));
  });`
);

fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log('Listo');
