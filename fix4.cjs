const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');
let changed = 0;

// 1. Fix addProvider to write to Supabase
const r1 = /setProviders\(\[[\s\S]*?crypto\.randomUUID\(\)[\s\S]*?margin[\s\S]*?\},\s*\.\.\.providers,?\s*\]\);/;
if (r1.test(code)) {
  code = code.replace(r1, `const newProvider = {
      name: providerForm.name.trim(),
      margin: Number(providerForm.margin || 0),
    };
    supabase.from("providers").insert([newProvider]).select().single().then(({ data, error }) => {
      if (!error && data) setProviders(prev => [...prev, data]);
      else alert("Error al guardar proveedor: " + (error?.message || "desconocido"));
    });`);
  changed++;
  console.log('Fix 1: addProvider OK');
} else {
  console.log('Fix 1: no encontrado');
}

// 2. Fix deleteProvider to delete from Supabase
const r2 = /setProviders\(providers\.filter\(\(p\) => p\.id !== id\)\);/;
if (r2.test(code)) {
  code = code.replace(r2, `supabase.from("providers").delete().eq("id", id).then(({ error }) => {
      if (!error) setProviders(prev => prev.filter((p) => p.id !== id));
      else alert("Error al eliminar proveedor: " + (error?.message || "desconocido"));
    });`);
  changed++;
  console.log('Fix 2: deleteProvider OK');
} else {
  console.log('Fix 2: no encontrado');
}

// 3. Fix addSale to write to Supabase
const r3 = /setSales\(\[[\s\S]*?cart[\s\S]*?profit[\s\S]*?\},\s*\.\.\.sales,?\s*\]\);/;
if (r3.test(code)) {
  code = code.replace(r3, `const saleData = {
      total: cart.reduce((sum, item) => sum + item.price * item.qty, 0),
      profit: cart.reduce((sum, item) => sum + (item.price - item.cost) * item.qty, 0),
      items: cart,
    };
    supabase.from("sales").insert([saleData]).select().single().then(({ data, error }) => {
      if (!error && data) setSales(prev => [data, ...prev]);
      else alert("Error al guardar venta: " + (error?.message || "desconocido"));
    });`);
  changed++;
  console.log('Fix 3: addSale OK');
} else {
  console.log('Fix 3: no encontrado - revisar manualmente');
}

fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log(`\nTotal cambios: ${changed}/3`);
