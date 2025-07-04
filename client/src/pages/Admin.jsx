import React, { useEffect, useState } from "react";
import { ref, onValue, update, get, remove } from "firebase/database";
import { db, auth } from "../firebase";
import { getAuth } from "firebase/auth";
import { useNavigate } from "react-router-dom";

/* ========== helpers ========== */
const COP = (n) => n?.toLocaleString("es-CO") ?? "0";

/* ========== Panel Admin ========== */
export default function AdminPanel() {
  const [pagos, setPagos] = useState([]);
  const navigate = useNavigate();
  const user = getAuth().currentUser;

  // Redirigir si no es admin
  useEffect(() => {
    if (!user || user.email !== "admincartai@cartai.com") {
      navigate("/dashboard");
    }
  }, [user]);

  // Cargar pagos pendientes
  useEffect(() => {
    const refPagos = ref(db, "pagosPendientes");
    onValue(refPagos, (snap) => {
      const data = snap.val();
      if (!data) {
        setPagos([]);
        return;
      }

      const lista = [];
      Object.entries(data).forEach(([uid, pagosUsuario]) => {
        Object.entries(pagosUsuario).forEach(([pagoId, info]) => {
          lista.push({ ...info, uid });
        });
      });
      setPagos(lista);
    });
  }, []);

  /* ========== Aprobar pago ========== */
  const aprobarPago = async (pago) => {
    const userRef = ref(db, `usuarios/${pago.uid}`);
    const userSnap = await get(userRef);
    const userData = userSnap.val() || {};

    const paqueteId = `p-${Date.now()}`;

    await update(userRef, {
      invertido: (userData.invertido ?? 0) + pago.invertido,
      [`paquetes/${paqueteId}`]: {
        id: pago.paqueteId,
        nombre: pago.paqueteNom,
        valor: pago.invertido,
        fecha: new Date().toISOString(),
        tipo: pago.tipo,
        duracion: pago.durDias,
      },
    });

    await remove(ref(db, `pagosPendientes/${pago.uid}/${pago.pagoId}`));
    alert("✅ Pago aprobado y paquete activado");
  };

  /* ========== Render ========== */
  return (
    <div style={styles.bg}>
      <h1 style={styles.title}>📋 Panel de Administración</h1>
      {pagos.length === 0 ? (
        <p style={styles.empty}>No hay pagos pendientes</p>
      ) : (
        pagos.map((pago, i) => (
          <div key={i} style={styles.card}>
            <h3>{pago.paqueteNom}</h3>
            <p><b>💰 Inversión:</b> ${COP(pago.invertido)}</p>
            <p><b>📌 UID:</b> {pago.uid}</p>
            {pago.referencia && <p><b>🔖 Ref:</b> {pago.referencia}</p>}
            <button onClick={() => aprobarPago(pago)} style={styles.btn}>✅ Aprobar</button>
          </div>
        ))
      )}
    </div>
  );
}

/* ========== estilos ========== */
const styles = {
  bg: {
    background: "#0a0f1e",
    minHeight: "100vh",
    color: "white",
    padding: 20,
    fontFamily: "sans-serif",
  },
  title: {
    fontSize: 28,
    marginBottom: 30,
  },
  empty: {
    opacity: 0.7,
  },
  card: {
    background: "#1c2333",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    boxShadow: "4px 4px 12px #0006",
  },
  btn: {
    background: "#00c853",
    color: "#fff",
    border: "none",
    padding: "10px 16px",
    borderRadius: 10,
    cursor: "pointer",
    marginTop: 12,
    fontWeight: "bold",
    boxShadow: "2px 2px 8px #000a",
  },
};