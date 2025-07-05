import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { ref, onValue, update, get } from "firebase/database";

export default function Referrals() {
  const uid = auth.currentUser?.uid;

  /* ───── estados ───── */
  const [miCodigo, setMiCodigo] = useState("");
  const [referidos, setReferidos] = useState([]);
  const [copiado, setCopiado] = useState(false);

  const [redeemInput, setRedeemInput] = useState("");
  const [redeemMsg, setRedeemMsg]   = useState("");
  const [yaTieneReferido, setYaTieneReferido] = useState(false);
  const [invitador, setInvitador] = useState(null);          // 👈 nuevo

  const [promoInput, setPromoInput] = useState("");
  const [promoMsg, setPromoMsg] = useState("");

  const link = `${window.location.origin}/register?ref=${miCodigo}`;

  /* ───── carga inicial ───── */
  useEffect(() => {
    if (!uid) return;

    const thisUserRef = ref(db, `usuarios/${uid}`);

    onValue(thisUserRef, async snap => {
      const data = snap.val() || {};

      /* generar ó leer mi código */
      if (!data.codigoReferido) {
        const nuevo = generarCodigo(uid);
        update(thisUserRef, { codigoReferido: nuevo });
        setMiCodigo(nuevo);
      } else {
        setMiCodigo(data.codigoReferido);
      }

      /* si ya fui invitado */
      if (data.referido) {
        setYaTieneReferido(true);
        // buscar nombre del invitador
        const allSnap = await get(ref(db, "usuarios"));
        const allUsers = allSnap.val() || {};
        const invit = Object.values(allUsers).find(u => u.codigoReferido === data.referido);
        if (invit) setInvitador(invit.nombre || "Usuario");
      }
    });

    /* cargar mis referidos */
    const allRef = ref(db, "usuarios");
    onValue(allRef, snap => {
      const users = snap.val() || {};
      const lista = Object.values(users).filter(u => u.referido === miCodigo);
      setReferidos(lista.reverse());
    });
  }, [uid, miCodigo]);

  /* ───── helpers ───── */
  const generarCodigo = uid => uid.slice(0,3).toUpperCase()+Math.floor(100+Math.random()*900);

  const copiarLink = () => {
    navigator.clipboard.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  /* ---- canjear invitación ---- */
  const canjearReferido = async () => {
    if (yaTieneReferido)    return setRedeemMsg("❌ Ya tienes un código asociado.");
    const code = redeemInput.trim().toUpperCase();
    if (code.length<4 || code===miCodigo) return setRedeemMsg("❌ Código inválido.");

    const allSnap = await get(ref(db,"usuarios"));
    const allUsers = allSnap.val()||{};
    const invitUID = Object.keys(allUsers).find(k=>allUsers[k].codigoReferido===code);
    if (!invitUID) return setRedeemMsg("❌ Código no encontrado.");

    /* acreditar bonos */
    await update(ref(db,`usuarios/${uid}`),{
      referido:code,
      saldoBonos:(allUsers[uid]?.saldoBonos||0)+2000
    });
    if (allUsers[invitUID]?.paqueteActivo){
      await update(ref(db,`usuarios/${invitUID}`),{
        saldoBonos:(allUsers[invitUID].saldoBonos||0)+6000
      });
    }

    setYaTieneReferido(true);
    setInvitador(allUsers[invitUID]?.nombre||"Usuario");
    setRedeemMsg("✅ Código redimido y bonos acreditados.");
  };

  /* ---- canjear PROMO ---- */
  const canjearPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (code.length<4) return setPromoMsg("❌ Código inválido.");

    const snap = await get(ref(db,`codigos/${code}`));
    if (!snap.exists())      return setPromoMsg("❌ Código no existe.");

    const datos = snap.val();
    if (datos.usado)         return setPromoMsg("❌ Código ya fue utilizado.");

    const userSnap = await get(ref(db,`usuarios/${uid}`));
    const nuevoSaldo = (datos.valor||0)+((userSnap.val()||{}).saldoBonos||0);

    await update(ref(db,`usuarios/${uid}`),{saldoBonos:nuevoSaldo});
    await update(ref(db,`codigos/${code}`),{usado:true,uid});

    setPromoMsg(`✅ Bono de $${datos.valor.toLocaleString()} acreditado.`);
    setPromoInput("");
  };

  /* ---- botones compartir ---- */
  const share = (
    <div style={styles.shareWrap}>
      <a href={`https://wa.me/?text=${encodeURIComponent(link)}`} target="_blank" rel="noopener noreferrer" style={styles.shareBtn}>🟢 WhatsApp</a>
      <a href={`https://t.me/share/url?url=${encodeURIComponent(link)}`} target="_blank" rel="noopener noreferrer" style={styles.shareBtn}>🔵 Telegram</a>
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`} target="_blank" rel="noopener noreferrer" style={styles.shareBtn}>🔵 Facebook</a>
      <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(link)}`} target="_blank" rel="noopener noreferrer" style={styles.shareBtn}>⚫ X</a>
    </div>
  );

  /* ───── UI ───── */
  return (
    <main style={styles.bg}>
      <h1 style={styles.h1}>🎁 Invita &amp; Canjea</h1>

      {/* quién me invitó */}
      {invitador && (
        <section style={styles.card}>
          <h3 style={styles.cardTitle}>Fuiste invitado por</h3>
          <p style={{fontWeight:"bold",color:"#facc15",fontSize:18}}>{invitador}</p>
        </section>
      )}

      {/* mi código */}
      <section style={styles.card}>
        <p>Tu código:</p>
        <h2 style={styles.code}>{miCodigo}</h2>
        <button onClick={copiarLink} style={styles.btn}>
          {copiado?"✅ Copiado":"📎 Copiar enlace"}
        </button>
        {share}
      </section>

      {/* canjear invitación */}
      {!yaTieneReferido && (
        <section style={styles.card}>
          <h3 style={styles.cardTitle}>Canjear código de invitación</h3>
          <input
            value={redeemInput}
            onChange={e=>setRedeemInput(e.target.value.toUpperCase())}
            placeholder="Código"
            style={styles.input}
          />
          {redeemMsg && <p>{redeemMsg}</p>}
          <button onClick={canjearReferido} style={styles.btn}>Redimir</button>
        </section>
      )}

      {/* promo */}
      <section style={styles.card}>
        <h3 style={styles.cardTitle}>Canjear código promocional</h3>
        <input
          value={promoInput}
          onChange={e=>setPromoInput(e.target.value.toUpperCase())}
          placeholder="Código promo"
          style={styles.input}
        />
        {promoMsg && <p>{promoMsg}</p>}
        <button onClick={canjearPromo} style={styles.btn}>Canjear</button>
      </section>

      {/* referidos */}
      <section style={styles.card}>
        <h3 style={styles.cardTitle}>Mis referidos</h3>
        {referidos.length===0
          ? <p style={{opacity:.6}}>Aún sin referidos.</p>
          : <ul style={{listStyle:"none",padding:0}}>
              {referidos.map((r,i)=>(
                <li key={i} style={styles.referidoItem}>
                  <span>{r.nombre}</span>
                  <span style={{fontSize:13}}>
                    {r.paqueteActivo?"🟢 Activo":r.iaActiva?"🟡 Solo IA":"🔴 Inactivo"}
                  </span>
                </li>
              ))}
            </ul>}
      </section>
    </main>
  );
}

