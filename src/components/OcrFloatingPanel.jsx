import { useState } from "react";
import PhotoListImporter from "./PhotoListImporter";

export default function OcrFloatingPanel() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          right: 18,
          bottom: 18,
          zIndex: 9999,
          border: "0",
          borderRadius: 999,
          padding: "14px 18px",
          background: "#111827",
          color: "#ffffff",
          fontWeight: 900,
          boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
          cursor: "pointer",
        }}
      >
        OCR lista proveedor
      </button>

      {open ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            background: "rgba(15, 23, 42, 0.75)",
            overflowY: "auto",
            padding: 16,
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: "20px auto",
              background: "#f8fafc",
              borderRadius: 22,
              padding: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setOpen(false)}
                style={{
                  border: "0",
                  borderRadius: 12,
                  padding: "10px 14px",
                  background: "#fee2e2",
                  color: "#991b1b",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Cerrar
              </button>
            </div>

            <PhotoListImporter />
          </div>
        </div>
      ) : null}
    </>
  );
}
