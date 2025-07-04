// Invest.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { ref, onValue, set } from "firebase/database";
import { v4 as uuidv4 } from "uuid";

/* ───────── helpers ───────── */
const COP = (n) => n.toLocaleString("es-CO");

const dailyPacks = [
  { id: "ai-starter", nombre: "AI Starter", icono: "🧠", consejo: "Perfecto para comenzar.", inversion: 50000, ganDia: 15000, dur: 90, color: ["#7e4af3", "#533be0"] },
  { id: "quantum-silver", nombre: "Quantum Silver", icono: "💎", consejo: "Equilibrio riesgo/beneficio.", inversion: 120000, ganDia: 12000, dur: 90, color: ["#4b7bfd", "#4066e0"] },
  { id: "deep-gold", nombre: "Deep Learning Gold", icono: "🏆", consejo: "Retorno premium constante.", inversion: 200000, ganDia: 12000, dur: 90, color: ["#36c56e", "#2da55b"] },
  { id: "neural-bronze", nombre: "Neural Bronze", icono: "🥉", consejo: "Retorno rápido – 35 d.", inversion: 50000, ganDia: 7500, dur: 35, color: ["#d18822", "#b7721d"] },
  { id: "cognitive-plat", nombre: "Cognitive Platinum", icono: "⚙️", consejo: "Largo plazo y seguro.", inversion: 110000, ganDia: 5610, dur: 150, color: ["#25d1d6", "#1bb1b6"] },
  { id: "micro-ia", nombre: "Micro IA", icono: "🔬", consejo: "Prueba pequeña inversión.", inversion: 40000, ganDia: 1200, dur: 180, color: ["#16bfa2", "#109d84"] },
  { id: "quantum-diamond", nombre: "Quantum Diamond", icono: "💠", consejo: "Alto aporte, alto retorno.", inversion: 240000, ganDia: 24000, dur: 90, color: ["#ea38e0", "#c529c2"] },
  { id: "ultra-express", nombre: "Ultra IA Express", icono: "🚀", consejo: "Ganancia express – 40 d.", inversion: 250000, ganDia: 5750, dur: 40, color: ["#ff4d6e", "#d63e59"] },
];

const fixedPacks = [
  { id: "fix-600", nombre: "Future 600 K", icono: "📦", consejo: "Todo junto al final.", inversion: 50000, pagoFinal: 600000, dur: 90, color: ["#5d62ff", "#484bcc"] },
  { id: "fix-650", nombre: "Future 650 K", icono: "📈", consejo: "Mejora tu meta final.", inversion: 90000, pagoFinal: 650000, dur: 90, color: ["#9be52e", "#7fc020"] },
  { id: "fix-700", nombre: "Future 700 K", icono: "🌐", consejo: "Plan mediano plazo.", inversion: 120000, pagoFinal: 700000, dur: 90, color: ["#37c4ff", "#2ba1d4"] },
  { id: "fix-800", nombre: "Future 800 K", icono: "🌟", consejo: "Mayor rentabilidad final.", inversion: 150000, pagoFinal: 800000, dur: 90, color: ["#21e38f", "#1abb73"] },
  { id: "fix-1M", nombre: "Future 1 M",  icono: "💰", consejo: "La gran apuesta de 1 M.", inversion: 200000, pagoFinal: 1000000, dur: 90, color: ["#ff9432", "#d97829"] },
];

export default function Invest() {
  const [counts, setCounts] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const u = auth.currentUser;
    if (!u) return;
    const pRef = ref(db, `usuarios/${u.uid}/paquetes`);
    return onValue(pRef, (snap) => {
      const c = {};
      snap.exists() &&
        Object.values(snap.val()).forEach((p) => {
          c[p.id] = (c[p.id] || 0) + 1;
        });
      setCounts(c);
    });
  }, []);

  const buy = async (p) => {
    const uid = auth.currentUser.uid;
    const id = uuidv4();
    await set(ref(db, `pagosPendientes/${uid}/${id}`), {
      pagoId: id,
      paqueteId: p.id,
      paqueteNom: p.nombre,
      invertido: p.inversion,
      ganDia   : p.ganDia ?? null,
      pagoFinal: p.pagoFinal ?? null,
      durDias  : p.dur,
      tipo     : p.ganDia ? "diario" : "final",
      fecha    : Date.now(),
      estado   : "pendiente"
    });
    navigate("/payment", { state: { paquete: p, pagoId: id } });
  };

  return (
    <div style={styles.bg}>
      <Header />
      <PackSection title="💵 Ganancia diaria" list={dailyPacks} counts={counts} onBuy={buy} />
      <div style={{ height: 40 }} />
      <PackSection title="🏁 Pago único al final" list={fixedPacks} counts={counts} onBuy={buy} />
    </div>
  );
}

const Header = () => (
  <header style={{ textAlign: "center", marginBottom: 30 }}>
    <h1 style={{ fontSize: 32, fontWeight: 700 }}>📊 Paquetes de inversión</h1>
    <p style={{ opacity: 0.8 }}>Elige un plan y deja que la IA multiplique tu capital.</p>
  </header>
);

const PackSection = ({ title, list, counts, onBuy }) => (
  <section style={{ maxWidth: 1200, margin: "0 auto" }}>
    <h2 style={styles.sectionTitle}>{title}</h2>
    <div style={styles.grid}>
      {list.map((p) => (
        <PackCard key={p.id} p={p} bought={counts[p.id]} onBuy={onBuy} />
      ))}
    </div>
  </section>
);

const PackCard = ({ p, bought, onBuy }) => (
  <div style={{ ...styles.card, background: `linear-gradient(135deg, ${p.color[0]}, ${p.color[1]})` }}>
    {bought && <span style={styles.badge}>{bought}×</span>}
    <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>
      {p.icono} {p.nombre}
    </h3>
    <ul style={{ listStyle: "none", padding: 0, fontSize: 14, lineHeight: 1.5 }}>
      <li>💰 Inversión: <b>${COP(p.inversion)}</b></li>
      {p.ganDia && <li>📈 Ganas diario: <b>${COP(p.ganDia)}</b></li>}
      {p.pagoFinal && <li>🎯 Pago final: <b>${COP(p.pagoFinal)}</b></li>}
      <li>⏳ Duración: <b>{p.dur} días</b></li>
    </ul>
    <p style={{ fontSize: 12, fontStyle: "italic", opacity: 0.9, marginTop: 6 }}>
      💡 {p.consejo}
    </p>
    <button onClick={() => onBuy(p)} style={styles.buyBtn}>🛒 Invertir ahora</button>
  </div>
);

const styles = {
  bg: { background: "#0a0f1e", minHeight: "100vh", color: "white", padding: 20 },
  sectionTitle: { fontSize: 26, fontWeight: 600, borderBottom: "1px solid #ffffff33", paddingBottom: 8, marginBottom: 20 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 25 },
  card: { position: "relative", padding: 24, borderRadius: 22, boxShadow: "0 14px 40px rgba(0,0,0,.45)", display: "flex", flexDirection: "column", gap: 10, minHeight: 240 },
  badge: { position: "absolute", top: -10, right: -10, background: "#ffeb3b", color: "#000", fontSize: 12, fontWeight: "700", padding: "4px 10px", borderRadius: 999, boxShadow: "2px 2px 6px rgba(0,0,0,.4)" },
  buyBtn: { marginTop: "auto", padding: "12px 0", borderRadius: 14, fontWeight: 700, background: "#fff", color: "#000", border: "none", cursor: "pointer", boxShadow: "0 4px 10px rgba(0,0,0,.4)" },
};