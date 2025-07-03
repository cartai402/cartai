import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { ref, update } from "firebase/database";

export default function PaymentQR() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [refPago, setRefPago] = useState("");
  const [paquete, setPaquete] = useState(null);
  const [pagoId, setPagoId] = useState(null);

  useEffect(() => {
    if (!state?.paquete || !state?.pagoId) {
      navigate("/invest");
    } else {
      setPaquete(state.paquete);
      setPagoId(state.pagoId);
    }
  }, [state, navigate]);

  if (!paquete || !pagoId) return null;

  const { nombre, inversion } = paquete;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const uid = auth.currentUser.uid;

    await update(ref(db, `pagosPendientes/${uid}/${pagoId}`), {
      referencia: refPago.trim(),
      estado: "enRevision",
    });

    alert("✅ Recibimos tu referencia. La confirmación tarda unos 5 minutos.");
    navigate("/dashboard");
  };

  const descargarQR = () => {
    const link = document.createElement("a");
    link.href = "/qr.png"; // Asegúrate de tener /public/qr.png
    link.download = "cartai_qr.png";
    link.click();
  };

  return (
    <main style={styles.bg}>
      <div style={styles.card}>
        <h1 style={styles.title}>💳 Confirmar Pago</h1>

        <section style={styles.section}>
          <p><strong>🧾 Paquete:</strong> {nombre}</p>
          <p><strong>💰 Monto:</strong> ${inversion.toLocaleString()} COP</p>
          <p style={{ opacity: 0.7 }}>Procesamos tu activación en unos 5 minutos.</p>
        </section>

        {/* Imagen QR */}
        <div style={{ textAlign: "center" }}>
          <img
            src="/qr.png"
            alt="QR Nequi CartAI"
            style={styles.qr}
          />
          <button onClick={descargarQR} style={{ ...styles.btn3d, ...styles.btnWhite }}>
            📥 Descargar QR
          </button>
        </div>

        {/* Pasos para pagar */}
        <div style={styles.stepsBox}>
          <h2 style={styles.stepTitle}>🧾 ¿Cómo pagar con Nequi?</h2>
          <ol style={styles.ol}>
            <li>Abre Nequi y toca <strong>“Escanear”</strong>.</li>
            <li>Selecciona <em>“Desde galería”</em> y elige el QR.</li>
            <li>Paga exactamente <strong>${inversion.toLocaleString()}</strong>.</li>
            <li>Copia la <strong>referencia</strong> generada.</li>
            <li>Pégala abajo y presiona enviar.</li>
          </ol>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
          <input
            type="text"
            value={refPago}
            onChange={(e) => setRefPago(e.target.value)}
            required
            placeholder="Referencia Nequi (ej: M123456)"
            style={styles.input}
          />
          <button type="submit" style={{ ...styles.btn3d, ...styles.btnMain }}>
            🚀 Enviar referencia
          </button>
        </form>

        <button
          onClick={() => navigate("/dashboard")}
          style={styles.backLink}
        >
          ← Volver al Dashboard
        </button>
      </div>
    </main>
  );
}

/* ─────────── Estilos 4D elegantes ─────────── */
const styles = {
  bg: {
    minHeight: "100vh",
    background: "linear-gradient(135deg,#A200FF 0%,#FF0066 100%)",
    backgroundSize: "600% 600%",
    animation: "floatBg 30s linear infinite",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 450,
    background: "rgba(255,255,255,.06)",
    backdropFilter: "blur(12px)",
    padding: 28,
    borderRadius: 24,
    boxShadow: "0 8px 20px #0005",
    color: "#fff",
  },
  title: {
    fontSize: "1.8rem",
    fontWeight: 800,
    textAlign: "center",
    marginBottom: 20,
  },
  section: {
    background: "rgba(0,0,0,.25)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    fontSize: 15,
    lineHeight: 1.5,
  },
  qr: {
    width: 200,
    height: 200,
    objectFit: "contain",
    marginBottom: 12,
    border: "4px solid rgba(255,255,255,.2)",
    borderRadius: 12,
    boxShadow: "0 0 20px #0007",
  },
  btn3d: {
    padding: "12px 24px",
    borderRadius: 14,
    fontWeight: 700,
    fontSize: "1rem",
    boxShadow: "4px 4px 14px #000a",
    transition: "all 0.2s",
    display: "block",
    width: "100%",
    marginTop: 12,
    border: "none",
    cursor: "pointer",
  },
  btnWhite: {
    background: "#fff",
    color: "#A200FF",
  },
  btnMain: {
    background: "linear-gradient(90deg,#d946ef,#a855f7)",
    color: "#fff",
    marginTop: 16,
  },
  input: {
    width: "100%",
    background: "rgba(255,255,255,.1)",
    borderRadius: 12,
    padding: "14px 18px",
    color: "#fff",
    border: "none",
    outline: "none",
    fontSize: "1rem",
    marginBottom: 8,
  },
  stepsBox: {
    background: "rgba(0,0,0,.2)",
    padding: 18,
    borderRadius: 16,
    marginTop: 20,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 10,
    color: "#f9a8d4",
  },
  ol: {
    paddingLeft: 20,
    fontSize: 14,
    lineHeight: 1.6,
    color: "#ddd",
  },
  backLink: {
    marginTop: 20,
    fontSize: 13,
    color: "#fbcfe8",
    textDecoration: "underline",
    textAlign: "center",
    display: "block",
  },
};