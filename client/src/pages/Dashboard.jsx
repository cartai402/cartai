import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { ref, onValue, set, update } from "firebase/database";
import clsx from "clsx";

const COP = (n) => n.toLocaleString("es-CO");
const hoyISO = () => new Date().toISOString().split("T")[0];
const diasEntre = (isoDate) => {
  if (!isoDate) return 0;
  const d1 = new Date(isoDate);
  const d2 = new Date();
  return Math.floor((d2 - d1) / 864e5);
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [iaModal, setIaModal] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      const uid = user.uid;
      const userRef = ref(db, `usuarios/${uid}`);
      onValue(userRef, (snap) => {
        if (snap.exists()) setData(snap.val());
        else {
          const def = {
            iaActiva: false,
            iaSaldo: 0,
            iaInicio: null,
            iaUltimoReclamo: null,
            saldoInversion: 0,
            saldoGanado: 0,
            saldoBonos: 0,
            paquetes: {},
            movimientos: [],
          };
          set(userRef, def);
          setData(def);
        }
      });
    });
    return () => unsub();
  }, []);

  const activarIA = () => {
    const uid = auth.currentUser.uid;
    update(ref(db, `usuarios/${uid}`), {
      iaActiva: true,
      iaInicio: hoyISO(),
      iaUltimoReclamo: "",
    });
    setIaModal(false);
  };

  const reclamarIA = () => {
    if (!data?.iaActiva) return;
    const uid = auth.currentUser.uid;
    const hoy = hoyISO();
    if (data.iaUltimoReclamo === hoy) return;
    update(ref(db, `usuarios/${uid}`), {
      iaSaldo: (data.iaSaldo || 0) + 1000,
      saldoBonos: (data.saldoBonos || 0) + 1000,
      iaUltimoReclamo: hoy,
    });
  };

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Cargando...
      </div>
    );
  }

  const [nombre] = auth.currentUser.displayName?.split("|") || ["Usuario"];
  const {
    iaActiva,
    iaSaldo = 0,
    iaInicio,
    iaUltimoReclamo,
    saldoInversion = 0,
    saldoGanado = 0,
    saldoBonos = 0,
    paquetes = {},
    movimientos = [],
  } = data;

  const IA_DIAS_TOTALES = 60;
  const iaDiasPasados = iaInicio ? diasEntre(iaInicio) : 0;
  const iaPct = Math.min(
    Math.round((iaDiasPasados / IA_DIAS_TOTALES) * 100),
    100
  );
  const iaPuedeReclamar =
    iaActiva && iaUltimoReclamo !== hoyISO() && iaDiasPasados < IA_DIAS_TOTALES;

  const packs = Object.values(paquetes).sort(
    (a, b) => new Date(a.fecha) - new Date(b.fecha)
  );
  const movs = [...movimientos]
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#0f2027] via-[#203a43] to-[#2c5364] text-white px-4">
      {/* Botones fijos arriba */}
      <nav className="flex flex-wrap gap-3 justify-center py-6">
        <MenuButton to="/dashboard" emoji="🏠" label="Dashboard" />
        <MenuButton to="/invest" emoji="💼" label="Invertir" />
        <MenuButton to="/withdraw" emoji="💸" label="Retirar" />
        <MenuButton to="/referrals" emoji="📨" label="Invitar" />
        <MenuButton to="/game" emoji="🎮" label="Jugar" />
      </nav>

      {/* Modal IA */}
      {!iaActiva && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center">
          <div className="bg-white text-black rounded-lg shadow-2xl max-w-lg p-6 space-y-4 text-center">
            <h2 className="text-2xl font-bold text-green-700">
              ¡Felicidades! 🎉
            </h2>
            <p>
              Has sido seleccionado para activar la IA gratuita. Obtén $1.000
              diarios por 60 días.
            </p>
            <p>
              Esta IA está diseñada para ayudarte a familiarizarte con la
              inversión recuerda que para retirarlo debes contar con un paquete activo .
            </p>
            <button
              onClick={activarIA}
              className="mt-4 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded shadow-lg transition"
            >
              Activar IA gratuita
            </button>
          </div>
        </div>
      )}

      {/* Saludo */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold">Bienvenido, {nombre} 👋</h1>
        <p className="text-gray-300">Resumen de tu inversión</p>
      </div>

      {/* IA Widget */}
      {iaActiva && (
        <section className="bg-white/10 rounded-xl p-6 mb-10 shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-yellow-300">🤖 IA gratuita</h2>
            <span className="text-sm">{IA_DIAS_TOTALES - iaDiasPasados} días restantes</span>
          </div>
          <p>
            Saldo acumulado: <strong>${COP(iaSaldo)}</strong>
          </p>
          <div className="w-full bg-white/20 rounded-full h-3">
            <div
              style={{ width: `${iaPct}%` }}
              className="h-full bg-gradient-to-r from-yellow-400 to-green-400 rounded-full"
            />
          </div>
          <p className="text-right text-sm">{iaPct}% de $60.000</p>
          <button
            onClick={reclamarIA}
            disabled={!iaPuedeReclamar}
            className={clsx(
              "w-full py-2 rounded font-bold transition",
              iaPuedeReclamar
                ? "bg-green-400 hover:bg-green-500 text-black shadow-lg"
                : "bg-gray-400 cursor-not-allowed"
            )}
          >
            {iaPuedeReclamar ? "Reclamar $1 000 de hoy" : "Reclamado hoy"}
          </button>
        </section>
      )}

      {/* Métricas */}
      <div className="grid sm:grid-cols-3 gap-6 mb-12">
        <Metric title="Invertido" value={saldoInversion} color="yellow" />
        <Metric title="Ganado" value={saldoGanado} color="green" />
        <Metric title="Bonos" value={saldoBonos} color="blue" />
      </div>

      {/* Paquetes */}
      <SectionTitle>📦 Paquetes activos</SectionTitle>
      {packs.length === 0 ? (
        <p className="text-gray-300">Aún no tienes paquetes.</p>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6 mb-12">
          {packs.map((p) => (
            <PackageCard key={p.id} p={p} />
          ))}
        </div>
      )}

      {/* Movimientos */}
      <SectionTitle>📝 Últimos movimientos</SectionTitle>
      <MovList movs={movs} />

      {/* Final */}
      <SectionTitle>🌟 ¿Por qué invertir con nosotros?</SectionTitle>
      <div className="bg-white/10 p-6 rounded-xl text-sm text-gray-200 shadow-xl leading-relaxed mb-10">
        <p>
          CartAI combina tecnología de punta con simulación real de mercados
          para ofrecerte una experiencia educativa y rentable. Nuestra IA
          gratuita es solo el comienzo: al invertir con nosotros, accedes a
          paquetes con rentabilidad asegurada, atención personalizada y una
          comunidad en crecimiento. Ideal tanto para principiantes como para
          inversionistas experimentados.
        </p>
      </div>
    </div>
  );
}

