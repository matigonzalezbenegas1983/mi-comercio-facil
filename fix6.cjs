const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const r1 = /setSales\(\[\s*\{\s*id: crypto\.randomUUID\(\),\s*productName: selectedProduct\.name,\s*quantity,\s*total,\s*cost,\s*profit,\s*date: new Date\(\)\.toISOString\(\),\s*\},\s*\.\.\.sales,\s*\]\);/;

if (r1.test(code)) {
  code = code.replace(r1, `const newSale = {
      product_name: selectedProduct.name,
      quantity,
      total,
      cost,
      profit,
      date: new Date().toISOString(),
    };
    supabase.from("sales").insert([newSale]).select().single().then(({ data, error }) => {
      if (!error && data) setSales(prev => [data, ...prev]);
      else alert("Error al guardar venta: " + (error?.message || "desconocido"));
    });`);
  console.log('Fix setSales OK');
} else {
  console.log('No encontrado - revisar manualmente');
}

fs.writeFileSync('src/App.jsx', code, 'utf8');
