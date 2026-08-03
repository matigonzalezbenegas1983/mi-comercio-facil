const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');
let changed = 0;

// 1. Fix deleteProvider (usa "provider" no "p")
const r1 = /setProviders\(providers\.filter\(\(provider\) => provider\.id !== id\)\);/;
if (r1.test(code)) {
  code = code.replace(r1, `supabase.from("providers").delete().eq("id", id).then(({ error }) => {
      if (!error) setProviders(prev => prev.filter((provider) => provider.id !== id));
      else alert("Error al eliminar proveedor: " + (error?.message || "desconocido"));
    });`);
  changed++;
  console.log('Fix 1: deleteProvider OK');
} else {
  console.log('Fix 1: no encontrado');
}

// 2. Fix useLocalState para providers en App principal
const r2 = /const \[providers, setProviders\] = useLocalState\("mcf_providers", initialProviders\);/;
if (r2.test(code)) {
  code = code.replace(r2, `const [providers, setProviders] = useState([]);`);
  changed++;
  console.log('Fix 2: useLocalState providers OK');
} else {
  console.log('Fix 2: no encontrado');
}

// 3. Ver qué hay en línea 893 (setSales)
const lines = code.split('\n');
const saleLines = lines.slice(888, 910).join('\n');
console.log('\nContenido cerca de setSales([):');
console.log(saleLines);

fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log(`\nTotal cambios: ${changed}/2`);