const MenuButton = ({ to, emoji, label }) => (
  <Link
    to={to}
    className="bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-lg shadow-lg font-bold transition transform hover:scale-105"
  >
    {emoji} {label}
  </Link>
);

const SectionTitle = ({ children }) => (
  <h2 className="text-2xl font-semibold border-b border-white/20 pb-2 mb-4">
    {children}
  </h2>
);

function Metric({ title, value, color }) {
  const c =
    color === "green"
      ? "text-green-400"
      : color === "blue"
      ? "text-blue-400"
      : "text-yellow-400";
  return (
    <div className="bg-white/10 rounded-xl p-6 text-center shadow-lg">
      <p className="text-sm text-gray-300">{title}</p>
      <h3 className={`text-3xl font-bold ${c}`}>${COP(value)}</h3>
    </div>
  );
}

const PackageCard = ({ p }) => {
  const pct = Math.round(
    ((p.diasTotales - p.diasRestantes) / p.diasTotales) * 100
  );
  return (
    <div className="bg-white/10 rounded-xl p-6 shadow-lg space-y-3">
      <div className="flex justify-between">
        <h4 className="font-bold">{p.nombre}</h4>
        <span className="text-sm text-gray-300">
          {p.diasRestantes}/{p.diasTotales} días
        </span>
      </div>
      <p className="text-sm">💸 Invertido: ${COP(p.invertido)}</p>
      <p className="text-sm">🏁 Total: ${COP(p.total)}</p>
      <div className="w-full bg-white/20 h-3 rounded-full">
        <div
          style={{ width: `${pct}%` }}
          className="h-full bg-gradient-to-r from-yellow-400 to-green-400 rounded-full"
        />
      </div>
      <p className="text-right text-xs">{pct}%</p>
    </div>
  );
};

const MovList = ({ movs }) => (
  <ul className="space-y-3 mb-10">
    {movs.map((m, idx) => (
      <li
        key={idx}
        className="bg-white/10 p-4 rounded-lg flex justify-between items-center shadow"
      >
        <span>{m.concepto}</span>
        <span
          className={clsx(
            "font-semibold",
            m.monto.startsWith("-") ? "text-red-400" : "text-green-400"
          )}
        >
          {m.monto}
        </span>
        <span className="text-xs text-gray-400">{m.fecha}</span>
      </li>
    ))}
  </ul>
);