/* ───── estilos ───── */
const styles = {
  bg:{
    minHeight:"100vh",
    padding:"50px 20px 80px",
    background:"linear-gradient(135deg,#0f172a,#1e293b 40%,#065f46)",
    backgroundSize:"600% 600%",
    animation:"floatBg 30s linear infinite",
    color:"#fff",
    display:"flex",
    flexDirection:"column",
    alignItems:"center",
  },
  h1:{fontSize:"2rem",fontWeight:800,marginBottom:24,textAlign:"center"},
  card:{
    backdropFilter:"blur(12px)",
    background:"rgba(255,255,255,.05)",
    padding:20,borderRadius:20,
    boxShadow:"0 8px 18px #000a",
    marginBottom:30,width:"100%",maxWidth:500,textAlign:"center"
  },
  cardTitle:{fontSize:18,fontWeight:600,marginBottom:12},
  code:{fontSize:24,fontWeight:"bold",color:"#facc15",marginBottom:10},
  input:{
    width:"100%",padding:10,borderRadius:10,border:"none",marginBottom:10,
    background:"rgba(255,255,255,.1)",color:"#fff",fontSize:16,textAlign:"center"
  },
  btn:{
    padding:"10px 24px",
    background:"linear-gradient(90deg,#38bdf8,#0ea5e9)",
    color:"#fff",border:"none",borderRadius:16,
    fontWeight:700,fontSize:"1rem",cursor:"pointer",marginTop:10
  },
  shareWrap:{
    marginTop:12,display:"flex",justifyContent:"center",flexWrap:"wrap",gap:10
  },
  shareBtn:{
    background:"#0ea5e9",color:"#fff",padding:"6px 12px",
    borderRadius:8,fontWeight:600,fontSize:13,textDecoration:"none"
  },
  referidoItem:{
    background:"rgba(255,255,255,0.05)",
    padding:"10px 14px",margin:"6px 0",borderRadius:10,
    display:"flex",justifyContent:"space-between"
  }
};