import { useCallback, useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { supabase } from "./lib/supabase";
import {
  Store,
  Package,
  Truck,
  Upload,
  ShoppingCart,
  Wallet,
  Settings,
  Plus,
  Trash2,
  Camera,
  Search,
} from "lucide-react";
import "./index.css";


const initialProviders = [
  { id: crypto.randomUUID(), name: "Distribuidora Norte", margin: 35 },
  { id: crypto.randomUUID(), name: "Molinos Centro", margin: 30 },
];

const initialProducts = [
  {
    id: crypto.randomUUID(),
    barcode: "7790895000997",
    name: "Coca Cola 2L",
    stock: 4,
    cost: 2300,
    price: 3105,
    provider: "Distribuidora Norte",
  },
  {
    id: crypto.randomUUID(),
    barcode: "7791234567890",
    name: "Harina 000",
    stock: 18,
    cost: 820,
    price: 1066,
    provider: "Molinos Centro",
  },
];

function useLocalState(key, initialValue) {
  const [value, setValue] = useState(() => {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

function money(value) {
  return `$${Number(value || 0).toLocaleString("es-AR")}`;
}

function toNumber(value) {
  if (typeof value === "number") return value;

  return Number(
    String(value || "")
      .replace(/\$/g, "")
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
  );
}

function applyMargin(cost, margin) {
  return Math.round(Number(cost || 0) * (1 + Number(margin || 0) / 100));
}

function Card({ title, value, note, type }) {
  return (
    <div className={`card ${type || ""}`}>
      <p>{title}</p>
      <h2>{value}</h2>
      <span>{note}</span>
    </div>
  );
}

function ScannerModal({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const reader = new BrowserMultiFormatReader();

    async function startScanner() {
      try {
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (!result || !active) return;

            const code = result.getText();

            if (code) {
              active = false;
              controlsRef.current?.stop();
              onDetected(code);
            }
          }
        );

        controlsRef.current = controls;
      } catch {
        setError("No se pudo abrir la cÃ¡mara. RevisÃ¡ los permisos del navegador.");
      }
    }

    startScanner();

    return () => {
      active = false;
      controlsRef.current?.stop();
    };
  }, [onDetected]);

  return (
    <div className="scanner-modal">
      <div className="scanner-box">
        <div className="panel-header">
          <h3>Escanear cÃ³digo</h3>
          <button onClick={onClose}>Cerrar</button>
        </div>

        <video ref={videoRef} className="scanner-video" muted playsInline />

        {error && <p className="error-message">{error}</p>}

        <p className="helper-text">
          ApuntÃ¡ la cÃ¡mara al cÃ³digo de barras. Cuando lo detecte, lo buscarÃ¡ automÃ¡ticamente.
        </p>
      </div>
    </div>
  );
}

function Inicio({ setCurrentPage, products, sales }) {
  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
  const profit = sales.reduce((sum, sale) => sum + sale.profit, 0);
  const lowStock = products.filter((product) => product.stock <= 5);

  return (
    <>
      <section className="home-hero">
        <div>
          <span className="status-pill">Negocio simple y ordenado</span>
          <h2>Hola, MatÃ­as</h2>
          <p>VendÃ©, revisÃ¡ stock e importÃ¡ listas sin planillas ni vueltas.</p>

          <div className="hero-actions">
            <button className="big-action primary" onClick={() => setCurrentPage("Ventas")}>
              <ShoppingCart size={20} />
              Vender ahora
            </button>

            <button className="big-action secondary" onClick={() => setCurrentPage("Importar")}>
              <Upload size={20} />
              Importar lista
            </button>
          </div>
        </div>

        <div className="today-card">
          <p>Ganancia estimada</p>
          <strong>{money(profit)}</strong>
          <span>Calculada segÃºn costo y venta</span>
        </div>
      </section>

      <section className="quick-dashboard">
        <button className="metric-tile" onClick={() => setCurrentPage("Ventas")}>
          <span>Ventas</span>
          <strong>{money(totalSales)}</strong>
          <small>{sales.length} operaciones</small>
        </button>

        <button className="metric-tile" onClick={() => setCurrentPage("Caja")}>
          <span>Caja</span>
          <strong>{money(totalSales)}</strong>
          <small>Actualizada</small>
        </button>

        <button className="metric-tile danger" onClick={() => setCurrentPage("Productos")}>
          <span>Stock bajo</span>
          <strong>{lowStock.length}</strong>
          <small>Reponer pronto</small>
        </button>

        <button className="metric-tile" onClick={() => setCurrentPage("Productos")}>
          <span>Productos</span>
          <strong>{products.length}</strong>
          <small>Cargados</small>
        </button>
      </section>

      <section className="home-grid-soft">
        <div className="soft-panel">
          <div className="soft-header">
            <h3>QuÃ© hacer hoy</h3>
          </div>

          <div className="todo-cards">
            <button onClick={() => setCurrentPage("Productos")}>
              <strong>Reponer stock</strong>
              <span>{lowStock.length} productos necesitan atenciÃ³n</span>
            </button>

            <button onClick={() => setCurrentPage("Importar")}>
              <strong>Actualizar precios</strong>
              <span>ImportÃ¡ la lista del proveedor</span>
            </button>

            <button onClick={() => setCurrentPage("Caja")}>
              <strong>Revisar caja</strong>
              <span>{money(totalSales)} vendidos hasta ahora</span>
            </button>
          </div>
        </div>

        <div className="soft-panel">
          <div className="soft-header">
            <h3>Accesos rÃ¡pidos</h3>
          </div>

          <div className="shortcut-grid">
            <button onClick={() => setCurrentPage("Ventas")}>
              <ShoppingCart size={24} />
              Venta
            </button>

            <button onClick={() => setCurrentPage("Productos")}>
              <Package size={24} />
              Producto
            </button>

            <button onClick={() => setCurrentPage("Importar")}>
              <Upload size={24} />
              Lista
            </button>

            <button onClick={() => setCurrentPage("Caja")}>
              <Wallet size={24} />
              Caja
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

function Productos({ products, setProducts }) {
  const [form, setForm] = useState({
    barcode: "",
    name: "",
    stock: "",
    cost: "",
    price: "",
    provider: "",
  });

  const [stockCode, setStockCode] = useState("");
  const [stockQuantity, setStockQuantity] = useState(1);
  const [foundProduct, setFoundProduct] = useState(null);
  const [stockScannerOpen, setStockScannerOpen] = useState(false);
  const [stockMessage, setStockMessage] = useState("");

  useEffect(() => {
    const pendingBarcode = localStorage.getItem("mcf_pending_barcode");

    if (pendingBarcode) {
      setForm((prev) => ({ ...prev, barcode: pendingBarcode }));
      localStorage.removeItem("mcf_pending_barcode");
    }
  }, []);

  function addProduct(event) {
    event.preventDefault();

    if (!form.name || !form.price) {
      alert("CompletÃ¡ nombre y precio de venta.");
      return;
    }

    const exists = products.some(
      (product) =>
        form.barcode &&
        String(product.barcode || "").trim() === String(form.barcode).trim()
    );

    if (exists) {
      alert("Ya existe un producto con ese cÃ³digo de barras.");
      return;
    }

    const newProduct = {
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
    });

    setForm({
      barcode: "",
      name: "",
      stock: "",
      cost: "",
      price: "",
      provider: "",
    });
  }

  function deleteProduct(id) {
    supabase.from("products").delete().eq("id", id).then(({ error }) => {
    if (!error) setProducts(products.filter((product) => product.id !== id));
    else alert("Error al eliminar: " + (error?.message || ""));
  });
  }

  const findStockProduct = useCallback(
    (code) => {
      const cleanCode = String(code || "").trim();

      if (!cleanCode) {
        alert("IngresÃ¡ o escaneÃ¡ un cÃ³digo.");
        return;
      }

      setStockCode(cleanCode);

      const product = products.find(
        (item) => String(item.barcode || "").trim() === cleanCode
      );

      if (product) {
        setFoundProduct(product);
        setStockMessage(`Producto encontrado: ${product.name}`);
        return;
      }

      setFoundProduct(null);
      setStockMessage("");

      const createNow = confirm(
        `El cÃ³digo ${cleanCode} no estÃ¡ cargado. Â¿QuerÃ©s crear el producto con este cÃ³digo?`
      );

      if (createNow) {
        setForm((prev) => ({
          ...prev,
          barcode: cleanCode,
        }));
      }
    },
    [products]
  );

  const handleStockDetected = useCallback(
    (code) => {
      setStockScannerOpen(false);
      findStockProduct(code);
    },
    [findStockProduct]
  );

  function addStock() {
    if (!foundProduct) {
      alert("Primero buscÃ¡ o escaneÃ¡ un producto.");
      return;
    }

    if (Number(stockQuantity) <= 0) {
      alert("La cantidad debe ser mayor a cero.");
      return;
    }

    const newStock = Number(foundProduct.stock || 0) + Number(stockQuantity);

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
    });

    setStockMessage(
      `Stock actualizado: ${foundProduct.name} sumÃ³ ${stockQuantity} unidades.`
    );

    setStockQuantity(1);
  }

  return (
    <>
      {stockScannerOpen && (
        <ScannerModal
          onDetected={handleStockDetected}
          onClose={() => setStockScannerOpen(false)}
        />
      )}

      <section className="screen-grid">
        <div className="panel">
          <div className="panel-header">
            <h3>Productos</h3>
            <span>{products.length} cargados</span>
          </div>

          <div className="product-list">
            {products.map((product) => (
              <div className="product-item" key={product.id}>
                <div>
                  <h4>{product.name}</h4>
                  <p>{product.provider}</p>
                  <p>CÃ³digo: {product.barcode || "Sin cÃ³digo"}</p>
                  <p>Costo: {money(product.cost)}</p>
                </div>

                <div className="product-values">
                  <span>Stock: {product.stock}</span>
                  <strong>{money(product.price)}</strong>

                  <button
                    type="button"
                    className="small-danger"
                    onClick={() => deleteProduct(product.id)}
                  >
                    <Trash2 size={14} />
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="right-column">
          <div className="panel form-panel stock-loader">
            <h3>Cargar stock con lector</h3>

            <p className="helper-text">
              EscaneÃ¡ el cÃ³digo, indicÃ¡ la cantidad y sumalo al stock.
            </p>

            <div className="barcode-box">
              <div className="barcode-search">
                <input
                  placeholder="EscaneÃ¡ o escribÃ­ el cÃ³digo"
                  value={stockCode}
                  onChange={(e) => setStockCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      findStockProduct(stockCode);
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={() => findStockProduct(stockCode)}
                >
                  <Search size={18} />
                </button>
              </div>

              <button
                type="button"
                className="camera-button"
                onClick={() => setStockScannerOpen(true)}
              >
                <Camera size={18} />
                Escanear con cÃ¡mara
              </button>
            </div>

            {foundProduct && (
              <div className="found-product-card">
                <span>Producto encontrado</span>
                <strong>{foundProduct.name}</strong>
                <small>Stock actual: {foundProduct.stock}</small>
              </div>
            )}

            <input
              type="number"
              min="1"
              placeholder="Cantidad a sumar"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(Number(e.target.value))}
            />

            <button
              type="button"
              className="primary-button"
              onClick={addStock}
            >
              <Plus size={18} />
              Sumar al stock
            </button>

            {stockMessage && <p className="success-message">{stockMessage}</p>}
          </div>

          <form className="panel form-panel" onSubmit={addProduct}>
            <h3>Nuevo producto</h3>

            <input
              placeholder="CÃ³digo de barras"
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
            />

            <input
              placeholder="Nombre"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />

            <input
              placeholder="Proveedor"
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value })}
            />

            <input
              type="number"
              placeholder="Stock"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
            />

            <input
              type="number"
              placeholder="Costo"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
            />

            <input
              type="number"
              placeholder="Precio de venta"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />

            <button className="primary-button" type="submit">
              <Plus size={18} />
              Guardar producto
            </button>
          </form>
        </div>
      </section>
    </>
  );
}

