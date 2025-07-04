import React, { useEffect, useState } from "react";
import { ref, onValue, update, get, remove, set } from "firebase/database";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";

/* ==== helpers ==== */
const COP = (n) => n?.toLocaleString("es-CO") ?? "0";
const fmt = (ms) => new Date(ms).toLocaleString("es-CO");

export default function Admin() {
  const [pagos, setPagos] = useState([]);
  const [retiros, setRets] = useState([]);
  const [nombres, setNom] = useState({});
  const [promoVal, setPromoVal] = useState("");
  const [promoDur, setPromoDur] = useState("");
  const [ultimoCodigo, setUltimoCodigo] = useState("");

  const nav = useNavigate();
  const auth = getAuth();
  const usr = auth.currentUser;

  useEffect(() => {
    if (!usr || usr.email !== "admincartai@cartai.com") nav("/dashboard");
  }, [usr]);

  useEffect(() => {
    const pagosRef = ref(db, "pagosPendientes");
    const retirosRef = ref(db, "retirosPendientes");

    onValue(pagosRef, async (s) => {
      const d = s.val() || {};
      const lista = [];
      const nuevos = {};
      for (const [uid, byUser] of Object.entries(d)) {
        const n = await get(ref(db, `usuarios/${uid}/nombre`));
        nuevos[uid] = n.exists() ? n.val() : "Usuario";
        for (const [id, p] of Object.entries(byUser)) lista.push({ ...p, uid, pagoId: id });
      }
      setPagos(lista);
      setNom((prev) => ({ ...prev, ...nuevos }));
    });

    onValue(retirosRef, async (s) => {
      const d = s.val() || {};
      const lista = [];
      const nuevos = {};
      for (const [uid, byUser] of Object.entries(d)) {
        const n = await get(ref(db, `usuarios/${uid}/nombre`));
        nuevos[uid] = n.exists() ? n.val() : "Usuario";
        for (const [id, r] of Object.entries(byUser)) {
          lista.push({ ...r, retiroId: id, uid });
        }
      }
      setRets(lista);
      setNom((prev) => ({ ...prev, ...nuevos }));
    });
  }, []);

  const aprobarPago = async (p) => {
    const {
      uid, pagoId, paqueteId, paqueteNom,
      invertido, ganDia, pagoFinal, durDias, tipo
    } = p;

    const uRef = ref(db, `usuarios/${uid}`);
    const snap = await get(uRef);
    const info = snap.val() || {};
    const invAc = info.invertido ?? 0;

    const pack = {
      id: paqueteId,
      nombre: paqueteNom,
      valor: invertido,
      ganDia: ganDia ?? null,
      pagoFinal: pagoFinal ?? null,
      dur: durDias,
      tipo,
      fecha: Date.now(),
      iniciado: false,
      reclamado: false,
      diasRestantes: durDias
    };

    await update(uRef, {
      invertido: invAc + invertido,
      [`paquetes/${pagoId}`]: pack
    });

    await remove(ref(db, `pagosPendientes/${uid}/${pagoId}`));
    alert("✅ Paquete aprobado.");
  };

  const aprobarRetiro = async (r) => {
    const { uid, retiroId } = r;
    await update(ref(db, `retiros/${uid}/${retiroId}`), { estado: "aprobado" });
    await remove(ref(db, `retirosPendientes/${uid}/${retiroId}`));
    alert("✅ Retiro aprobado.");
  };

  const rechazar = async (path, uid, id) => {
    if (path === "retirosPendientes") {
      await update(ref(db, `retiros/${uid}/${id}`), { estado: "rechazado" });
    }
    await remove(ref(db, `${path}/${uid}/${id}`));
    alert("🚫 Solicitud eliminada.");
  };

  const generarCodigo = async () => {
    const valor = parseInt(promoVal);
    const dias = parseInt(promoDur);
    if (isNaN(valor) || isNaN(dias)) return alert("Completa valor y duración");

    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const exp = Date.now() + dias * 24 * 60 * 60 * 1000;

    await set(ref(db, `promoCodes/${code}`), {
      valor,
      expira: exp,
      usado: false
    });

    setUltimoCodigo(code);
    setPromoVal(""); setPromoDur("");
    alert(`🎁 Código creado: ${code}`);
  };

  const copiarCodigo = () => {
    navigator.clipboard.writeText(ultimoCodigo);
    alert("📋 Código copiado al portapapeles.");
  };

  const cerrarSesion = async () => {
    const salir = confirm("¿Seguro que deseas cerrar sesión?");
    if (!salir) return;
    await signOut(auth);
    nav("/");
  };

  return (
    <div style={st.bg}>
      <h1 style={st.h1}>🛠️ Panel de Administración</h1>

      <Sec titulo="📩 Pagos pendientes">
        {pagos.length === 0 ? (
          <p style={st.empty}>No hay pagos pendientes.</p>
        ) : pagos.map((p) => (
          <Card key={p.pagoId}>
            <p><b>Nombre:</b> {nombres[p.uid]}</p>
            <p><b>UID:</b> {p.uid}</p>
            <p><b>Paquete:</b> {p.paqueteNom}</p>
            <p><b>Valor:</b> ${COP(p.invertido)}</p>
            <p><b>Referencia:</b> {p.referencia ?? "—"}</p>
            <BtnRow>
              <Btn verde onClick={() => aprobarPago(p)}>Aprobar</Btn>
              <Btn rojo onClick={() => rechazar("pagosPendientes", p.uid, p.pagoId)}>Rechazar</Btn>
            </BtnRow>
          </Card>
        ))}
      </Sec>

      <Sec titulo="💸 Retiros pendientes">
        {retiros.length === 0 ? (
          <p style={st.empty}>No hay retiros pendientes.</p>
        ) : retiros.map((r) => (
          <Card key={r.retiroId}>
            <p><b>Nombre:</b> {nombres[r.uid]}</p>
            <p><b>UID:</b> {r.uid}</p>
            <p><b>Monto:</b> ${COP(r.monto)}</p>
            <p><b>Cuenta:</b> {r.tipoCuenta?.toUpperCase()} – {r.numeroCuenta}</p>
            <p><b>Fecha:</b> {fmt(r.fecha)}</p>
            <BtnRow>
              <Btn verde onClick={() => aprobarRetiro(r)}>Aprobar</Btn>
              <Btn rojo onClick={() => rechazar("retirosPendientes", r.uid, r.retiroId)}>Rechazar</Btn>
            </BtnRow>
          </Card>
        ))}
      </Sec>

      <Sec titulo="🎟️ Generar código promocional">
        <input
          style={st.input}
          placeholder="Valor del bono ($)"
          value={promoVal}
          onChange={(e) => setPromoVal(e.target.value)}
        />
        <input
          style={st.input}
          placeholder="Duración en días"
          value={promoDur}
          onChange={(e) => setPromoDur(e.target.value)}
        />
        <Btn onClick={generarCodigo}>Generar código</Btn>

        {ultimoCodigo && (
          <div style={{ marginTop: 10 }}>
            <p><b>Último código generado:</b></p>
            <button onClick={copiarCodigo} style={st.copyBtn}>
              📋 {ultimoCodigo}
            </button>
          </div>
        )}
      </Sec>

      {/* BOTÓN CERRAR SESIÓN */}
      <div style={{ textAlign: "center", marginTop: 60 }}>
        <button onClick={cerrarSesion} style={st.logoutBtn}>
          🚪 Cerrar sesión
        </button>
      </div>
    </div>
  );
}

