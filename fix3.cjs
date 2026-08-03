const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

let changed = 0;

// 1. Fix provider_name mapping on read
const r1 = /supabase\.from\("products"\)\.select\("\*"\)\.order\("name"\)\.then\(\(\{ data \}\) => \{ if \(data\) setProducts\(data\); \}\);/;
if (r1.test(code)) {
  code = code.replace(r1, `supabase.from("products").select("*").order("name").then(({ data }) => { if (data) setProducts(data.map(p => ({...p, provider: p.provider_name || p.provider || ''}))); });`);
  changed++;
  console.log('Fix 1: lectura de productos OK');
} else {
  console.log('Fix 1: ya aplicado o texto no encontrado');
}

// 2. Fix addProduct to write to Supabase
const r2 = /setProducts\(\[\s*\{[\s\S]*?crypto\.randomUUID\(\)[\s\S]*?\},\s*\.\.\.products,\s*\]\);/;
if (r2.test(code)) {
  code = code.replace(r2, `const newProduct = {
      barcode: form.barcode ? form.barcode.trim() : '',
      name: form.name,
      stock: Number(form.stock || 0),
      cost: Number(form.cost || 0),
      price: Number(form.price || 0),
      provider_name: form.provider || "Sin proveedor",
    };
    supabase.from("products").insert([newProduct]).select().single().then(({ data, error }) => {
      if (!error && data) setProducts(prev => [{...data, provider: data.provider_name}, ...prev]);
      else alert("Error al guardar: " + (error?.message || "desconocido"));
    });`);
  changed++;
  console.log('Fix 2: escritura addProduct OK');
} else {
  console.log('Fix 2: ya aplicado o texto no encontrado');
}

// 3. Fix deleteProduct to delete from Supabase
const r3 = /function deleteProduct\(id\) \{\s*setProducts\(products\.filter\(\(product\) => product\.id !== id\)\);\s*\}/;
if (r3.test(code)) {
  code = code.replace(r3, `function deleteProduct(id) {
    supabase.from("products").delete().eq("id", id).then(({ error }) => {
      if (!error) setProducts(prev => prev.filter((product) => product.id !== id));
      else alert("Error al eliminar: " + (error?.message || "desconocido"));
    });
  }`);
  changed++;
  console.log('Fix 3: deleteProduct OK');
} else {
  console.log('Fix 3: ya aplicado o texto no encontrado');
}

fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log(`\nTotal cambios aplicados: ${changed}/3`);
