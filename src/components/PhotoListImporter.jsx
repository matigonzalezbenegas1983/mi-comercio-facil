import { useEffect, useState } from "react";
import Tesseract from "tesseract.js";
import { supabase } from "../lib/supabase";

function moneyToNumber(value) {
  let s = String(value || "")
    .replace(/\s/g, "")
    .replace("$", "")
    .replace(/[^\d,.-]/g, "");

  if (!s) return 0;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    const parts = s.split(",");
    const last = parts[parts.length - 1];

    if (last.length === 3 && parts.length > 1) {
      s = parts.join("");
    } else {
      s = s.replace(",", ".");
    }
  } else if (hasDot) {
    const parts = s.split(".");
    const last = parts[parts.length - 1];

    if (last.length === 3 && parts.length > 1) {
      s = parts.join("");
    }
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function cleanProductName(value) {
  return String(value || "")
    .replace(/\$/g, " ")
    .replace(/[|;:_]+/g, " ")
    .replace(/[-–—]+/g, " ")
    .replace(/\b(cod|codigo|código|precio|unidad|unitario|total)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function makeTempId() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `tmp-${Date.now()}-${Math.random()}`;
}

function parseSupplierList(rawText, margin = 30) {
  const lines = String(rawText || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const rows = [];

  for (const originalLine of lines) {
    const line = originalLine
      .replace(/[|;]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const lower = line.toLowerCase();

    const isHeader =
      lower.includes("producto") ||
      lower.includes("descripcion") ||
      lower.includes("descripción") ||
      lower.includes("precio") ||
      lower.includes("lista") ||
      lower.includes("proveedor") ||
      lower.includes("fecha");

    const hasNumber = /\d/.test(line);

    if (isHeader && !hasNumber) continue;

    const barcodeMatch = line.match(/\b\d{6,14}\b/);
    const barcode = barcodeMatch ? barcodeMatch[0] : "";

    const numberTokens = [];
    const regex = /(?:\$ ?)?\d[\d.,]*/g;
    let match;

    while ((match = regex.exec(line)) !== null) {
      numberTokens.push({
        text: match[0],
        index: match.index,
        value: moneyToNumber(match[0]),
      });
    }

    const priceCandidates = numberTokens.filter((token) => {
      const onlyDigits = token.text.replace(/\D/g, "");
      return token.value > 0 && onlyDigits !== barcode;
    });

    if (!priceCandidates.length) continue;

    const priceToken = priceCandidates[priceCandidates.length - 1];
    const cost = roundMoney(priceToken.value);

    let nameRaw =
      line.slice(0, priceToken.index) +
      " " +
      line.slice(priceToken.index + priceToken.text.length);

    if (barcode) {
      nameRaw = nameRaw.replace(barcode, " ");
    }

    const name = cleanProductName(nameRaw);

    if (!name || name.length < 2 || cost <= 0) continue;

    rows.push({
      tempId: makeTempId(),
      include: true,
      barcode,
      name,
      cost,
      price: roundMoney(cost * (1 + Number(margin || 0) / 100)),
      stock: 0,
      originalLine,
    });
  }

  return rows;
}

export default function PhotoListImporter() {
  const [providers, setProviders] = useState([]);
  const [providerId, setProviderId] = useState("");
  const [newProviderName, setNewProviderName] = useState("");
  const [defaultMargin, setDefaultMargin] = useState(30);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [rows, setRows] = useState([]);

  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [updateStock, setUpdateStock] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadProviders();
  }, []);

  async function loadProviders() {
    const { data, error } = await supabase
      .from("providers")
      .select("*")
      .order("name", { ascending: true });

    if (!error) {
      setProviders(data || []);
    }
  }

  function handleProviderChange(value) {
    setProviderId(value);

    const selected = providers.find((provider) => provider.id === value);

    if (selected && selected.margin !== null && selected.margin !== undefined) {
      setDefaultMargin(Number(selected.margin) || 0);
      recalculatePrices(Number(selected.margin) || 0);
    }
  }

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setOcrText("");
    setRows([]);
    setMessage("");
    setProgress(0);
  }

  async function readImage() {
    if (!file) {
      setMessage("Primero sacá una foto o subí una imagen.");
      return;
    }

    setReading(true);
    setProgress(0);
    setMessage("Leyendo la imagen. Puede tardar unos segundos...");

    try {
      const result = await Tesseract.recognize(file, "spa+eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const text = result?.data?.text || "";
      setOcrText(text);

      const parsedRows = parseSupplierList(text, defaultMargin);
      setRows(parsedRows);

      if (parsedRows.length) {
        setMessage(`Se detectaron ${parsedRows.length} posibles productos. Revisá antes de guardar.`);
      } else {
        setMessage("No se detectaron productos claros. Probá con una foto más derecha y con mejor luz.");
      }
    } catch (error) {
      console.error(error);
      setMessage("No se pudo leer la imagen. Probá con otra foto más nítida.");
    } finally {
      setReading(false);
    }
  }

  function parseTextAgain() {
    const parsedRows = parseSupplierList(ocrText, defaultMargin);
    setRows(parsedRows);
    setMessage(`Se prepararon ${parsedRows.length} filas para revisar.`);
  }

  function recalculatePrices(marginValue = defaultMargin) {
    setRows((currentRows) =>
      currentRows.map((row) => ({
        ...row,
        price: roundMoney(Number(row.cost || 0) * (1 + Number(marginValue || 0) / 100)),
      }))
    );
  }

  function updateRow(tempId, field, value) {
    setRows((currentRows) =>
      currentRows.map((row) => {
        if (row.tempId !== tempId) return row;

        const updatedRow = {
          ...row,
          [field]: value,
        };

        if (field === "cost") {
          const cost = moneyToNumber(value);
          updatedRow.cost = cost;
          updatedRow.price = roundMoney(cost * (1 + Number(defaultMargin || 0) / 100));
        }

        if (field === "price") {
          updatedRow.price = moneyToNumber(value);
        }

        if (field === "stock") {
          updatedRow.stock = moneyToNumber(value);
        }

        return updatedRow;
      })
    );
  }

  function removeRow(tempId) {
    setRows((currentRows) => currentRows.filter((row) => row.tempId !== tempId));
  }

  function addEmptyRow() {
    setRows((currentRows) => [
      ...currentRows,
      {
        tempId: makeTempId(),
        include: true,
        barcode: "",
        name: "",
        cost: 0,
        price: 0,
        stock: 0,
        originalLine: "",
      },
    ]);
  }

  async function ensureProvider() {
    if (providerId) {
      const selected = providers.find((provider) => provider.id === providerId);

      if (selected) return selected;
    }

    const cleanName = newProviderName.trim();

    if (!cleanName) {
      throw new Error("Elegí un proveedor o escribí el nombre del proveedor nuevo.");
    }

    const { data, error } = await supabase
      .from("providers")
      .insert({
        name: cleanName,
        margin: Number(defaultMargin) || 0,
      })
      .select("*")
      .single();

    if (error) throw error;

    setProviders((currentProviders) => [...currentProviders, data]);
    setProviderId(data.id);

    return data;
  }

  async function findExistingProduct(row, providerIdToUse) {
    if (row.barcode) {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("barcode", row.barcode)
        .limit(1);

      if (error) throw error;
      if (data && data.length) return data[0];
    }

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("provider_id", providerIdToUse)
      .ilike("name", row.name.trim())
      .limit(1);

    if (error) throw error;
    if (data && data.length) return data[0];

    return null;
  }

  async function saveRows() {
    const selectedRows = rows.filter((row) => row.include);

    if (!selectedRows.length) {
      setMessage("No hay productos seleccionados para guardar.");
      return;
    }

    setSaving(true);
    setMessage("Guardando productos...");

    try {
      const provider = await ensureProvider();

      let created = 0;
      let updated = 0;
      let skipped = 0;

      for (const row of selectedRows) {
        const cleanName = String(row.name || "").trim();
        const cleanCost = roundMoney(row.cost);
        const cleanPrice = roundMoney(row.price);

        if (!cleanName || cleanCost <= 0) {
          skipped++;
          continue;
        }

        const existingProduct = await findExistingProduct(row, provider.id);

        if (existingProduct) {
          const updatePayload = {
            barcode: row.barcode || existingProduct.barcode || null,
            name: cleanName,
            provider_id: provider.id,
            provider_name: provider.name,
            cost: cleanCost,
            price: cleanPrice,
          };

          if (updateStock) {
            updatePayload.stock = Number(row.stock) || 0;
          }

          const { error } = await supabase
            .from("products")
            .update(updatePayload)
            .eq("id", existingProduct.id);

          if (error) throw error;

          updated++;
        } else {
          const insertPayload = {
            barcode: row.barcode || null,
            name: cleanName,
            provider_id: provider.id,
            provider_name: provider.name,
            stock: Number(row.stock) || 0,
            cost: cleanCost,
            price: cleanPrice,
          };

          const { error } = await supabase.from("products").insert(insertPayload);

          if (error) throw error;

          created++;
        }
      }

      setMessage(`Listo. Nuevos: ${created}. Actualizados: ${updated}. Omitidos: ${skipped}.`);
    } catch (error) {
      console.error(error);
      setMessage(error.message || "No se pudieron guardar los productos.");
    } finally {
      setSaving(false);
    }
  }

  const cardStyle = {
    border: "1px solid #e5e7eb",
    borderRadius: 18,
    padding: 18,
    background: "#ffffff",
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
    marginTop: 18,
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid #d1d5db",
    borderRadius: 12,
    fontSize: 14,
    outline: "none",
  };

  const buttonStyle = {
    border: "0",
    borderRadius: 12,
    padding: "12px 16px",
    fontWeight: 700,
    cursor: "pointer",
  };

  return (
    <section style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24 }}>Actualizar productos desde foto</h2>
          <p style={{ marginTop: 8, color: "#64748b", maxWidth: 720 }}>
            Sacá una foto a la lista impresa del proveedor. El sistema lee los productos,
            arma una tabla editable y recién después actualiza precios o crea productos nuevos.
          </p>
        </div>

        <div
          style={{
            background: "#ecfeff",
            color: "#155e75",
            border: "1px solid #a5f3fc",
            borderRadius: 999,
            padding: "10px 14px",
            fontWeight: 800,
            height: "fit-content",
          }}
        >
          Foto → Revisar → Guardar
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginTop: 18,
        }}
      >
        <label>
          <strong>Proveedor existente</strong>
          <select
            style={{ ...inputStyle, marginTop: 6 }}
            value={providerId}
            onChange={(event) => handleProviderChange(event.target.value)}
          >
            <option value="">Elegir proveedor</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <strong>O proveedor nuevo</strong>
          <input
            style={{ ...inputStyle, marginTop: 6 }}
            value={newProviderName}
            onChange={(event) => setNewProviderName(event.target.value)}
            placeholder="Ej: Distribuidora Córdoba"
          />
        </label>

        <label>
          <strong>Margen para calcular venta</strong>
          <input
            style={{ ...inputStyle, marginTop: 6 }}
            type="number"
            value={defaultMargin}
            onChange={(event) => {
              const value = Number(event.target.value) || 0;
              setDefaultMargin(value);
              recalculatePrices(value);
            }}
            placeholder="30"
          />
        </label>
      </div>

      <div style={{ marginTop: 18 }}>
        <strong>Foto de la lista</strong>

        <input
          style={{ ...inputStyle, marginTop: 6 }}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
        />

        {preview ? (
          <img
            src={preview}
            alt="Vista previa de la lista"
            style={{
              marginTop: 12,
              width: "100%",
              maxHeight: 280,
              objectFit: "contain",
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              background: "#f8fafc",
            }}
          />
        ) : null}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
        <button
          style={{ ...buttonStyle, background: "#111827", color: "#ffffff" }}
          onClick={readImage}
          disabled={reading}
        >
          {reading ? `Leyendo ${progress}%` : "Leer foto"}
        </button>

        <button
          style={{ ...buttonStyle, background: "#e5e7eb", color: "#111827" }}
          onClick={parseTextAgain}
          disabled={!ocrText}
        >
          Volver a armar tabla
        </button>

        <button
          style={{ ...buttonStyle, background: "#d9f99d", color: "#365314" }}
          onClick={addEmptyRow}
        >
          Agregar fila manual
        </button>
      </div>

      {message ? (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 12,
            background: "#f8fafc",
            border: "1px solid #e5e7eb",
            color: "#334155",
            fontWeight: 600,
          }}
        >
          {message}
        </div>
      ) : null}

      {ocrText ? (
        <div style={{ marginTop: 18 }}>
          <strong>Texto leído de la foto</strong>
          <textarea
            style={{
              ...inputStyle,
              marginTop: 6,
              minHeight: 120,
              fontFamily: "monospace",
              resize: "vertical",
            }}
            value={ocrText}
            onChange={(event) => setOcrText(event.target.value)}
          />
        </div>
      ) : null}

      {rows.length ? (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h3 style={{ margin: 0 }}>Revisar antes de guardar</h3>
              <p style={{ marginTop: 6, color: "#64748b" }}>
                Corregí nombres, códigos y precios. Lo que no quieras cargar, desmarcalo.
              </p>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
              <input
                type="checkbox"
                checked={updateStock}
                onChange={(event) => setUpdateStock(event.target.checked)}
              />
              También actualizar stock
            </label>
          </div>

          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  <th style={{ padding: 10, textAlign: "left" }}>Usar</th>
                  <th style={{ padding: 10, textAlign: "left" }}>Código</th>
                  <th style={{ padding: 10, textAlign: "left" }}>Producto</th>
                  <th style={{ padding: 10, textAlign: "left" }}>Costo</th>
                  <th style={{ padding: 10, textAlign: "left" }}>Venta</th>
                  <th style={{ padding: 10, textAlign: "left" }}>Stock</th>
                  <th style={{ padding: 10, textAlign: "left" }}>Quitar</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.tempId} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: 8 }}>
                      <input
                        type="checkbox"
                        checked={row.include}
                        onChange={(event) => updateRow(row.tempId, "include", event.target.checked)}
                      />
                    </td>

                    <td style={{ padding: 8 }}>
                      <input
                        style={inputStyle}
                        value={row.barcode}
                        onChange={(event) => updateRow(row.tempId, "barcode", event.target.value)}
                        placeholder="Código"
                      />
                    </td>

                    <td style={{ padding: 8 }}>
                      <input
                        style={inputStyle}
                        value={row.name}
                        onChange={(event) => updateRow(row.tempId, "name", event.target.value)}
                        placeholder="Nombre del producto"
                      />
                    </td>

                    <td style={{ padding: 8 }}>
                      <input
                        style={inputStyle}
                        value={row.cost}
                        onChange={(event) => updateRow(row.tempId, "cost", event.target.value)}
                        placeholder="Costo"
                      />
                    </td>

                    <td style={{ padding: 8 }}>
                      <input
                        style={inputStyle}
                        value={row.price}
                        onChange={(event) => updateRow(row.tempId, "price", event.target.value)}
                        placeholder="Precio venta"
                      />
                    </td>

                    <td style={{ padding: 8 }}>
                      <input
                        style={inputStyle}
                        value={row.stock}
                        onChange={(event) => updateRow(row.tempId, "stock", event.target.value)}
                        placeholder="Stock"
                      />
                    </td>

                    <td style={{ padding: 8 }}>
                      <button
                        style={{ ...buttonStyle, background: "#fee2e2", color: "#991b1b" }}
                        onClick={() => removeRow(row.tempId)}
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            style={{
              ...buttonStyle,
              marginTop: 16,
              width: "100%",
              background: "#16a34a",
              color: "#ffffff",
              fontSize: 16,
            }}
            onClick={saveRows}
            disabled={saving}
          >
            {saving ? "Guardando..." : "Actualizar productos"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
