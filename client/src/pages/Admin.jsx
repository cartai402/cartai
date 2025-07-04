import React, { useEffect, useState } from "react";
import { ref, onValue, update, get, remove } from "firebase/database";
import { getAuth } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";

/* ==== Helpers ==== */
const COP = (n) => n?.toLocaleString("es-CO") ?? "0";
const formatFecha = (ms) => new Date(ms).toLocaleString("es-CO");

export default function AdminPanel() {
  const [pagos, setPagos] = useState([]);
  const [retiros, setRetiros] = useState([]);
  const [nombres, setNombres] = useState({});
  const navigate = useNavigate();
  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user || user.email !== "admincartai@cartai.com") {
      navigate("/dashboard");
    }
  }, [user]);

  // Cargar nombres + pagos + retiros
  useEffect(() => {
    const pagosRef = ref(db, "pagosPendientes");
    const retirosRef = ref(db, "retirosPendientes");

    // PAGOS
    onValue(pagosRef, async (snap) => {
      const data = snap.val() || {};
      const lista = [];
      const nuevosNombres = {};

      for (const [uid, pagosUsuario] of Object.entries(data)) {
        const nomSnap = await get(ref(db, `usuarios/${uid}/nombre`));
        nuevosNombres[uid] = nomSnap.exists() ? nomSnap.val() : "Usuario";
        for (const [id, pago] of Object.entries(pagosUsuario)) {
          lista.push({ ...pago, uid });
        }
      }

      setPagos(lista);
      setNombres((prev) => ({ ...prev, ...nuevosNombres }));
    });

    // RETIROS
    onValue(retirosRef, async (snap) => {
      const data = snap.val() || {};
      const lista = [];
      const nuevosNombres = {};

      for (const [uid, retirosUsuario] of Object.entries(data)) {
        const nomSnap = await get(ref(db, `usuarios/${uid}/nombre`));
        nuevosNombres[uid] = nomSnap.exists() ? nomSnap.val() : "Usuario";
        for (const [id, retiro] of Object.entries(retirosUsuario)) {
          lista.push({ ...retiro, uid, retiroId: id });
        }
      }

      setRetiros(lista);
      setNombres((prev) => ({ ...prev, ...nuevosNombres }));
    });
  }, []);

  // Aprobar pago
  const aprobarPago = async (p) => {
    const { uid, pagoId, paqueteId, paqueteNom, invertido, ganDia, pagoFinal, durDias, tipo } = p;

    const userRef = ref(db, `usuarios/${uid}`);
    const snap = await get(userRef);
    const data = snap.val();
    const actual = data?.invertido ?? 0;
    const ganado = data?.ganado ?? 0;

    const fechaActual = new Date();
    const hoy = fechaActual.toISOString().split("T")[0]; // YYYY-MM-DD

    const newPack = {
      id: paqueteId,
      nombre: paqueteNom,
      valor: invertido,
      ganDia: ganDia ?? null,
      pagoFinal: pagoFinal ?? null,
      dur: durDias,
      tipo,
      fecha: Date.now(),
    };

    // Si es paquete diario: añadir ganancia del día + guardar fecha último reclamo
    if (tipo === "diario") {
      newPack.ultimoRec = hoy;
      await update(userRef, {
        invertido: actual + invertido,
        ganado: ganado + ganDia,
        [`paquetes/${pagoId}`]: newPack,
      });
    } else {
      // Paquete final, sin ganancia aún
      await update(userRef, {
        invertido: actual + invertido,
        [`paquetes/${pagoId}`]: newPack,
      });
    }

    await remove(ref(db, `pagosPendientes/${uid}/${pagoId}`));
    alert("✅ Paquete aprobado y saldo actualizado.");
  };

  // Aprobar retiro
  const aprobarRetiro = async (r) => {
    const { uid, monto, retiroId } = r;
    const userRef = ref(db, `usuarios/${uid}`);
    const snap = await get(userRef);
    const saldo = snap.val()?.saldo ?? 0;

    if (saldo < monto) {
      alert("❌ Saldo insuficiente para este retiro.");
      return;
    }

    await update(userRef, {
      saldo: saldo - monto,
    });

    await remove(ref(db, `retirosPendientes/${uid}/${retiroId}`));
    alert("✅ Retiro aprobado y saldo descontado.");
  };

  // Rechazar retiro o pago
  const rechazar = async (uid, id, tipo) => {
    await remove(ref(db, `${tipo}/${uid}/${id}`));
    alert("🚫 Solicitud eliminada.");
  };

  /* ========== UI ========== */
  return (
    <div style={styles.bg}>
      <h1 style={styles.h1}>🛠️ Panel de Administración</h1>

      {/* PAGOS */}
      <section style={styles.section}>
        <h2 style={styles.h2}>📩 Pagos pendientes</h2>
        {pagos.length === 0 ? (
          <p style={styles.empty}>No hay pagos pendientes.</p>
        ) : (
          pagos.map((p, i) => (
            <div key={i} style={styles.card}>
              <p><b>Usuario:</b> {nombres[p.uid]}</p>
              <p><b>Paquete:</b> {p.paqueteNom}</p>
              <p><b>Inversión:</b> ${COP(p.invertido)}</p>
              <p><b>Referencia:</b> {p.referencia}</p>
              <div style={styles.btnRow}>
                <button onClick={() => aprobarPago(p)} style={styles.btnA}>Aprobar</button>
                <button onClick={() => rechazar(p.uid, p.pagoId, "pagosPendientes")} style={styles.btnR}>Rechazar</button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* RETIROS */}
      <section style={styles.section}>
        <h2 style={styles.h2}>💸 Retiros pendientes</h2>
        {retiros.length === 0 ? (
          <p style={styles.empty}>No hay retiros pendientes.</p>
        ) : (
          retiros.map((r, i) => (
            <div key={i} style={styles.card}>
              <p><b>Usuario:</b> {nombres[r.uid]}</p>
              <p><b>Monto:</b> ${COP(r.monto)}</p>
              <p><b>Cuenta:</b> {r.tipoCuenta} – {r.numeroCuenta}</p>
              <p><b>Fecha:</b> {formatFecha(r.fecha)}</p>
              <div style={styles.btnRow}>
                <button onClick={() => aprobarRetiro(r)} style={styles.btnA}>Aprobar</button>
                <button onClick={() => rechazar(r.uid, r.retiroId, "retirosPendientes")} style={styles.btnR}>Rechazar</button>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

/* ========== Estilos ========== */
const styles = {
  bg: { background: "#0a0f1e", minHeight: "100vh", padding: 20, color: "white" },
  h1: { fontSize: 28, marginBottom: 20 },
  h2: { fontSize: 22, borderBottom: "1px solid #444", paddingBottom: 6, marginBottom: 10 },
  section: { marginBottom: 40 },
  empty: { opacity: 0.6, fontStyle: "italic" },
  card: {
    background: "#1e293b",
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    boxShadow: "4px 4px 10px #0008",
  },
  btnRow: { display: "flex", gap: 10, marginTop: 12 },
  btnA: {
    background: "#4caf50",
    border: "none",
    padding: "8px 16px",
    borderRadius: 8,
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
  },
  btnR: {
    background: "#e53935",
    border: "none",
    padding: "8px 16px",
    borderRadius: 8,
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
  },
};