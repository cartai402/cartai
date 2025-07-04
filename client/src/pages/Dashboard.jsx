// Dashboard.jsx
import React, { useEffect, useState } from "react";
import { getDatabase, ref, onValue, update } from "firebase/database";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

/* ───── helpers ───── */
const COP   = n => n?.toLocaleString("es-CO") ?? "0";
const hoyISO = () => new Date().toISOString().split("T")[0];
const difDias = (ms) => Math.floor((Date.now() - ms) / 86_400_000);

/* ───── componente ───── */
export default function Dashboard() {
  const auth = getAuth();
  const navigate = useNavigate();
  const db  = getDatabase();
  const usr = auth.currentUser;

  const [data, setData]     = useState(null);
  const [showIA, setShowIA] = useState(false);

  /* ── suscripción a RTDB ── */
  useEffect(() => {
    if (!usr) return;
    const userRef = ref(db, "usuarios/" + usr.uid);
    onValue(userRef, snap => {
      const d = snap.val();
      if (!d) return;
      setData(d);
      if (!d.iaActiva) setShowIA(true);
      handleAutoCreditDay0(d, usr.uid);
      handleAutoTransferBonos(d, usr.uid);
    });
  }, [usr]);

  /* ───────────────── funciones extra ───────────────── */

  /** 1️⃣  Credita automáticamente el “día 0” del paquete al aprobarse */
  const handleAutoCreditDay0 = (d, uid) => {
    if (!d.paquetes) return;
    let bonus = 0;
    const updates = {};
    Object.entries(d.paquetes).forEach(([key, p]) => {
      if (p.tipo === "diario" && !p.dia0Cred) {
        // dar la primera ganancia
        bonus += p.ganDia;
        updates[`paquetes/${key}/dia0Cred`]   = true;
        updates[`paquetes/${key}/ultimoRec`] = hoyISO(); // ya “reclamado” hoy
      }
    });
    if (bonus) {
      updates.ganado = (d.ganado ?? 0) + bonus;
      update(ref(db, "usuarios/" + uid), updates);
    }
  };

  /** 2️⃣  Transfiere bonos→ganado si cumple reglas */
  const handleAutoTransferBonos = (d, uid) => {
    if (!d.invertido || (d.bonos ?? 0) < 50000) return;
    if (d.bonos === 0) return;
    update(ref(db, "usuarios/" + uid), {
      ganado: (d.ganado ?? 0) + d.bonos,
      bonos : 0,
    });
  };

  /** Reclamar IA diaria → SOLO BONOS */
  const reclamarIA = () => {
    if (!data || data.iaReclamado || data.iaDiasRestantes <= 0) return;
    const uid = usr.uid;
    update(ref(db, "usuarios/" + uid), {
      iaSaldo        : data.iaSaldo + 1000,
      iaDiasRestantes: data.iaDiasRestantes - 1,
      iaReclamado    : true,
      bonos          : (data.bonos ?? 0) + 1000,
    });
  };

  /** Reclamar paquete diario */
  const reclamarPack = (key, p) => {
    const uid = usr.uid;
    if (p.ultimoRec === hoyISO()) return;           // ya cobró hoy
    update(ref(db, "usuarios/" + uid), {
      [`paquetes/${key}/ultimoRec`]: hoyISO(),
      ganado: (data.ganado ?? 0) + p.ganDia,
    });
  };

  /** Activar IA gratuita (solo una vez) */
  const activarIA = () => {
    update(ref(db, "usuarios/" + usr.uid), {
      iaActiva: true,
      iaSaldo : 1000,
      iaDiasRestantes: 60,
      iaReclamado: true,          // ya cobró el primer día
      bonos: (data?.bonos ?? 0) + 1000,
    });
    setShowIA(false);
  };

  const logout = () => { signOut(auth); navigate("/"); };

  /* ── loading ── */
  if (!data)
    return <div style={{...styles.bg,display:"flex",justifyContent:"center",alignItems:"center"}}>Cargando…</div>;

  /* ── datos derivados ── */
  const { iaActiva, iaSaldo=0, iaDiasRestantes=0, iaReclamado,
          invertido=0, ganado=0, bonos=0, paquetes={} } = data;

  /* ── UI ── */
  return (
    <div style={styles.bg}>
      {/* nav */}
      <div style={styles.navWrap}>
        <Nav emoji="🏠" t="Dashboard" to="/dashboard"/>
        <Nav emoji="💼" t="Invertir"   to="/invest"/>
        <Nav emoji="💸" t="Retirar"    to="/withdraw"/>
        <Nav emoji="📨" t="Invitar"    to="/referrals"/>
        <Nav emoji="🎮" t="Jugar"      to="/game"/>
        <button onClick={logout} style={styles.logout}>Cerrar sesión</button>
      </div>

      <h1 style={styles.h1}>Bienvenido, {usr.displayName?.split("|")[0] ?? "Usuario"} 👋</h1>
      <p style={styles.subtitle}>Resumen de tu inversión</p>

      {/* IA gratuita */}
      {iaActiva && (
        <Card>
          <h2 style={styles.cardTitle}>🤖 IA gratuita</h2>
          <p>Saldo acumulado: <b>${COP(iaSaldo)}</b></p>
          <p><small>{iaDiasRestantes} días restantes</small></p>
          <Progress pct={100 - (iaDiasRestantes/60)*100}/>
          <button
            onClick={reclamarIA}
            disabled={iaReclamado}
            style={{
              ...styles.cta,
              backgroundColor: iaReclamado ? "#555" : "#00c853",
              cursor         : iaReclamado ? "default" : "pointer"
            }}>
            {iaReclamado ? "Reclamado hoy" : "Reclamar $1 000"}
          </button>
        </Card>
      )}

      {/* métricas */}
      <div style={styles.metricsWrap}>
        <Metric l="Invertido" v={invertido}/>
        <Metric l="Ganancias" v={ganado}/>
        <Metric l="Bonos"     v={bonos}/>
      </div>

      {/* paquetes */}
      <h3 style={styles.section}>📦 Paquetes activos</h3>
      {Object.keys(paquetes).length === 0 ? (
        <p style={{opacity:.6}}>Aún no tienes paquetes.</p>
      ):(
        Object.entries(paquetes).map(([k,p])=>(
          <Card key={k}>
            <b>{p.nombre}</b><br/>
            <small>Inversión: ${COP(p.valor)} – {p.dur} días</small>
            {p.tipo==="diario" && (
              <>
                <Progress pct={ (difDias(p.fecha)/p.dur)*100 }/>
                <button
                  onClick={()=>reclamarPack(k,p)}
                  disabled={p.ultimoRec===hoyISO()}
                  style={{
                    ...styles.cta,
                    backgroundColor: p.ultimoRec===hoyISO() ? "#555" : "#ffc107",
                    cursor: p.ultimoRec===hoyISO() ? "default" : "pointer",
                    marginTop:6
                  }}>
                  {p.ultimoRec===hoyISO() ? "Reclamado hoy" : `Reclamar $${COP(p.ganDia)}`}
                </button>
              </>
            )}
            {p.tipo==="final" && (
              <>
                <Progress pct={ (difDias(p.fecha)/p.dur)*100 }/>
                <small>Pago único final: ${COP(p.pagoFinal)}</small>
              </>
            )}
          </Card>
        ))
      )}

      {/* modal IA */}
      {showIA && (
        <Modal
          onClose={()=>setShowIA(false)}
          onOk  ={activarIA}
        />
      )}
    </div>
  );
}