function Proveedores({ providers, setProviders }) {
  const [form, setForm] = useState({ name: "", margin: "" });

  function addProvider(event) {
    event.preventDefault();

    if (!form.name) {
      alert("IngresÃ¡ el nombre del proveedor.");
      return;
    }

    const newProvider = {
      name: form.name.trim(),
      margin: Number(form.margin || 0),
    };
    supabase.from("providers").insert([newProvider]).select().single().then(({ data, error }) => {
      if (!error && data) setProviders(prev => [...prev, data]);
      else alert("Error al guardar proveedor: " + (error?.message || "desconocido"));
    });

    setForm({ name: "", margin: "" });
  }

  function deleteProvider(id) {
    supabase.from("providers").delete().eq("id", id).then(({ error }) => {
      if (!error) setProviders(prev => prev.filter((provider) => provider.id !== id));
      else alert("Error al eliminar proveedor: " + (error?.message || "desconocido"));
    });
  }

  return (
    <section className="screen-grid">
      <div className="panel">
        <div className="panel-header">
          <h3>Proveedores</h3>
          <span>{providers.length} cargados</span>
        </div>

        <div className="product-list">
          {providers.map((provider) => (
            <div className="product-item" key={provider.id}>
              <div>
                <h4>{provider.name}</h4>
                <p>Margen aplicado: {provider.margin}%</p>
              </div>

              <button className="small-danger" onClick={() => deleteProvider(provider.id)}>
                <Trash2 size={14} />
                Eliminar
              </button>
            </div>
          ))}
        </div>
      </div>

      <form className="panel form-panel" onSubmit={addProvider}>
        <h3>Nuevo proveedor</h3>

        <input
          placeholder="Nombre del proveedor"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <input
          type="number"
          placeholder="Margen de ganancia %"
          value={form.margin}
          onChange={(e) => setForm({ ...form, margin: e.target.value })}
        />

        <button className="primary-button" type="submit">
          <Plus size={18} />
          Guardar proveedor
        </button>
      </form>
    </section>
  );
}

