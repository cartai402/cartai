import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { ref, onValue, set, update } from "firebase/database";
import clsx from "clsx";

/* Utilidades */
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
  const [sidebar, setSidebar] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);

  useEffect(() => {
    const offAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      const uid = user.uid;
      const userRef = ref(db, `usuarios/${uid}`);

      onValue(userRef, (snap) => {
        if (snap.exists()) {
          const val = snap.val();
          setData(val);
          if (!val.iaActiva) setMostrarModal(true);
        } else {
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
          setMostrarModal(true);
        }
      });
    });
    return () => offAuth();
  }, []);

  const activarIA = () => {
    const uid = auth.currentUser.uid;
    const hoy = hoyISO();
    update(ref(db, `usuarios/${uid}`), {
      iaActiva: true,
      iaInicio: hoy,
      iaUltimoReclamo: null,
      iaSaldo: 0,
    });
    setMostrarModal(false);
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
      <div className="min-h-screen flex items-center justify-center bg-black text-white animate-pulse">
        Cargando panel…
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
  const iaPct = Math.min(Math.round((iaDiasPasados / IA_DIAS_TOTALES) * 100), 100);
  const iaPuedeReclamar = iaActiva && iaUltimoReclamo !== hoyISO() && iaDiasPasados < IA_DIAS_TOTALES;

  const packs = Object.values(paquetes).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  const movs = [...movimientos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 5);

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#0f2027] via-[#203a43] to-[#2c5364] text-white">
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-white text-black rounded-lg shadow-2xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-2xl font-bold">🎉 ¡Felicidades!</h2>
            <p>Has sido seleccionado para usar nuestra IA gratuita durante 60 días.</p>
            <ul className="list-disc pl-5 text-sm text-gray-700">
              <li>Recibirás $1.000 diarios automáticamente.</li>
              <li>Los fondos se suman a tu saldo de bonos.</li>
              <li>No tienes que hacer nada, solo reclamar diario.</li>
            </ul>
            <button
              onClick={activarIA}
              className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded font-bold w-full shadow-lg"
            >
              Activar ahora
            </button>
          </div>
        </div>
      )}

      {/* Panel principal */}
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-12">
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Bienvenido, {nombre} 👋</h1>
          <p className="text-gray-300">Tu resumen de inversión y avances</p>
        </header>

        {/* Acciones principales */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <ActionCard to="/invest" icon="💼" label="Invertir" />
          <ActionCard to="/withdraw" icon="💸" label="Retirar" />
          <ActionCard to="/referrals" icon="📨" label="Invitar" />
          <ActionCard to="/game" icon="🎮" label="Jugar" />
        </section>

        {/* IA activa */}
        {iaActiva && (
          <section className="bg-white/10 rounded-xl p-6 space-y-3 shadow-xl border border-white/10">
            <h2 className="text-xl font-bold text-yellow-300">🤖 IA Gratuita</h2>
            <p className="text-sm text-gray-300">
              Saldo: <strong className="text-white">${COP(iaSaldo)}</strong> | Días restantes:{" "}
              {IA_DIAS_TOTALES - iaDiasPasados}
            </p>
            <div className="w-full bg-white/20 h-3 rounded-full">
              <div
                style={{ width: `${iaPct}%` }}
                className="h-full bg-gradient-to-r from-yellow-400 to-green-400 rounded-full transition-all"
              ></div>
            </div>
            <button
              onClick={reclamarIA}
              disabled={!iaPuedeReclamar}
              className={clsx(
                "w-full py-2 rounded font-bold transition mt-2",
                iaPuedeReclamar
                  ? "bg-green-400 hover:bg-green-500 text-black"
                  : "bg-gray-500 text-white cursor-not-allowed"
              )}
            >
              {iaPuedeReclamar ? "Reclamar $1.000 de hoy" : "Ya reclamado hoy"}
            </button>
          </section>
        )}

        {/* Métricas */}
        <section className="grid sm:grid-cols-3 gap-4">
          <Metric title="Invertido" value={saldoInversion} color="yellow" />
          <Metric title="Ganado" value={saldoGanado} color="green" />
          <Metric title="Bonos" value={saldoBonos} color="blue" />
        </section>

        {/* Paquetes activos */}
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">📦 Paquetes activos</h2>
          {packs.length === 0 ? (
            <p className="text-gray-400">No tienes paquetes aún.</p>
          ) : (
            <div className="grid lg:grid-cols-2 gap-6">
              {packs.map((p) => (
                <PackageCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </section>

        {/* Movimientos */}
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">📝 Últimos movimientos</h2>
          {movs.length === 0 ? (
            <p className="text-gray-400">Sin movimientos recientes.</p>
          ) : (
            <ul className="space-y-2">
              {movs.map((m, i) => (
                <li
                  key={i}
                  className="bg-white/10 rounded-lg p-4 flex justify-between items-center border border-white/20 shadow-md"
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
          )}
        </section>

        {/* Por qué invertir con nosotros */}
        <section className="bg-white/10 p-6 rounded-xl border border-white/20 shadow-2xl space-y-3">
          <h2 className="text-2xl font-bold text-yellow-400">🌟 ¿Por qué invertir con nosotros?</h2>
          <ul className="list-disc pl-5 text-gray-300 space-y-1">
            <li>Rendimientos diarios garantizados.</li>
            <li>Acceso exclusivo a IA gratuita durante 60 días.</li>
            <li>Retiros rápidos y transparentes.</li>
            <li>Bonos por referidos y recompensas automáticas.</li>
            <li>Interfaz profesional y fácil de usar.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}

/* COMPONENTES */
const ActionCard = ({ to, icon, label }) => (
  <Link
    to={to}
    className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-lg py-6 rounded-xl flex flex-col items-center justify-center shadow-lg hover:scale-105 transition-all"
  >
    <span className="text-3xl mb-2">{icon}</span>
    {label}
  </Link>
);

const Metric = ({ title, value, color }) => {
  const colorClass =
    color === "green"
      ? "text-green-400"
      : color === "blue"
      ? "text-blue-400"
      : "text-yellow-400";
  return (
    <div className="bg-white/10 rounded-xl border border-white/20 shadow-xl p-6 text-center">
      <p className="text-sm text-gray-300">{title}</p>
      <h3 className={`text-3xl font-bold ${colorClass}`}>${COP(value)}</h3>
    </div>
  );
};

const PackageCard = ({ p }) => {
  const pct = Math.round(((p.diasTotales - p.diasRestantes) / p.diasTotales) * 100);
  return (
    <div className="bg-white/10 rounded-xl border border-white/20 shadow-xl p-6 space-y-4">
      <header className="flex justify-between">
        <h4 className="text-lg font-bold">{p.nombre}</h4>
        <span className="text-sm text-gray-300">
          {p.diasRestantes} / {p.diasTotales} d
        </span>
      </header>
      <p className="text-sm">💸 Invertido: ${COP(p.invertido)}</p>
      <p className="text-sm">🏁 Recibirás: ${COP(p.total)}</p>
      <div className="w-full bg-white/25 rounded-full h-3">
        <div
          style={{ width: `${pct}%` }}
          className="h-full bg-gradient-to-r from-yellow-400 to-green-400"
        />
      </div>
      <p className="text-right text-xs">{pct}%</p>
    </div>
  );
};