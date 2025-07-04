// Admin.jsx
import React, { useEffect, useState } from "react";
import { ref, onValue, update, get, remove } from "firebase/database";
import { getAuth } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";

/* ==== helpers ==== */
const COP = (n) => n?.toLocaleString("es-CO") ?? "0";
const fmt = (ms) => new Date(ms).toLocaleString("es-CO");

export default function Admin() {
  const [pagos, setPagos]   = useState([]);
  const [retiros, setRets]  = useState([]);
  const [nombres, setNom]   = useState({});
  const nav  = useNavigate();
  const auth = getAuth();
  const usr  = auth.currentUser;

  /* ----------- acceso sólo admin ----------- */
  useEffect(() => {
    if (!usr || usr.email !== "admincartai@cartai.com") nav("/dashboard");
  }, [usr]);

  /* ----------- cargar listados ----------- */
  useEffect(() => {
    const pagosRef   = ref(db, "pagosPendientes");
    const retirosRef = ref(db, "retirosPendientes");

    /* PAGOS */
    onValue(pagosRef, async (s) => {
      const d = s.val() || {};
      const lista = [];
      const nuevos = {};
      for (const [uid, byUser] of Object.entries(d)) {
        const n = await get(ref(db, `usuarios/${uid}/nombre`));
        nuevos[uid] = n.exists() ? n.val() : "Usuario";
        for (const [id, p] of Object.entries(byUser)) lista.push({ ...p, uid });
      }
      setPagos(lista);
      setNom((prev) => ({ ...prev, ...nuevos }));
    });

    /* RETIROS */
    onValue(retirosRef, async (s) => {
      const d = s.val() || {};
      const lista = [];
      const nuevos = {};
      for (const [uid, byUser] of Object.entries(d)) {
        const n = await get(ref(db, `usuarios/${uid}/nombre`));
        nuevos[uid] = n.exists() ? n.val() : "Usuario";
        for (const [id, r] of Object.entries(byUser))
          lista.push({ ...r, uid, retiroId: id });
      }
      setRets(lista);
      setNom((prev) => ({ ...prev, ...nuevos }));
    });
  }, []);

  /* ----------- aprobar pago ----------- */
  const aprobarPago = async (p) => {
    const { uid, pagoId, paqueteId, paqueteNom,
            invertido, ganDia, pagoFinal, durDias, tipo } = p;

    const uRef  = ref(db, `usuarios/${uid}`);
    const snap  = await get(uRef);
    const info  = snap.val() || {};
    const invAc = info.invertido ?? 0;

    /* paquete listo para que Dashboard lo procese */
    const pack = {
      id         : paqueteId,
      nombre     : paqueteNom,
      valor      : invertido,
      ganDia     : ganDia   ?? null,
      pagoFinal  : pagoFinal?? null,
      dur        : durDias,
      tipo,
      fecha      : Date.now(),
      iniciado   : false,          // <- el Dashboard lo detecta
      reclamado  : false,
      diasRestantes: durDias
    };

    await update(uRef, {
      invertido            : invAc + invertido,
      [`paquetes/${pagoId}`]: pack
    });

    await remove(ref(db, `pagosPendientes/${uid}/${pagoId}`));
    alert("✅ Paquete aprobado.");
  };

  /* ----------- aprobar retiro ----------- */
  const aprobarRetiro = async (r) => {
    const { uid, retiroId, monto } = r;
    const uRef = ref(db, `usuarios/${uid}`);
    const s    = await get(uRef);
    const g    = s.val()?.ganancias ?? 0;

    if (g < monto) return alert("❌ Saldo insuficiente.");
    await update(uRef, { ganancias: g - monto });
    await remove(ref(db, `retirosPendientes/${uid}/${retiroId}`));
    alert("✅ Retiro aprobado.");
  };

  /* ----------- rechazar genérico ----------- */
  const rechazar = async (path, uid, id) => {
    await remove(ref(db, `${path}/${uid}/${id}`));
    alert("🚫 Solicitud eliminada.");
  };

  /* -------- UI -------- */
  return (
    <div style={st.bg}>
      <h1 style={st.h1}>🛠️ Panel de Administración</h1>

      {/* ------ PAGOS ------ */}
      <Sec titulo="📩 Pagos pendientes">
        {pagos.length === 0 ? (
          <p style={st.empty}>No hay pagos pendientes.</p>
        ) : pagos.map((p) => (
          <Card key={p.pagoId}>
            <p><b>Usuario:</b> {nombres[p.uid]}</p>
            <p><b>Paquete:</b> {p.paqueteNom}</p>
            <p><b>Inversión:</b> ${COP(p.invertido)}</p>
            <p><b>Referencia:</b> {p.referencia ?? "—"}</p>
            <BtnRow>
              <Btn verde onClick={() => aprobarPago(p)}>Aprobar</Btn>
              <Btn rojo  onClick={() => rechazar("pagosPendientes", p.uid, p.pagoId)}>Rechazar</Btn>
            </BtnRow>
          </Card>
        ))}
      </Sec>

      {/* ------ RETIROS ------ */}
      <Sec titulo="💸 Retiros pendientes">
        {retiros.length === 0 ? (
          <p style={st.empty}>No hay retiros pendientes.</p>
        ) : retiros.map((r) => (
          <Card key={r.retiroId}>
            <p><b>Usuario:</b> {nombres[r.uid]}</p>
            <p><b>Monto:</b> ${COP(r.monto)}</p>
            <p><b>Cuenta:</b> {r.tipoCuenta} – {r.numeroCuenta}</p>
            <p><b>Fecha:</b> {fmt(r.fecha)}</p>
            <BtnRow>
              <Btn verde onClick={() => aprobarRetiro(r)}>Aprobar</Btn>
              <Btn rojo  onClick={() => rechazar("retirosPendientes", r.uid, r.retiroId)}>Rechazar</Btn>
            </BtnRow>
          </Card>
        ))}
      </Sec>
    </div>
  );
}

/* ---- helpers UI ---- */
const Sec   = ({ titulo, children }) => (<section style={st.sec}><h2 style={st.h2}>{titulo}</h2>{children}</section>);
const Card  = ({ children }) => (<div style={st.card}>{children}</div>);
const BtnRow= ({ children }) => (<div style={st.btnRow}>{children}</div>);
const Btn   = ({ verde, rojo, children, ...pr }) => (
  <button
    {...pr}
    style={{
      ...st.btnBase,
      background: verde ? "#4caf50" : rojo ? "#e53935" : "#607d8b"
    }}
  >
    {children}
  </button>
);

/* ---- estilos ---- */
const st = {
  bg   : { background:"#0a0f1e", minHeight:"100vh", padding:20, color:"#fff" },
  h1   : { fontSize:28, marginBottom:20 },
  h2   : { fontSize:22, borderBottom:"1px solid #444", paddingBottom:6, marginBottom:10 },
  sec  : { marginBottom:40 },
  empty: { opacity:.65, fontStyle:"italic" },
  card : { background:"#1e293b", padding:16, borderRadius:14, marginBottom:16,
           boxShadow:"4px 4px 10px #0008" },
  btnRow:{ display:"flex", gap:10, marginTop:12 },
  btnBase:{ border:"none", padding:"8px 16px", borderRadius:8,
            color:"#fff", fontWeight:"bold", cursor:"pointer" }
};