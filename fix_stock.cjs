const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const oldStock = `const newStock = Number(foundProduct.stock || 0) + Number(stockQuantity);
    setProducts(
      products.map((product) =>
        product.id === foundProduct.id
          ? {
              ...product,
              stock: newStock,
            }
          : product
      )
    );
    setFoundProduct({
      ...foundProduct,
      stock: newStock,
    });`;

const newStock = `const newStock = Number(foundProduct.stock || 0) + Number(stockQuantity);
    supabase.from("products").update({ stock: newStock }).eq("id", foundProduct.id).then(({ error }) => {
      if (!error) {
        setProducts(products.map((product) =>
          product.id === foundProduct.id ? { ...product, stock: newStock } : product
        ));
        setFoundProduct({ ...foundProduct, stock: newStock });
      } else {
        alert("Error al actualizar stock: " + (error?.message || "desconocido"));
      }
    });`;

if (code.includes(oldStock)) {
  code = code.replace(oldStock, newStock);
  console.log('Fix addStock: OK');
} else {
  console.log('No encontrado - verificar manualmente');
}

fs.writeFileSync('src/App.jsx', code, 'utf8');