/* ── componentes simples ─────────────────────────── */
const Nav = ({emoji,t,to}) => (
  <a href={to} style={styles.navBtn}><span style={{fontSize:20}}>{emoji}</span> {t}</a>
);
const Card   = ({children}) => <div style={styles.card}>{children}</div>;
const Metric = ({l,v})=>(
  <Card><p style={{opacity:.7,fontSize:14}}>{l}</p><h2>${COP(v)}</h2></Card>
);
const Progress = ({pct})=>(
  <div style={{background:"#333",borderRadius:8,overflow:"hidden",height:14,margin:"10px 0"}}>
    <div style={{width:`${Math.min(pct,100)}%`,background:"linear-gradient(90deg,#ffe259,#ffa751)",height:"100%"}}/>
  </div>
);
const Modal = ({onClose,onOk})=>(
  <div style={styles.modalOverlay}>
    <div style={styles.modalBox}>
      <h2 style={{marginBottom:10}}>🎉 ¡Felicidades!</h2>
      <p style={{marginBottom:20,fontSize:14,lineHeight:1.4}}>
        Has recibido la <b>IA gratuita</b> de CartAI.<br/>
        Obtén <b>$1 000 COP</b> diarios durante 60 días.<br/>
        (el bono se acredita en “Bonos”)
      </p>
      <button onClick={onOk}   style={{...styles.cta,width:"100%",marginBottom:8}}>Activar IA gratuita</button>
      <button onClick={onClose}style={styles.linkBtn}>Ahora no</button>
    </div>
  </div>
);

/* ── estilos inline (sin cambios visuales) ───────── */
const styles={
  bg:{background:"#0a0f1e",minHeight:"100vh",color:"white",padding:15},
  navWrap:{display:"flex",flexWrap:"wrap",gap:12,marginBottom:25},
  navBtn:{background:"#1d273b",padding:"10px 18px",borderRadius:12,
          color:"white",textDecoration:"none",display:"flex",alignItems:"center",
          gap:6,boxShadow:"3px 3px 6px #0007"},
  logout:{background:"#ff1744",border:"none",borderRadius:12,color:"white",
          padding:"10px 18px",fontWeight:"bold",boxShadow:"3px 3px 6px #0007"},
  h1:{fontSize:28,fontWeight:600,margin:0},
  subtitle:{opacity:.8,marginBottom:25},
  card:{background:"#152037",padding:20,borderRadius:15,marginBottom:20,
        boxShadow:"4px 4px 12px #000a"},
  cardTitle:{marginTop:0},
  cta:{border:"none",padding:"10px 18px",borderRadius:12,fontWeight:"bold",
       color:"white",boxShadow:"2px 2px 6px #0007"},
  metricsWrap:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:15},
  section:{margin:"25px 0 10px"},
  modalOverlay:{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",
                display:"flex",justifyContent:"center",alignItems:"center"},
  modalBox:{background:"#1d273b",padding:30,borderRadius:20,maxWidth:320,
            textAlign:"center",boxShadow:"4px 4px 12px #000c"},
  linkBtn:{background:"none",border:"none",color:"#9ca3af",
           textDecoration:"underline",cursor:"pointer"}
};