import React, { useEffect, useState } from "react";
import { getDatabase, ref, onValue, update, get, remove } from "firebase/database";
import { getAuth } from "firebase/auth";

export default function Referrals() {
  const db  = getDatabase();
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
  const [toast, setToast] = useState("");

  const COP = n => n?.toLocaleString("es-CO") ?? "0";
  const genCode = id => id.slice(0,3).toUpperCase() + Math.floor(100 + Math.random() * 900);

  useEffect(() => {
    if (!uid) return;
    const uRef = ref(db, `usuarios/${uid}`);

    onValue(uRef, snap => {
      const d = snap.val() || {};
      if (!d.codigoReferido) {
        const nuevo = genCode(uid);
        update(uRef, { codigoReferido: nuevo });
        setMiCodigo(nuevo);
      } else setMiCodigo(d.codigoReferido);

      if (d.referido) {
        setYaTieneRef(true);
        get(ref(db, "usuarios")).then(s => {
          const all = s.val() || {};
          const invKey = Object.keys(all).find(k => all[k].codigoReferido === d.referido);
          if (invKey) setMiInvitador(all[invKey].nombre ?? "(sin nombre)");
        });
      }

      if (d.notiBono) {
        setToast(`🎉 ¡Recibiste $${COP(d.notiBono)} en bonos!`);
        remove(ref(db, `usuarios/${uid}/notiBono`));
        setTimeout(() => setToast(""), 3500);
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
    await update(ref(db, `usuarios/${inviter}`), {
      saldoBonos: (all[inviter]?.saldoBonos || 0) + 4000,
      notiBono: 4000
    });

    setYaTieneRef(true);
    setMiInvitador(all[inviter].nombre ?? "(sin nombre)");
    setRedeemMsg("🎉 ¡Canjéaste $2 000 COP!");
    setToast("🎉 ¡Canjéaste $2 000 COP!");
    setTimeout(() => setToast(""), 3500);
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
    await update(ref(db, `usuarios/${uid}`), {
      saldoBonos: bonoAct + (d.valor || 0)
    });
    await update(ref(db, `promoCodes/${code}`), {
      usado: true, uid
    });

    setPromoMsg(`🎉 ¡Canjéaste $${COP(d.valor)} COP!`);
    setToast(`🎉 ¡Canjéaste $${COP(d.valor)} COP!`);
    setPromoInput("");
    setTimeout(() => setToast(""), 3500);
  };

  return (
    <main style={styles.bg}>
      {toast && (
        <div style={styles.toast}>{toast}</div>
      )}
      <div style={styles.container}>
        <header style={styles.header}>
          <h1>🎁 Bonos y Recompensas</h1>
          <p>Comparte tu enlace, canjea códigos y gana más.</p>
        </header>

        <section style={styles.card}>
          <p>Tu código:</p>
          <h2 style={styles.code}>{miCodigo}</h2>
          <div style={styles.shareRow}>
            <button onClick={copiar} style={styles.btn}>
              {copiado ? "✅ Copiado" : "📋 Copiar enlace"}
            </button>
            <a href={`https://wa.me/?text=${encodeURIComponent("¡Únete a CartAI! 🚀 Recibe $2 000 COP al registrarte 👉 " + linkFull)}`}
               target="_blank" rel="noreferrer" style={styles.btn}>🟢 WhatsApp</a>
            <a href={`https://t.me/share/url?url=${encodeURIComponent(linkFull)}&text=${encodeURIComponent("Recibe $2 000 COP al registrarte")}`}
               target="_blank" rel="noreferrer" style={styles.btn}>🔵 Telegram</a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(linkFull)}`}
               target="_blank" rel="noreferrer" style={styles.btn}>🔵 Facebook</a>
            <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(linkFull)}&text=${encodeURIComponent("Recibe $2 000 COP al registrarte")}`}
               target="_blank" rel="noreferrer" style={styles.btn}>⚫ X</a>
          </div>
        </section>

        {yaTieneRef ? (
          <section style={styles.card}>
            <p>Te invitó: <strong style={{ color: "#4ade80" }}>{miInvitador}</strong></p>
          </section>
        ) : (
          <section style={styles.card}>
            <h3>Canjear código de invitador</h3>
            <input
              value={redeemInput}
              onChange={e => setRedeemInput(e.target.value.toUpperCase())}
              placeholder="Código"
              style={styles.input}
            />
            {redeemMsg && <p>{redeemMsg}</p>}
            <button onClick={canjearInvitador} style={styles.btn}>Canjear invitación</button>
          </section>
        )}

        <section style={styles.card}>
          <h3>Canjear código promocional</h3>
          <input
            value={promoInput}
            onChange={e => setPromoInput(e.target.value.toUpperCase())}
            placeholder="Código promo"
            style={styles.input}
          />
          {promoMsg && <p>{promoMsg}</p>}
          <button onClick={canjearPromo} style={styles.btn}>Canjear bono</button>
        </section>

        <section>
          <h3>Tus referidos</h3>
          {referidos.length === 0 ? (
            <p style={styles.noRef}>Aún sin referidos.</p>
          ) : (
            referidos.map((r, i) => (
              <div key={i} style={styles.referidoRow}>
                <span>{r.nombre || "Sin nombre"}</span>
                <span>{r.paquetes ? "🟢 Activo" : r.iaActiva ? "🟡 Solo IA" : "🔴 Inactivo"}</span>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}

const styles = {
  bg: {
    minHeight: "100vh",
    padding: "50px 20px 80px",
    background: "linear-gradient(135deg,#0f172a,#1e293b 40%,#065f46)",
    backgroundSize: "600% 600%",
    animation: "floatBg 30s linear infinite",
    color: "#fff",
  },
  toast: {
    position: "fixed",
    top: 20,
    left: "50%",
    transform: "translateX(-50%)",
    background: "#22c55e",
    padding: "12px 24px",
    borderRadius: 24,
    boxShadow: "0px 4px 12px rgba(0,0,0,0.4)",
    animation: "pulse 2s infinite"
  },
  container: {
    maxWidth: 600,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 24,
    textAlign: "center"
  },
  header: { fontSize: 24 },
  card: {
    backdropFilter: "blur(10px)",
    background: "rgba(255,255,255,0.05)",
    padding: 24,
    borderRadius: 20,
    boxShadow: "0 8px 18px rgba(0,0,0,0.6)"
  },
  code: {
    fontSize: 28,
    color: "#facc15",
    margin: "12px 0"
  },
  shareRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
    marginTop: 12
  },
  btn: {
    padding: "10px 20px",
    background: "linear-gradient(90deg,#38bdf8,#0ea5e9)",
    color: "#fff",
    border: "none",
    borderRadius: 18,
    fontWeight: 700,
    boxShadow: "4px 4px 14px rgba(0,0,0,0.4)",
    cursor: "pointer",
    transition: "transform 0.2s",
  },
  input: {
    width: "100%",
    padding: 10,
    borderRadius: 10,
    border: "none",
    background: "rgba(255,255,255,0.1)",
    color: "#fff",
    marginBottom: 12
  },
  noRef: { opacity: 0.6 },
  referidoRow: {
    backdropFilter: "blur(8px)",
    background: "rgba(255,255,255,0.04)",
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    display: "flex",
    justifyContent: "space-between"
  }
};