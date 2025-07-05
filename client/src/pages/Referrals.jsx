import React, { useEffect, useState } from "react";
import { getDatabase, ref, onValue, update, get } from "firebase/database";
import { getAuth } from "firebase/auth";

export default function Referrals() {
  const db  = getDatabase();
  const uid = getAuth().currentUser?.uid;

  const [miCodigo, setMiCodigo]     = useState("");
  const [linkFull, setLinkFull]     = useState("");
  const [referidos, setReferidos]   = useState([]);
  const [copiado, setCopiado]       = useState(false);

  /* Invitador */
  const [yaTieneRef,  setYaTieneRef]  = useState(false);
  const [miInvitador, setMiInvitador] = useState(null);
  const [redeemInput, setRedeemInput] = useState("");
  const [redeemMsg,   setRedeemMsg]   = useState("");

  /* Promo */
  const [promoInput, setPromoInput] = useState("");
  const [promoMsg,   setPromoMsg]   = useState("");

  const COP = n => n?.toLocaleString("es-CO") ?? "0";
  const genCode = id =>
    id.slice(0, 3).toUpperCase() + Math.floor(100 + Math.random() * 900);

  /* ─── carga inicial ─── */
  useEffect(() => {
    if (!uid) return;

    const userRef = ref(db, `usuarios/${uid}`);

    onValue(userRef, snap => {
      const d = snap.val() || {};

      /* código propio */
      if (!d.codigoReferido) {
        const nuevo = genCode(uid);
        update(userRef, { codigoReferido: nuevo });
        setMiCodigo(nuevo);
      } else setMiCodigo(d.codigoReferido);

      /* invitador */
      if (d.referido) {
        setYaTieneRef(true);
        get(ref(db, "usuarios")).then(s => {
          const all = s.val() || {};
          const key = Object.keys(all).find(
            k => all[k].codigoReferido === d.referido
          );
          if (key) setMiInvitador(all[key].nombre ?? "(sin nombre)");
        });
      }

      setLinkFull(
        `${window.location.origin}/register?ref=${d.codigoReferido ?? ""}`
      );
    });

    /* gente que YO invité */
    const allRef = ref(db, "usuarios");
    onValue(allRef, snap => {
      const users = snap.val() || {};
      const lista = Object.values(users).filter(u => u.referido === miCodigo);
      setReferidos(lista.reverse());
    });
  }, [uid, miCodigo]);

  /* ─── acciones ─── */
  const copiar = () => {
    navigator.clipboard.writeText(linkFull);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  /* canjear invitador */
  const canjearInvitador = async () => {
    if (yaTieneRef) return;
    const code = redeemInput.trim().toUpperCase();
    if (code.length < 4 || code === miCodigo)
      return setRedeemMsg("❌ Código inválido.");

    const allSnap = await get(ref(db, "usuarios"));
    const all = allSnap.val() || {};
    const invKey = Object.keys(all).find(k => all[k].codigoReferido === code);
    if (!invKey) return setRedeemMsg("❌ No encontrado.");

    /* bonos */
    await update(ref(db, `usuarios/${uid}`), {
      referido: code,
      saldoBonos: (all[uid]?.saldoBonos || 0) + 2000,
    });
    if (all[invKey]?.paquetes) {
      await update(ref(db, `usuarios/${invKey}`), {
        saldoBonos: (all[invKey].saldoBonos || 0) + 6000,
      });
    }

    setYaTieneRef(true);
    setMiInvitador(all[invKey].nombre ?? "(sin nombre)");
    setRedeemMsg("🎉 ¡Felicidades! Canjeaste 2 000 COP a tu bono.");
  };

  /* canjear promo */
  const canjearPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (code.length < 4) return setPromoMsg("❌ Código inválido.");

    const snap = await get(ref(db, `promoCodes/${code}`));
    if (!snap.exists()) return setPromoMsg("❌ No existe.");
    const d = snap.val();
    if (d.usado)      return setPromoMsg("❌ Ya usado.");
    if (d.expira < Date.now())
      return setPromoMsg("❌ Expirado.");

    const bonoAct =
      (await get(ref(db, `usuarios/${uid}/saldoBonos`))).val() || 0;
    await update(ref(db, `usuarios/${uid}`), {
      saldoBonos: bonoAct + (d.valor || 0),
    });
    await update(ref(db, `promoCodes/${code}`), { usado: true, uid });

    setPromoMsg(
      `🎉 ¡Felicidades! Canjeaste $${COP(d.valor)} a tu saldo de bonos.`
    );
    setPromoInput("");
  };

  /* ─── UI ─── */
  return (
    <main style={styles.bg}>
      <h1 style={styles.h1}>🎁 Bonos y Recompensas</h1>

      {/* MI CODIGO */}
      <section style={styles.card}>
        <p>Tu código:</p>
        <h2 style={styles.code}>{miCodigo}</h2>

        <div style={styles.btnWrap}>
          <button onClick={copiar} style={styles.btn3d}>
            {copiado ? "✅ Copiado" : "📋 Copiar enlace"}
          </button>

          <a
            style={styles.btn3d}
            target="_blank"
            rel="noreferrer"
            href={`https://wa.me/?text=${encodeURIComponent(
              "¡Únete a CartAI! 🚀 " + linkFull
            )}`}
          >
            🟢 WhatsApp
          </a>

          <a
            style={styles.btn3d}
            target="_blank"
            rel="noreferrer"
            href={`https://t.me/share/url?url=${encodeURIComponent(
              linkFull
            )}&text=${encodeURIComponent("¡Gana con CartAI! 🚀")}`}
          >
            💬 Telegram
          </a>

          <a
            style={styles.btn3d}
            target="_blank"
            rel="noreferrer"
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
              linkFull
            )}`}
          >
            🔵 Facebook
          </a>
        </div>
      </section>

      {/* INVITADOR */}
      {yaTieneRef ? (
        <section style={styles.card}>
          <p>Te invitó:</p>
          <h3 style={styles.invitador}>{miInvitador}</h3>
        </section>
      ) : (
        <section style={styles.card}>
          <h3 style={styles.cardTitle}>Canjear código de invitador</h3>
          <input
            style={styles.input}
            value={redeemInput}
            onChange={e => setRedeemInput(e.target.value.toUpperCase())}
            placeholder="Código invitador"
          />
          {redeemMsg && <p style={styles.msg}>{redeemMsg}</p>}
          <button onClick={canjearInvitador} style={styles.btn3d}>
            Canjear invitación
          </button>
        </section>
      )}

      {/* PROMO */}
      <section style={styles.card}>
        <h3 style={styles.cardTitle}>Canjear código promocional</h3>
        <input
          style={styles.input}
          value={promoInput}
          onChange={e => setPromoInput(e.target.value.toUpperCase())}
          placeholder="Código promo"
        />
        {promoMsg && <p style={styles.msg}>{promoMsg}</p>}
        <button onClick={canjearPromo} style={styles.btn3d}>
          Canjear bono
        </button>
      </section>

      {/* REFERIDOS */}
      <section style={styles.card}>
        <h3 style={styles.cardTitle}>Tus referidos</h3>
        {referidos.length === 0 ? (
          <p style={styles.none}>Aún sin referidos.</p>
        ) : (
          <ul style={styles.list}>
            {referidos.map((r, i) => (
              <li key={i} style={styles.item}>
                <span>{r.nombre ?? "Sin nombre"}</span>
                <span style={styles.status}>
                  {r.paquetes
                    ? "🟢 Activo"
                    : r.iaActiva
                    ? "🟡 Solo IA"
                    : "🔴 Inactivo"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

/* ─── estilos inline ─── */
const styles = {
  bg: {
    minHeight: "100vh",
    padding: "50px 20px",
    background: "linear-gradient(135deg,#0f172a,#1e293b 40%,#065f46)",
    backgroundSize: "600% 600%",
    animation: "floatBg 30s linear infinite",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  h1: {
    fontSize: "2rem",
    fontWeight: 800,
    marginBottom: 24,
    textAlign: "center",
  },
  card: {
    backdropFilter: "blur(10px)",
    background: "rgba(255,255,255,.05)",
    padding: 24,
    borderRadius: 20,
    boxShadow: "0 8px 18px #000a",
    marginBottom: 24,
    width: "100%",
    maxWidth: 500,
    textAlign: "center",
  },
  code: {
    fontSize: "2.4rem",
    fontWeight: "bold",
    color: "#facc15",
    marginTop: 6,
  },
  cardTitle: { fontSize: "1.2rem", fontWeight: 600, marginBottom: 10 },
  btnWrap: {
    marginTop: 14,
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  btn3d: {
    padding: "10px 18px",
    background: "linear-gradient(90deg,#38bdf8,#0ea5e9)",
    color: "#fff",
    border: "none",
    borderRadius: 14,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "4px 4px 14px #000a",
    transition: "transform .2s",
  },
  input: {
    width: "100%",
    padding: "10px",
    borderRadius: 10,
    background: "rgba(255,255,255,.1)",
    border: "none",
    color: "#fff",
    marginBottom: 10,
    textAlign: "center",
  },
  msg: { fontSize: ".9rem", margin: "8px 0" },
  invitador: {
    fontSize: "1.6rem",
    fontWeight: "bold",
    color: "#22c55e",
    marginTop: 4,
  },
  none: { opacity: 0.6 },
  list: { listStyle: "none", padding: 0 },
  item: {
    background: "rgba(255,255,255,.04)",
    padding: "10px 14px",
    margin: "6px 0",
    borderRadius: 10,
    display: "flex",
    justifyContent: "space-between",
  },
  status: { fontSize: ".85rem" },
};
