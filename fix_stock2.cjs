const fs = require('fs');
const content = fs.readFileSync('src/App.jsx', 'utf8');

const lines = content.split('\n');
let result = [];
let i = 0;

while (i < lines.length) {
  if (lines[i].includes('const newStock = Number(foundProduct.stock || 0) + Number(stockQuantity);')) {
    result.push(lines[i]); // const newStock = ...
    i++;
    // skip setProducts block until setFoundProduct closes
    while (i < lines.length && !lines[i].includes('setFoundProduct({')) {
      i++;
    }
    // skip setFoundProduct block
    while (i < lines.length && !lines[i].trim().startsWith('});')) {
      i++;
    }
    i++; // skip closing });
    
    // insert Supabase update
    result.push(`    supabase.from("products").update({ stock: newStock }).eq("id", foundProduct.id).then(({ error }) => {`);
    result.push(`      if (!error) {`);
    result.push(`        setProducts(products.map((p) => p.id === foundProduct.id ? { ...p, stock: newStock } : p));`);
    result.push(`        setFoundProduct({ ...foundProduct, stock: newStock });`);
    result.push(`      }`);
    result.push(`    });`);
  } else {
    result.push(lines[i]);
    i++;
  }
}

fs.writeFileSync('src/App.jsx', result.join('\n'), 'utf8');
console.log('Listo');
