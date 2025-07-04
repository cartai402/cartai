import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { ref, onValue, update, get } from "firebase/database";
import { Link } from "react-router-dom";

/* ───────── helpers ───────── */
const generarCodigo = (uid) =>
  uid.slice(0, 3).toUpperCase() + Math.floor(100 + Math.random() * 900);

export default function Referrals() {
  const uid = auth.currentUser?.uid;

  /* state */
  const [miCodigo, setMiCodigo] = useState("");
  const [referidos, setReferidos] = useState([]);
  const [copiado, setCopiado] = useState(false);

  const [redeemInput, setRedeemInput] = useState("");
  const [redeemMsg, setRedeemMsg] = useState("");
  const [yaTieneReferido, setYaTieneReferido] = useState(false);

  const [promoInput, setPromoInput] = useState("");
  const [promoMsg, setPromoMsg] = useState("");

  /* ─── carga inicial ─── */
  useEffect(() => {
    if (!uid) return;

    const usrRef = ref(db, `usuarios/${uid}`);

    // mi código + saber si ya tengo referente
    onValue(usrRef, snap => {
      const d = snap.val() || {};
      if (!d.codigoReferido) {
        const nuevo = generarCodigo(uid);
        update(usrRef, { codigoReferido: nuevo });
        setMiCodigo(nuevo);
      } else setMiCodigo(d.codigoReferido);
      if (d.referido) setYaTieneReferido(true);
    });

    // mis referidos
    onValue(ref(db, "usuarios"), snap => {
      const all = snap.val() || {};
      const list = Object.values(all).filter(u => u.referido === miCodigo);
      setReferidos(list.reverse());
    });
  }, [uid, miCodigo]);

  /* ─── UI helpers ─── */
  const copiarLink = () => {
    navigator.clipboard.writeText(
      `${window.location.origin}/register?ref=${miCodigo}`
    );
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1800);
  };

  /* ─── canje invitador ─── */
  const canjearReferido = async () => {
    if (yaTieneReferido) return setRedeemMsg("❌ Ya tienes un invitador.");
    const code = redeemInput.trim().toUpperCase();
    if (code.length < 4 || code === miCodigo)
      return setRedeemMsg("❌ Código inválido.");

    const allSnap = await get(ref(db, "usuarios"));
    const users = allSnap.val() || {};
    const invitadorUID = Object.keys(users).find(
      k => users[k].codigoReferido === code
    );
    if (!invitadorUID) return setRedeemMsg("❌ Código no existe.");

    // bonos
    await update(ref(db, `usuarios/${uid}`), {
      referido: code,
      saldoBonos: (users[uid]?.saldoBonos || 0) + 2000,
    });
    if (users[invitadorUID]?.paqueteActivo)
      await update(ref(db, `usuarios/${invitadorUID}`), {
        saldoBonos: (users[invitadorUID].saldoBonos || 0) + 6000,
      });

    setYaTieneReferido(true);
    setRedeemMsg("✅ ¡Código aplicado y bono acreditado!");
  };

  /* ─── canje promo ─── */
  const canjearPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (code.length < 4) return setPromoMsg("❌ Código inválido.");

    const snap = await get(ref(db, `promoCodes/${code}`));
    if (!snap.exists()) return setPromoMsg("❌ No existe.");
    const data = snap.val();
    if (data.usado) return setPromoMsg("❌ Ya utilizado.");

    const usrSnap = await get(ref(db, `usuarios/${uid}`));
    const saldo = usrSnap.val()?.saldoBonos || 0;
    await update(ref(db, `usuarios/${uid}`), { saldoBonos: saldo + data.valor });
    await update(ref(db, `promoCodes/${code}`), { usado: true, uid });

    setPromoMsg(`✅ Bono $${data.valor.toLocaleString()} acreditado.`);
    setPromoInput("");
  };

  /* ─── RENDER ─── */
  return (
    <main style={st.bg}>
      <div style={st.wrapper}>

        {/* título */}
        <header style={{ textAlign: "center" }}>
          <h1 style={st.h1}>Programa de Referidos 📨</h1>
          <p style={st.sub}>Comparte tu enlace y gana comisiones · Canjea códigos promocionales</p>
        </header>

        {/* mi código */}
        <Card>
          <p>Tu código:</p>
          <h2 style={st.code}>{miCodigo || "..."}</h2>
          <button onClick={copiarLink} style={{ ...st.btn3d, ...st.btnGold }}>
            {copiado ? "✅ Copiado" : "📎 Copiar enlace"}
          </button>
        </Card>

        {/* canjear invitador */}
        {!yaTieneReferido && (
          <Card>
            <h3 style={st.cardTitle}>Redimir código de invitador</h3>
            <input
              style={st.input}
              value={redeemInput}
              onChange={e => setRedeemInput(e.target.value.toUpperCase())}
              placeholder="ABC123"
            />
            {redeemMsg && <p style={st.msg}>{redeemMsg}</p>}
            <button onClick={canjearReferido} style={{ ...st.btn3d, ...st.btnCyan, width:"100%" }}>
              Redimir
            </button>
          </Card>
        )}

        {/* canjear promo */}
        <Card>
          <h3 style={st.cardTitle}>Canjear código promocional</h3>
          <input
            style={st.input}
            value={promoInput}
            onChange={e => setPromoInput(e.target.value.toUpperCase())}
            placeholder="PROMO2025"
          />
          {promoMsg && <p style={st.msg}>{promoMsg}</p>}
          <button onClick={canjearPromo} style={{ ...st.btn3d, ...st.btnPurple, width:"100%" }}>
            Canjear
          </button>
        </Card>

        {/* lista referidos */}
        <section>
          <h3 style={st.cardTitle}>Tus referidos</h3>
          {referidos.length === 0 ? (
            <p style={{ opacity:.7 }}>Aún no tienes referidos.</p>
          ) : (
            <div style={st.list}>
              {referidos.map((r,i)=>(
                <div key={i} style={st.listItem}>
                  <span>{r.nombre}</span>
                  <span style={{ fontSize:13 }}>
                    {r.paqueteActivo
                      ? "🟢 Activo"
                      : r.iaActiva
                      ? "🟡 Solo IA"
                      : "🔴 Inactivo"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* volver */}
        <Link to="/dashboard" style={st.back}>← Volver</Link>
      </div>
    </main>
  );
}

/* ─── componentes auxiliares ─── */
const Card = ({ children }) => (
  <section style={st.card}>{children}</section>
);

/* ─── estilos inline ─── */
const st = {
  /* fondo animado tipo Home */
  bg:{minHeight:"100vh",padding:"40px 20px",
      background:"linear-gradient(135deg,#0f172a,#1e293b 40%,#065f46)",
      backgroundSize:"600% 600%",animation:"floatBg 30s linear infinite",
      color:"#fff",display:"flex",justifyContent:"center"},
  wrapper:{width:"100%",maxWidth:800,display:"flex",flexDirection:"column",gap:40},
  h1:{fontSize:"2rem",fontWeight:800,margin:0},
  sub:{opacity:.85,maxWidth:520,margin:"8px auto 0"},
  card:{backdropFilter:"blur(10px)",background:"rgba(255,255,255,.06)",
        borderRadius:20,padding:30,boxShadow:"0 8px 18px #0007",width:"100%"},
  cardTitle:{fontSize:20,fontWeight:700,marginBottom:16,textAlign:"center"},
  code:{fontSize:"1.8rem",fontWeight:800,color:"#facc15",margin:"8px 0 20px"},
  input:{width:"100%",padding:"12px 16px",borderRadius:14,border:"none",
         background:"rgba(255,255,255,.12)",color:"#fff",marginBottom:12,
         textTransform:"uppercase",fontWeight:600,letterSpacing:1},
  msg:{fontSize:14,margin:"4px 0 10px"},
  list:{display:"flex",flexDirection:"column",gap:10},
  listItem:{display:"flex",justifyContent:"space-between",
            background:"rgba(0,0,0,.2)",padding:"12px 16px",borderRadius:12},
  back:{marginTop:10,textDecoration:"underline",color:"#facc15",textAlign:"center"},

  /* botones 3-D */
  btn3d:{padding:"12px 24px",borderRadius:16,fontWeight:700,boxShadow:"4px 4px 14px #000a",
         transition:"transform .2s,box-shadow .2s"},
  btnGold:{background:"linear-gradient(90deg,#facc15,#eab308)",color:"#000"},
  btnCyan:{background:"linear-gradient(90deg,#38bdf8,#0ea5e9)",color:"#fff"},
  btnPurple:{background:"linear-gradient(90deg,#a855f7,#7e22ce)",color:"#fff"}
};