function Importar({ providers, products, setProducts }) {
  const [selectedProvider, setSelectedProvider] = useState(providers[0]?.name || "");
  const [preview, setPreview] = useState([]);
  const [message, setMessage] = useState("");

  const providerMargin =
    providers.find((provider) => provider.name === selectedProvider)?.margin || 30;

  function normalizeRow(row) {
    const barcode =
      row.codigo ||
      row.Codigo ||
      row["cÃ³digo"] ||
      row["CÃ³digo"] ||
      row.barcode ||
      row.Barcode ||
      row.ean ||
      row.EAN ||
      row.cod ||
      row.COD ||
      "";

    const name =
      row.nombre ||
      row.Nombre ||
      row.producto ||
      row.Producto ||
      row.descripcion ||
      row.Descripcion ||
      row.DESCRIPCION;

    const stock = row.stock || row.Stock || row.cantidad || row.Cantidad || 0;
    const cost = row.costo || row.Costo || row.precio_compra || row.compra || row.Compra || 0;
    const provider = row.proveedor || row.Proveedor || selectedProvider;

    return {
      id: crypto.randomUUID(),
      barcode: String(barcode || "").trim(),
      name: String(name || "Producto sin nombre").trim(),
      stock: toNumber(stock),
      cost: toNumber(cost),
      provider: String(provider || selectedProvider).trim(),
      price: applyMargin(toNumber(cost), providerMargin),
    };
  }

  async function handleFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const cleanRows = rows.map(normalizeRow).filter((item) => item.name);

    setPreview(cleanRows);
    setMessage(`Se detectaron ${cleanRows.length} productos para importar.`);
  }

  function confirmImport() {
    if (preview.length === 0) {
      alert("Primero cargÃ¡ un archivo.");
      return;
    }

    const updatedProducts = [...products];

    preview.forEach((item) => {
      const existingIndex = updatedProducts.findIndex((product) => {
        const sameBarcode =
          item.barcode &&
          product.barcode &&
          String(product.barcode).trim() === String(item.barcode).trim();

        const sameNameAndProvider =
          product.name.toLowerCase() === item.name.toLowerCase() &&
          product.provider.toLowerCase() === item.provider.toLowerCase();

        return sameBarcode || sameNameAndProvider;
      });

      if (existingIndex >= 0) {
        updatedProducts[existingIndex] = {
          ...updatedProducts[existingIndex],
          barcode: item.barcode || updatedProducts[existingIndex].barcode,
          stock: updatedProducts[existingIndex].stock + item.stock,
          cost: item.cost,
          price: item.price,
          provider: item.provider,
        };
      } else {
        updatedProducts.unshift(item);
      }
    });

    setProducts(updatedProducts);
    setPreview([]);
    setMessage("Lista importada correctamente. Stock y precios actualizados.");
  }

  return (
    <section className="screen-grid">
      <div className="panel form-panel">
        <h3>Importar lista</h3>
        <p className="helper-text">
          SubÃ­ un Excel o CSV con columnas: codigo, nombre, stock, costo.
        </p>

        <select value={selectedProvider} onChange={(e) => setSelectedProvider(e.target.value)}>
          {providers.map((provider) => (
            <option key={provider.id} value={provider.name}>
              {provider.name} â€” margen {provider.margin}%
            </option>
          ))}
        </select>

        <label className="upload-box">
          <Upload size={26} />
          <strong>Elegir archivo</strong>
          <span>Excel o CSV</span>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} />
        </label>

        {message && <p className="success-message">{message}</p>}

        <button className="primary-button" onClick={confirmImport}>
          Importar productos
        </button>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>Vista previa</h3>
          <span>{preview.length} productos</span>
        </div>

        <div className="product-list">
          {preview.slice(0, 8).map((item) => (
            <div className="product-item" key={item.id}>
              <div>
                <h4>{item.name}</h4>
                <p>CÃ³digo: {item.barcode || "Sin cÃ³digo"}</p>
                <p>{item.provider}</p>
                <p>Costo: {money(item.cost)}</p>
              </div>

              <div className="product-values">
                <span>Stock: {item.stock}</span>
                <strong>{money(item.price)}</strong>
              </div>
            </div>
          ))}

          {preview.length === 0 && (
            <p className="helper-text">TodavÃ­a no cargaste ningÃºn archivo.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function Ventas({ products, setProducts, sales, setSales, setCurrentPage }) {
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [quantity, setQuantity] = useState(1);
  const [barcodeSearch, setBarcodeSearch] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);

  const selectedProduct = products.find((product) => product.id === productId);

  const findByBarcode = useCallback(
    (code) => {
      const cleanCode = String(code || "").trim();
      setBarcodeSearch(cleanCode);

      const foundProduct = products.find(
        (product) => String(product.barcode || "").trim() === cleanCode
      );

      if (foundProduct) {
        setProductId(foundProduct.id);
        alert(`Producto encontrado: ${foundProduct.name}`);
        return;
      }

      const shouldCreate = confirm(
        `El cÃ³digo ${cleanCode} no estÃ¡ cargado. Â¿QuerÃ©s crear este producto ahora?`
      );

      if (shouldCreate) {
        localStorage.setItem("mcf_pending_barcode", cleanCode);
        setCurrentPage("Productos");
      }
    },
    [products, setCurrentPage]
  );

  const handleDetected = useCallback(
    (code) => {
      setScannerOpen(false);
      findByBarcode(code);
    },
    [findByBarcode]
  );

  function searchBarcode(event) {
    event.preventDefault();
    findByBarcode(barcodeSearch);
  }

  function chargeSale(event) {
    event.preventDefault();

    if (!selectedProduct) {
      alert("ElegÃ­ un producto.");
      return;
    }

    if (selectedProduct.stock < quantity) {
      alert("No hay stock suficiente.");
      return;
    }

    const total = selectedProduct.price * quantity;
    const cost = selectedProduct.cost * quantity;
    const profit = total - cost;

    const newSale = {
      product_name: selectedProduct.name,
      quantity,
      total,
      cost,
      profit,
      
    };
    supabase.from("sales").insert([newSale]).select().single().then(({ data, error }) => {
      if (!error && data) setSales(prev => [data, ...prev]);
      else alert("Error al guardar venta: " + (error?.message || "desconocido"));
    });

    setProducts(
      products.map((product) =>
        product.id === selectedProduct.id
          ? { ...product, stock: product.stock - quantity }
          : product
      )
    );

    setQuantity(1);
    alert(`Venta registrada por ${money(total)}`);
  }

  return (
    <>
      {scannerOpen && (
        <ScannerModal onDetected={handleDetected} onClose={() => setScannerOpen(false)} />
      )}

      <section className="screen-grid">
        <form className="panel form-panel" onSubmit={chargeSale}>
          <h3>Nueva venta</h3>

          <div className="barcode-box">
            <form className="barcode-search" onSubmit={searchBarcode}>
              <input
                placeholder="EscaneÃ¡ o escribÃ­ el cÃ³digo"
                value={barcodeSearch}
                onChange={(e) => setBarcodeSearch(e.target.value)}
              />

              <button type="submit">
                <Search size={18} />
              </button>
            </form>

            <button
              type="button"
              className="camera-button"
              onClick={() => setScannerOpen(true)}
            >
              <Camera size={18} />
              Escanear con cÃ¡mara
            </button>
          </div>

          <select value={productId} onChange={(e) => setProductId(e.target.value)}>
            {products.map((product) => (
              <option value={product.id} key={product.id}>
                {product.name} â€” stock {product.stock} â€” {money(product.price)}
              </option>
            ))}
          </select>

          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />

          <button className="primary-button" type="submit">
            <ShoppingCart size={18} />
            Cobrar venta
          </button>
        </form>

        <div className="panel">
          <div className="panel-header">
            <h3>Ãšltimas ventas</h3>
            <span>{sales.length} ventas</span>
          </div>

          <div className="product-list">
            {sales.map((sale) => (
              <div className="product-item" key={sale.id}>
                <div>
                  <h4>{sale.productName}</h4>
                  <p>Cantidad: {sale.quantity}</p>
                </div>

                <div className="product-values">
                  <strong>{money(sale.total)}</strong>
                  <span>Ganancia: {money(sale.profit)}</span>
                </div>
              </div>
            ))}

            {sales.length === 0 && <p className="helper-text">TodavÃ­a no hay ventas.</p>}
          </div>
        </div>
      </section>
    </>
  );
}

function Caja({ sales }) {
  const total = sales.reduce((sum, sale) => sum + sale.total, 0);
  const cost = sales.reduce((sum, sale) => sum + sale.cost, 0);
  const profit = sales.reduce((sum, sale) => sum + sale.profit, 0);

  return (
    <section className="summary-grid">
      <Card title="Caja actual" value={money(total)} note="Ventas registradas" type="green" />
      <Card title="Costo vendido" value={money(cost)} note="MercaderÃ­a vendida" type="red" />
      <Card title="Ganancia" value={money(profit)} note="EstimaciÃ³n automÃ¡tica" type="yellow" />
      <Card title="Ventas" value={sales.length} note="Operaciones" type="blue" />
    </section>
  );
}

function Configuracion() {
  return (
    <section className="panel">
      <div className="panel-header">
        <h3>ConfiguraciÃ³n</h3>
      </div>

      <div className="task-list">
        <div className="task-item">
          <span>1</span>
          <p>Nombre: Mi Comercio FÃ¡cil</p>
        </div>

        <div className="task-item">
          <span>2</span>
          <p>TipografÃ­a: Poppins</p>
        </div>

        <div className="task-item">
          <span>3</span>
          <p>DiseÃ±o simple, grÃ¡fico y responsive</p>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [currentPage, setCurrentPage] = useState("Inicio");
  const [products, setProducts] = useLocalState("mcf_products", initialProducts);
  const [providers, setProviders] = useState([]);
  const [sales, setSales] = useLocalState("mcf_sales", []);

  const menuItems = [
    { name: "Inicio", icon: Store },
    { name: "Productos", icon: Package },
    { name: "Proveedores", icon: Truck },
    { name: "Importar", icon: Upload },
    { name: "Ventas", icon: ShoppingCart },
    { name: "Caja", icon: Wallet },
    { name: "ConfiguraciÃ³n", icon: Settings },
  ];

  function renderPage() {
    if (currentPage === "Inicio") {
      return <Inicio setCurrentPage={setCurrentPage} products={products} sales={sales} />;
    }

    if (currentPage === "Productos") {
      return <Productos products={products} setProducts={setProducts} />;
    }

    if (currentPage === "Proveedores") {
      return <Proveedores providers={providers} setProviders={setProviders} />;
    }

    if (currentPage === "Importar") {
      return (
        <Importar providers={providers} products={products} setProducts={setProducts} />
      );
    }

    if (currentPage === "Ventas") {
      return (
        <Ventas
          products={products}
          setProducts={setProducts}
          sales={sales}
          setSales={setSales}
          setCurrentPage={setCurrentPage}
        />
      );
    }

    if (currentPage === "Caja") {
      return <Caja sales={sales} />;
    }

    return <Configuracion />;
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">
            <Store size={24} />
          </div>

          <div>
            <h1>Mi Comercio FÃ¡cil</h1>
            <p>Control simple para comercios</p>
          </div>
        </div>

        <nav>
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                className={currentPage === item.name ? "active" : ""}
                onClick={() => setCurrentPage(item.name)}
              >
                <Icon size={18} />
                {item.name}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="main">{renderPage()}</main>
    </div>
  );
}