/* ---- helpers UI ---- */
const Sec = ({ titulo, children }) => (<section style={st.sec}><h2 style={st.h2}>{titulo}</h2>{children}</section>);
const Card = ({ children }) => (<div style={st.card}>{children}</div>);
const BtnRow = ({ children }) => (<div style={st.btnRow}>{children}</div>);
const Btn = ({ verde, rojo, children, ...pr }) => (
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
  bg: { background: "#0a0f1e", minHeight: "100vh", padding: 20, color: "#fff" },
  h1: { fontSize: 28, marginBottom: 20 },
  h2: { fontSize: 22, borderBottom: "1px solid #444", paddingBottom: 6, marginBottom: 10 },
  sec: { marginBottom: 40 },
  empty: { opacity: .65, fontStyle: "italic" },
  card: {
    background: "#1e293b", padding: 16, borderRadius: 14, marginBottom: 16,
    boxShadow: "4px 4px 10px #0008"
  },
  btnRow: { display: "flex", gap: 10, marginTop: 12 },
  btnBase: {
    border: "none", padding: "8px 16px", borderRadius: 8,
    color: "#fff", fontWeight: "bold", cursor: "pointer"
  },
  input: {
    display: "block", marginBottom: 10, padding: "8px 12px", borderRadius: 8,
    background: "#233044", color: "#fff", border: "1px solid #394b64", width: 220
  },
  copyBtn: {
    padding: "10px 16px", borderRadius: 8, background: "#00bcd4",
    border: "none", color: "#fff", fontWeight: "bold", cursor: "pointer"
  },
  logoutBtn: {
    background: "linear-gradient(90deg,#f87171,#ef4444)",
    color: "#fff",
    padding: "12px 30px",
    borderRadius: 18,
    fontWeight: "bold",
    fontSize: "1rem",
    boxShadow: "4px 4px 14px #000a",
    transition: "transform 0.2s, box-shadow 0.2s",
    cursor: "pointer",
  }
};