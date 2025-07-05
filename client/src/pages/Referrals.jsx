import React, { useEffect, useState } from "react";
import { getDatabase, ref, onValue, update, get } from "firebase/database";
import { getAuth } from "firebase/auth";

export default function Referrals() {
  const db = getDatabase();
  const uid = getAuth().currentUser?.uid;

  const [miCodigo, setMiCodigo] = useState("");
  const [linkFull, setLinkFull] = useState("");
  const [referidos, setReferidos] = useState([]);
  const [copiado, setCopiado] = useState(false);
  const [yaTieneRef, setYaTieneRef] = useState(false);
  const [miInvitador, setMiInvitador] = useState(null);
  const [redeemInput, setRedeemInput] = useState("");
  const [redeemMsg, setRedeemMsg] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [promoMsg, setPromoMsg] = useState("");

  const COP = n => n?.toLocaleString("es-CO") ?? "0";
  const genCode = id => id.slice(0, 3).toUpperCase() + Math.floor(100 + Math.random() * 900);

  useEffect(() => {
    if (!uid) return;
    const uRef = ref(db, `usuarios/${uid}`);

    onValue(uRef, snap => {
      const d = snap.val() || {};
      if (!d.codigoReferido) {
        const nuevo = genCode(uid);
        update(uRef, { codigoReferido: nuevo });
        setMiCodigo(nuevo);
      } else {
        setMiCodigo(d.codigoReferido);
      }

      if (d.referido) {
        setYaTieneRef(true);
        get(ref(db, "usuarios")).then(s => {
          const all = s.val() || {};
          const invKey = Object.keys(all).find(k => all[k].codigoReferido === d.referido);
          if (invKey) setMiInvitador(all[invKey].nombre ?? "(sin nombre)");
        });
      }
      setLinkFull(`${window.location.origin}/register?ref=${d.codigoReferido ?? ""}`);
    });

    const allRef = ref(db, "usuarios");
    onValue(allRef, snap => {
      const users = snap.val() || {};
      const lista = Object.values(users).filter(u => u.referido === miCodigo);
      setReferidos(lista.reverse());
    });
  }, [uid, miCodigo]);

  const copiar = () => {
    navigator.clipboard.writeText(linkFull);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const canjearInvitador = async () => {
    if (yaTieneRef) return;
    const code = redeemInput.trim().toUpperCase();
    if (code.length < 4 || code === miCodigo) return setRedeemMsg("❌ Código inválido.");

    const allSnap = await get(ref(db, "usuarios"));
    const all = allSnap.val() || {};
    const inviter = Object.keys(all).find(k => all[k].codigoReferido === code);
    if (!inviter) return setRedeemMsg("❌ No encontrado.");

    await update(ref(db, `usuarios/${uid}`), {
      referido: code,
      saldoBonos: (all[uid]?.saldoBonos || 0) + 2000
    });
    if (all[inviter]?.paquetes)
      await update(ref(db, `usuarios/${inviter}`), {
        saldoBonos: (all[inviter].saldoBonos || 0) + 6000
      });

    setYaTieneRef(true);
    setMiInvitador(all[inviter].nombre ?? "(sin nombre)");
    setRedeemMsg("🎉 ¡Felicidades! Canjeaste $2.000 a tu saldo de bonos");
  };

  const canjearPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (code.length < 4) return setPromoMsg("❌ Código inválido.");
    const snap = await get(ref(db, `promoCodes/${code}`));
    if (!snap.exists()) return setPromoMsg("❌ No existe.");
    const d = snap.val();
    if (d.usado) return setPromoMsg("❌ Ya usado.");
    if (d.expira < Date.now()) return setPromoMsg("❌ Expirado.");

    const bonoAct = (await get(ref(db, `usuarios/${uid}/saldoBonos`))).val() || 0;
    await update(ref(db, `usuarios/${uid}`), { saldoBonos: bonoAct + (d.valor || 0) });
    await update(ref(db, `promoCodes/${code}`), { usado: true, uid });

    setPromoMsg(`🎉 ¡Felicidades! Canjeaste $${COP(d.valor)} a tu saldo de bonos`);
    setPromoInput("");
  };

  return (
    <main style={styles.bg}>
      <div style={styles.wrap}>
        <h1 style={styles.title}>🎁 Bonos y Recompensas</h1>
        <p style={styles.subtitle}>Comparte tu código o canjea uno para ganar.</p>

        {/* Código propio */}
        <section style={styles.card}>
          <p>Tu código:</p>
          <h2 style={styles.codigo}>{miCodigo}</h2>
          <button onClick={copiar} style={styles.btnGold}>
            {copiado ? "✅ Copiado" : "📋 Copiar enlace"}
          </button>

          <div style={styles.socials}>
            <a href={`https://wa.me/?text=${encodeURIComponent("Únete a CartAI 👉 " + linkFull)}`} target="_blank" rel="noreferrer" style={styles.btnGreen}>🟢 WhatsApp</a>
            <a href={`https://t.me/share/url?url=${encodeURIComponent(linkFull)}&text=${encodeURIComponent("¡Gana con CartAI! 🚀")}`} target="_blank" rel="noreferrer" style={styles.btnCyan}>🔵 Telegram</a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(linkFull)}`} target="_blank" rel="noreferrer" style={styles.btnBlue}>🔵 Facebook</a>
            <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(linkFull)}&text=${encodeURIComponent("Gana con CartAI 🎁")}`} target="_blank" rel="noreferrer" style={styles.btnDark}>⚫ X</a>
          </div>
        </section>

        {/* Canjear invitador */}
        {!yaTieneRef && (
          <section style={styles.card}>
            <h3 style={styles.cardTitle}>Canjear código de invitador</h3>
            <input
              value={redeemInput}
              onChange={e => setRedeemInput(e.target.value.toUpperCase())}
              placeholder="Código invitador"
              style={styles.input}
            />
            {redeemMsg && <p>{redeemMsg}</p>}
            <button onClick={canjearInvitador} style={styles.btnGreen}>Canjear invitación</button>
          </section>
        )}

        {/* Invitador visible */}
        {yaTieneRef && (
          <section style={styles.card}>
            <p>Te invitó:</p>
            <h3 style={{ ...styles.cardTitle, color: "#4ade80" }}>{miInvitador}</h3>
          </section>
        )}

        {/* Código promocional */}
        <section style={styles.card}>
          <h3 style={styles.cardTitle}>Canjear código promocional</h3>
          <input
            value={promoInput}
            onChange={e => setPromoInput(e.target.value.toUpperCase())}
            placeholder="Código promo"
            style={styles.input}
          />
          {promoMsg && <p>{promoMsg}</p>}
          <button onClick={canjearPromo} style={styles.btnPurple}>Canjear bono</button>
        </section>

        {/* Lista referidos */}
        <section style={styles.card}>
          <h3 style={styles.cardTitle}>Tus referidos</h3>
          {referidos.length === 0
            ? <p style={{ opacity: 0.7 }}>Aún sin referidos.</p>
            : (
              <ul style={{ listStyle: "none", padding: 0 }}>
                {referidos.map((r, i) => (
                  <li key={i} style={styles.refItem}>
                    <span>{r.nombre ?? "Sin nombre"}</span>
                    <span style={{ fontSize: 13 }}>
                      {r.paquetes ? "🟢 Activo" : r.iaActiva ? "🟡 Solo IA" : "🔴 Inactivo"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
        </section>
      </div>
    </main>
  );
}

/* Estilos animados y 3D */
const styles = {
  bg: {
    minHeight: "100vh",
    padding: "50px 20px 80px",
    background: "linear-gradient(135deg,#0f172a,#1e293b 40%,#065f46)",
    backgroundSize: "600% 600%",
    animation: "floatBg 30s linear infinite",
    color: "#fff",
    display: "flex",
    justifyContent: "center",
  },
  wrap: { maxWidth: 600, width: "100%", display: "flex", flexDirection: "column", gap: 30 },
  title: { fontSize: "2rem", fontWeight: 800, textAlign: "center" },
  subtitle: { textAlign: "center", opacity: 0.85 },
  card: {
    backdropFilter: "blur(10px)",
    background: "rgba(255,255,255,.05)",
    borderRadius: 20,
    padding: 24,
    boxShadow: "0 8px 18px #000a",
  },
  cardTitle: { fontSize: 18, fontWeight: 700, marginBottom: 12 },
  codigo: { fontSize: 24, fontWeight: 800, color: "#facc15", marginBottom: 12 },
  input: {
    width: "100%",
    background: "rgba(255,255,255,.15)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    color: "#fff",
    border: "none",
    fontSize: 16,
    textAlign: "center",
  },
  btnGold: {
    background: "linear-gradient(90deg,#facc15,#eab308)",
    color: "#000",
    padding: "12px 20px",
    borderRadius: 12,
    fontWeight: 700,
    fontSize: "1rem",
    border: "none",
    cursor: "pointer",
    marginBottom: 12,
    boxShadow: "4px 4px 14px #000a",
  },
  btnGreen: {
    background: "linear-gradient(90deg,#4ade80,#22c55e)",
    color: "#fff",
    padding: "12px 20px",
    borderRadius: 12,
    fontWeight: 700,
    fontSize: "1rem",
    border: "none",
    cursor: "pointer",
    boxShadow: "4px 4px 14px #000a",
  },
  btnCyan: {
    background: "linear-gradient(90deg,#38bdf8,#0ea5e9)",
    color: "#fff",
    padding: "12px 20px",
    borderRadius: 12,
    fontWeight: 700,
    fontSize: "1rem",
    border: "none",
    cursor: "pointer",
    boxShadow: "4px 4px 14px #000a",
  },
  btnBlue: {
    background: "linear-gradient(90deg,#3b82f6,#2563eb)",
    color: "#fff",
    padding: "12px 20px",
    borderRadius: 12,
    fontWeight: 700,
    fontSize: "1rem",
    border: "none",
    cursor: "pointer",
    boxShadow: "4px 4px 14px #000a",
  },
  btnDark: {
    background: "linear-gradient(90deg,#111827,#1f2937)",
    color: "#fff",
    padding: "12px 20px",
    borderRadius: 12,
    fontWeight: 700,
    fontSize: "1rem",
    border: "none",
    cursor: "pointer",
    boxShadow: "4px 4px 14px #000a",
  },
  btnPurple: {
    background: "linear-gradient(90deg,#a855f7,#9333ea)",
    color: "#fff",
    padding: "12px 20px",
    borderRadius: 12,
    fontWeight: 700,
    fontSize: "1rem",
    border: "none",
    cursor: "pointer",
    boxShadow: "4px 4px 14px #000a",
  },
  socials: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    marginTop: 12,
  },
  refItem: {
    background: "rgba(255,255,255,.04)",
    padding: "10px 14px",
    margin: "6px 0",
    borderRadius: 10,
    display: "flex",
    justifyContent: "space-between",
  },
};