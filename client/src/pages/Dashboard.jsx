/* ──────────────────────────────  Dashboard.jsx  ───────────────────────────── */
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  onAuthStateChanged,
  signOut as fbSignOut,
} from "firebase/auth";
import {
  ref,
  onValue,
  set,
  update,
} from "firebase/database";
import clsx from "clsx";

import { auth, db } from "../firebase";

/* Utilidades ------------------------------------------------------ */
const COP = (n = 0) => `$${n.toLocaleString("es-CO")}`;
const hoyISO = () => new Date().toISOString().split("T")[0];
const diasEntre = (d) =>
  d ? Math.floor((new Date() - new Date(d)) / 86_400_000) : 0;

/* Componente principal ------------------------------------------- */
export default function Dashboard() {
  const [userData, setUserData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  /* Carga datos de Firebase */
  useEffect(() => {
    const offAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return navigate("/login");
      const uid = user.uid;
      const userRef = ref(db, `usuarios/${uid}`);

      onValue(userRef, (snap) => {
        if (snap.exists()) {
          const data = snap.val();
          setUserData(data);
          if (!data.iaActiva) setShowModal(true);
        } else {
          /* nodo mínimo si no existe */
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
          setUserData(def);
          setShowModal(true);
        }
      });
    });
    return () => offAuth();
  }, [navigate]);

  /* Acciones ------------------------------------------------------ */
  const activarIA = async () => {
    const uid = auth.currentUser.uid;
    await update(ref(db, `usuarios/${uid}`), { iaActiva: true, iaInicio: hoyISO() });
    setShowModal(false);
  };

  const reclamarIA = async () => {
    if (!userData) return;
    const { iaActiva, iaUltimoReclamo } = userData;
    if (!iaActiva) return;
    if (iaUltimoReclamo === hoyISO()) return;

    const uid = auth.currentUser.uid;
    await update(ref(db, `usuarios/${uid}`), {
      iaSaldo: (userData.iaSaldo || 0) + 1000,
      saldoBonos: (userData.saldoBonos || 0) + 1000,
      iaUltimoReclamo: hoyISO(),
    });
  };

  const signOut = () => fbSignOut(auth);

  /* Derivados ------------------------------------------------------ */
  if (!userData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        Cargando…
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
  } = userData;

  /* IA progreso */
  const DAYS_TOTAL = 60;
  const diasPasados = diasEntre(iaInicio);
  const pctIA = Math.min(Math.round((diasPasados / DAYS_TOTAL) * 100), 100);
  const puedeReclamar =
    iaActiva && iaUltimoReclamo !== hoyISO() && diasPasados < DAYS_TOTAL;

  /* Ordena datos */
  const packs = Object.values(paquetes).sort(
    (a, b) => new Date(a.fecha) - new Date(b.fecha)
  );
  const movs = [...movimientos]
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 5);

  /* Render -------------------------------------------------------- */
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 to-slate-700 text-white flex flex-col">
      {/* ─────────── NAV superior ─────────── */}
      <nav className="flex flex-wrap justify-center gap-4 py-4 shadow-md bg-white/10 backdrop-blur-lg">
        <NavButton to="/dashboard" label="Dashboard" emoji="🏠" />
        <NavButton to="/invest" label="Invertir" emoji="💼" />
        <NavButton to="/withdraw" label="Retirar" emoji="💸" />
        <NavButton to="/referrals" label="Invitar" emoji="📨" />
        <NavButton to="/game" label="Jugar" emoji="🎮" />
        <button
          onClick={signOut}
          className="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-lg shadow-md transition"
        >
          Cerrar sesión
        </button>
      </nav>

      {/* ─────────── CONTENIDO ─────────── */}
      <main className="w-full max-w-5xl mx-auto p-6 space-y-10">
        {/* Saludo */}
        <header className="text-center space-y-1">
          <h1 className="text-4xl font-bold">
            Bienvenido, {nombre} <span>👋</span>
          </h1>
          <p className="text-gray-300">Resumen de tu inversión</p>
        </header>

        {/* IA Widget */}
        {iaActiva && (
          <IAWidget
            saldo={iaSaldo}
            pct={pctIA}
            puede={puedeReclamar}
            onClaim={reclamarIA}
            diasRest={Math.max(DAYS_TOTAL - diasPasados, 0)}
          />
        )}

        {/* Métricas */}
        <section className="grid sm:grid-cols-3 gap-6">
          <Metric title="Invertido" value={saldoInversion} color="yellow" />
          <Metric title="Ganado" value={saldoGanado} color="green" />
          <Metric title="Bonos" value={saldoBonos} color="cyan" />
        </section>

        {/* Paquetes activos */}
        <SectionTitle>📦 Paquetes activos</SectionTitle>
        {packs.length === 0 ? (
          <p className="text-gray-400">Aún no tienes paquetes.</p>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {packs.map((p) => (
              <PackageCard key={p.id} p={p} />
            ))}
          </div>
        )}

        {/* Movimientos */}
        <SectionTitle>📝 Últimos movimientos</SectionTitle>
        {movs.length === 0 ? (
          <p className="text-gray-400">Sin movimientos registrados.</p>
        ) : (
          <MovList movs={movs} />
        )}
      </main>

      {/* ─────────── MODAL IA ─────────── */}
      {showModal && (
        <Modal>
          <div className="bg-slate-800 text-white rounded-xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-center mb-4">
              🎉 ¡Felicidades!
            </h2>
            <p className="text-center mb-4">
              Has sido seleccionado para
              <strong> activar la IA gratuita de CartAI</strong>.
              Obtendrás <strong>$1.000 COP diarios</strong> durante{" "}
              <strong>60 días</strong>, sin inversión inicial.
            </p>
            <p className="text-center text-sm text-gray-300 mb-6">
              Podrás retirar estos bonos cuando actives tu primer paquete real.
              Aprovecha para conocer cómo funciona nuestra plataforma.
            </p>
            <button
              onClick={activarIA}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg shadow-lg transition"
            >
              Activar IA gratuita
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ─────────── Sub-componentes ─────────── */
const NavButton = ({ to, label, emoji }) => (
  <Link
    to={to}
    className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg shadow-md transition"
  >
    <span>{emoji}</span>
    {label}
  </Link>
);

const SectionTitle = ({ children }) => (
  <h2 className="text-2xl font-semibold pt-4 border-b border-white/20">
    {children}
  </h2>
);

function Metric({ title, value, color }) {
  const colorClass =
    color === "green"
      ? "text-green-400"
      : color === "cyan"
      ? "text-cyan-300"
      : "text-yellow-300";
  return (
    <div className="bg-white/10 rounded-xl p-6 text-center shadow-lg">
      <p className="text-sm text-gray-300">{title}</p>
      <h3 className={`text-3xl font-bold ${colorClass}`}>
        {COP(value)}
      </h3>
    </div>
  );
}

const IAWidget = ({ saldo, pct, puede, onClaim, diasRest }) => (
  <section className="bg-slate-700/70 rounded-xl p-6 shadow-lg">
    <div className="flex justify-between items-center mb-2">
      <h3 className="text-xl font-bold flex items-center gap-1">
        🤖 IA gratuita
      </h3>
      <span className="text-sm text-yellow-300">
        {diasRest} días restantes
      </span>
    </div>

    <p className="mb-2">
      Saldo acumulado: <strong>{COP(saldo)}</strong>
    </p>

    <div className="w-full bg-white/20 rounded-full h-3 mb-1">
      <div
        style={{ width: `${pct}%` }}
        className="h-full bg-gradient-to-r from-yellow-400 to-green-400 rounded-full"
      />
    </div>
    <p className="text-xs text-right">{pct}% de {COP(60_000)}</p>

    <button
      onClick={onClaim}
      disabled={!puede}
      className={clsx(
        "w-full mt-4 py-2 rounded-md font-bold transition",
        puede
          ? "bg-green-500 hover:bg-green-600"
          : "bg-gray-500 cursor-not-allowed"
      )}
    >
      {puede ? "Reclamar $1.000 de hoy" : "Reclamado hoy"}
    </button>
  </section>
);

const PackageCard = ({ p }) => {
  const pct = Math.round(
    ((p.diasTotales - p.diasRestantes) / p.diasTotales) * 100
  );
  return (
    <div className="bg-white/10 rounded-xl p-6 shadow-lg space-y-3">
      <header className="flex justify-between">
        <h4 className="font-bold">{p.nombre}</h4>
        <span className="text-sm text-gray-300">
          {p.diasRestantes}/{p.diasTotales} d
        </span>
      </header>
      <p className="text-sm">💸 Invertido: {COP(p.invertido)}</p>
      <p className="text-sm">🏁 Recibirás: {COP(p.total)}</p>

      <div className="w-full bg-white/20 rounded-full h-3">
        <div
          style={{ width: `${pct}%` }}
          className="h-full bg-gradient-to-r from-yellow-400 to-green-400 rounded-full"
        />
      </div>
    </div>
  );
};

const MovList = ({ movs }) => (
  <ul className="space-y-3">
    {movs.map((m, i) => (
      <li
        key={i}
        className="flex justify-between bg-white/10 p-4 rounded-lg shadow-md"
      >
        <span>{m.concepto}</span>
        <span
          className={clsx(
            m.monto.startsWith("-") ? "text-red-400" : "text-green-400",
            "font-semibold"
          )}
        >
          {m.monto}
        </span>
        <span className="text-xs text-gray-300">{m.fecha}</span>
      </li>
    ))}
  </ul>
);

const Modal = ({ children }) => (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
    {children}
  </div>
);
/* ─────────────────────────────────────────────────────────────────────────── */