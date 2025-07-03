import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { ref, onValue, set } from "firebase/database";
import { v4 as uuidv4 } from "uuid";

/* ──────── PAQUETES ──────── */
const dailyPacks = [
  {
    id: "ai-starter",
    nombre: "AI Starter",
    icono: "🚀",
    consejo: "Ideal para comenzar con poco y ver resultados rápidos.",
    inversion: 50000,
    ganDia: 15000,
    dur: 90,
    color: "from-purple-500 to-purple-700",
  },
  {
    id: "quantum-silver",
    nombre: "Quantum Silver",
    icono: "💠",
    consejo: "Estabilidad diaria para quienes buscan retornos consistentes.",
    inversion: 120000,
    ganDia: 12000,
    dur: 90,
    color: "from-blue-500 to-blue-700",
  },
  {
    id: "deep-gold",
    nombre: "Deep Learning Gold",
    icono: "🥇",
    consejo: "Opción premium para inversores experimentados.",
    inversion: 200000,
    ganDia: 12000,
    dur: 90,
    color: "from-green-500 to-green-700",
  },
  {
    id: "neural-bronze",
    nombre: "Neural Bronze",
    icono: "🧠",
    consejo: "Paquete compacto con retorno atractivo a corto plazo.",
    inversion: 50000,
    ganDia: 7500,
    dur: 35,
    color: "from-amber-500 to-amber-700",
  },
  {
    id: "cognitive-plat",
    nombre: "Cognitive Platinum",
    icono: "💎",
    consejo: "Ideal para quienes planean a largo plazo con IA.",
    inversion: 110000,
    ganDia: 5610,
    dur: 150,
    color: "from-cyan-500 to-cyan-700",
  },
  {
    id: "micro-ia",
    nombre: "Micro IA",
    icono: "📦",
    consejo: "Inversión pequeña para probar sin arriesgar mucho.",
    inversion: 40000,
    ganDia: 1200,
    dur: 180,
    color: "from-teal-500 to-teal-700",
  },
  {
    id: "quantum-diamond",
    nombre: "Quantum Diamond",
    icono: "💎",
    consejo: "Excelente opción para diversificar con alto rendimiento.",
    inversion: 240000,
    ganDia: 24000,
    dur: 90,
    color: "from-fuchsia-500 to-fuchsia-700",
  },
  {
    id: "ultra-express",
    nombre: "Ultra IA Express",
    icono: "⚡",
    consejo: "Ideal si necesitas retorno rápido y efectivo.",
    inversion: 250000,
    ganDia: 5750,
    dur: 40,
    color: "from-rose-500 to-rose-700",
  },
];

const fixedPacks = [
  {
    id: "fix-600",
    nombre: "Future 600K",
    icono: "📈",
    consejo: "Recibe una gran suma después de 90 días.",
    inversion: 50000,
    pagoFinal: 600000,
    dur: 90,
    color: "from-indigo-500 to-indigo-700",
  },
  {
    id: "fix-650",
    nombre: "Future 650K",
    icono: "🌟",
    consejo: "Aumenta tu retorno con una inversión media.",
    inversion: 90000,
    pagoFinal: 650000,
    dur: 90,
    color: "from-lime-500 to-lime-700",
  },
  {
    id: "fix-700",
    nombre: "Future 700K",
    icono: "🏁",
    consejo: "Perfecto para planes a mediano plazo.",
    inversion: 120000,
    pagoFinal: 700000,
    dur: 90,
    color: "from-sky-500 to-sky-700",
  },
  {
    id: "fix-800",
    nombre: "Future 800K",
    icono: "💰",
    consejo: "Maximiza tu inversión con mayor rentabilidad.",
    inversion: 150000,
    pagoFinal: 800000,
    dur: 90,
    color: "from-emerald-500 to-emerald-700",
  },
  {
    id: "fix-1M",
    nombre: "Future 1M",
    icono: "👑",
    consejo: "La mejor opción para grandes inversionistas.",
    inversion: 200000,
    pagoFinal: 1000000,
    dur: 90,
    color: "from-orange-500 to-orange-700",
  },
];

/* ──────── COMPONENTE PRINCIPAL ──────── */
export default function Invest() {
  const [packCounts, setPackCounts] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const u = auth.currentUser;
    if (!u) return;
    const pRef = ref(db, `usuarios/${u.uid}/paquetes`);
    const off = onValue(pRef, (snap) => {
      const counts = {};
      if (snap.exists()) {
        Object.values(snap.val()).forEach((p) => {
          counts[p.id] = (counts[p.id] || 0) + 1;
        });
      }
      setPackCounts(counts);
    });
    return () => off();
  }, []);

  const invertir = async (pack) => {
    const uid = auth.currentUser.uid;
    const pagoId = uuidv4();

    await set(ref(db, `pagosPendientes/${uid}/${pagoId}`), {
      pagoId,
      uid,
      paqueteId: pack.id,
      paqueteNom: pack.nombre,
      inversion: pack.inversion,
      durDias: pack.dur,
      tipo: pack.ganDia ? "diario" : "final",
      fecha: new Date().toISOString(),
      estado: "pendiente",
    });

    navigate("/payment", { state: { paquete: pack, pagoId } });
  };

  return (
    <main className="min-h-screen bg-gradient-to-tr from-[#141e30] to-[#243b55] p-6 text-white">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold drop-shadow-lg">📦 Paquetes de Inversión</h1>
          <p className="text-gray-300 mt-2 text-lg">Elige tu paquete ideal y deja que la IA multiplique tu inversión.</p>
        </header>

        <PackGroup titulo="💵 Ganancia diaria" lista={dailyPacks} counts={packCounts} onBuy={invertir} />
        <PackGroup titulo="🏁 Pago único al final" lista={fixedPacks} counts={packCounts} onBuy={invertir} />
      </div>
    </main>
  );
}

/* ──────── COMPONENTE DE GRUPO ──────── */
const PackGroup = ({ titulo, lista, counts, onBuy }) => (
  <section>
    <h2 className="text-2xl font-semibold mb-4 border-b border-white/30 pb-2">{titulo}</h2>
    <div className="grid md:grid-cols-3 gap-8">
      {lista.map((p) => (
        <div
          key={p.id}
          className={`relative rounded-3xl bg-gradient-to-br ${p.color} p-6 shadow-2xl flex flex-col gap-4 transform transition-all hover:scale-[1.03]`}
        >
          {counts[p.id] && (
            <span className="absolute -top-3 right-3 bg-yellow-400 text-black text-xs font-bold py-1 px-3 rounded-full shadow">
              {counts[p.id]}×
            </span>
          )}

          <div className="space-y-2">
            <h3 className="text-2xl font-bold flex items-center gap-2">
              {p.icono} {p.nombre}
            </h3>
            <p>💸 Inversión: <b>${p.inversion.toLocaleString()}</b></p>
            {p.ganDia && <p>📈 Ganas diario: <b>${p.ganDia.toLocaleString()}</b></p>}
            {p.pagoFinal && <p>🎯 Pago final: <b>${p.pagoFinal.toLocaleString()}</b></p>}
            <p>⏳ Duración: <b>{p.dur} días</b></p>
            <p className="text-sm italic text-white/80 mt-2">💡 {p.consejo}</p>
          </div>

          <button
            onClick={() => onBuy(p)}
            className="mt-auto py-3 px-4 rounded-lg font-semibold bg-white text-black hover:bg-yellow-300 shadow-md transition-all"
          >
            🛒 Invertir ahora
          </button>
        </div>
      ))}
    </div>
  </section>
);