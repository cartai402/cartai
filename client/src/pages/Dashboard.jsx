import { useState, useEffect, Fragment } from "react";
import { Link } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
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
  const [mostrarModalIA, setMostrarModalIA] = useState(false);

  useEffect(() => {
    const offAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      const uid = user.uid;
      const userRef = ref(db, `usuarios/${uid}`);

      onValue(userRef, (snap) => {
        if (snap.exists()) {
          setData(snap.val());
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
        }
      });
    });

    return () => offAuth();
  }, []);

  const reclamarIA = () => {
    if (!data?.iaActiva) return;
    const uid = auth.currentUser.uid;
    const hoy = hoyISO();
    if (data.iaUltimoReclamo === hoy) return;

    update(ref(db, `usuarios/${uid}`), {
      iaSaldo: (data.iaSaldo || 0) + 1000,
      saldoBonos: (data.saldoBonos || 0) + 1000,
      iaUltimoReclamo: hoy,
      iaInicio: data.iaInicio || hoy,
    });
  };

  const activarIA = () => {
    const uid = auth.currentUser.uid;
    update(ref(db, `usuarios/${uid}`), {
      iaActiva: true,
      iaInicio: hoyISO(),
      iaUltimoReclamo: null,
      iaSaldo: 0,
    });
    setMostrarModalIA(false);
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
  const iaPct = Math.min(
    Math.round((iaDiasPasados / IA_DIAS_TOTALES) * 100),
    100
  );
  const iaPuedeReclamar =
    iaActiva && iaUltimoReclamo !== hoyISO() && iaDiasPasados < IA_DIAS_TOTALES;

  const packsArr = Object.values(paquetes || {});
  const activos = packsArr
    .filter((p) => p.diasRestantes > 0)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  const finalizados = packsArr
    .filter((p) => p.diasRestantes <= 0)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const movs = [...movimientos]
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 5);

  return (
    <div className="min-h-screen flex bg-gradient-to-tr from-[#0f2027] via-[#203a43] to-[#2c5364] text-white">
      <Sidebar open={sidebar} toggle={() => setSidebar(!sidebar)} />

      <main className="flex-1 p-6 md:ml-64 space-y-12">
        <button
          onClick={() => setSidebar(!sidebar)}
          className="md:hidden text-3xl text-yellow-300"
        >
          ☰
        </button>

        <header className="text-center space-y-1">
          <h1 className="text-4xl font-bold">Bienvenido, {nombre} 👋</h1>
          <p className="text-gray-300">
            Todo tu resumen de inversión en un solo lugar
          </p>
        </header>

        {/* Modal IA gratuita si aún no está activa */}
        {!iaActiva && (
          <div className="bg-white/10 border border-yellow-400 rounded-lg p-4 shadow-2xl text-white space-y-4">
            <h2 className="text-2xl font-bold">🎁 ¡Activa tu IA gratuita!</h2>
            <p>
              Durante 60 días recibirás $1 000 diarios por probar nuestra
              inteligencia artificial. Este saldo se suma a tus bonos y puede
              ayudarte a invertir más adelante. No necesitas pagar nada.
            </p>
            <button
              onClick={activarIA}
              className="bg-green-500 hover:bg-green-600 text-black px-4 py-2 rounded shadow-md font-bold"
            >
              Activar IA gratuita
            </button>
          </div>
        )}

        {iaActiva && (
          <IAWidget
            saldo={iaSaldo}
            pct={iaPct}
            puede={iaPuedeReclamar}
            onClaim={reclamarIA}
            diasRest={IA_DIAS_TOTALES - iaDiasPasados}
          />
        )}

        <section className="grid sm:grid-cols-3 gap-6">
          <Metric title="Invertido" value={saldoInversion} color="yellow" />
          <Metric title="Ganado" value={saldoGanado} color="green" />
          <Metric title="Bonos" value={saldoBonos} color="blue" />
        </section>

        <SectionTitle>📦 Paquetes activos</SectionTitle>
        {activos.length === 0 ? (
          <p className="text-gray-300">Aún no tienes paquetes activos.</p>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {activos.map((p) => (
              <PackageCard key={p.id} p={p} />
            ))}
          </div>
        )}

        <SectionTitle>📁 Paquetes finalizados</SectionTitle>
        {finalizados.length === 0 ? (
          <p className="text-gray-300">Aún no has finalizado ningún paquete.</p>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {finalizados.map((p) => (
              <PackageCard key={p.id} p={p} />
            ))}
          </div>
        )}

        <SectionTitle>📝 Últimos movimientos</SectionTitle>
        {movs.length === 0 ? (
          <p className="text-gray-300">Sin movimientos registrados.</p>
        ) : (
          <MovList movs={movs} />
        )}

        <SectionTitle>💡 ¿Por qué invertir con nosotros?</SectionTitle>
        <ul className="list-disc pl-5 space-y-2 text-white/90">
          <li>Inteligencia artificial que optimiza tus ganancias</li>
          <li>Bonos diarios sin costo inicial</li>
          <li>Retiro rápido y seguro por Nequi o Daviplata</li>
          <li>Invita y gana con el sistema de referidos</li>
        </ul>
      </main>
    </div>
  );
}

const Sidebar = ({ open, toggle }) => (
  <aside
    className={clsx(
      "fixed md:static w-64 h-full bg-white/10 backdrop-blur-lg border-r border-white/10 shadow-2xl z-50 transition-transform",
      open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
    )}
  >
    <div className="p-6 text-2xl font-extrabold text-yellow-400 border-b border-white/10">
      CartAI
    </div>
    <nav className="flex flex-col p-4 space-y-5 text-lg font-semibold">
      <NavLink to="/dashboard" label="Dashboard" emoji="🏠" />
      <NavLink to="/invest" label="Invertir" emoji="💼" />
      <NavLink to="/withdraw" label="Retirar" emoji="💸" />
      <NavLink to="/referrals" label="Invitar" emoji="📨" />
      <NavLink to="/game" label="Jugar" emoji="🎮" />
      <button
        onClick={() => signOut(auth)}
        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded shadow font-bold mt-6"
      >
        Cerrar sesión
      </button>
    </nav>
    <button
      onClick={toggle}
      className="md:hidden absolute top-4 right-4 text-yellow-300 text-2xl"
    >
      ✕
    </button>
  </aside>
);

const NavLink = ({ to, label, emoji }) => (
  <Link
    to={to}
    className="flex items-center gap-2 px-3 py-2 rounded hover:text-yellow-300 transition"
  >
    {emoji} {label}
  </Link>
);

const SectionTitle = ({ children }) => (
  <h2 className="text-2xl font-semibold border-b border-white/20 pb-2">
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
    <div className="bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 shadow-xl p-6 text-center transition transform hover:-translate-y-1 duration-300">
      <p className="text-sm text-gray-300">{title}</p>
      <h3 className={`text-3xl font-bold ${c}`}>${COP(value)}</h3>
    </div>
  );
}

const IAWidget = ({ saldo, pct, puede, onClaim, diasRest }) => (
  <section className="bg-blue-100 text-black rounded-xl p-6 shadow-2xl border border-blue-300 space-y-4">
    <div className="flex justify-between items-center">
      <h3 className="text-xl font-bold flex items-center gap-1">
        🤖 IA gratuita
      </h3>
      <span className="text-sm">{diasRest} d restantes</span>
    </div>
    <p>
      Saldo acumulado: <strong>${COP(saldo)}</strong>
    </p>
    <div className="w-full bg-white/40 rounded-full h-3">
      <div
        style={{ width: `${pct}%` }}
        className="h-full bg-gradient-to-r from-yellow-400 to-green-400 transition-all"
      ></div>
    </div>
    <p className="text-right text-xs">{pct}% de $60 000</p>
    <button
      onClick={onClaim}
      disabled={!puede}
      className={clsx(
        "w-full py-2 rounded-md font-bold transition",
        puede
          ? "bg-green-400 hover:bg-green-500 text-black"
          : "bg-gray-400 cursor-not-allowed"
      )}
    >
      {puede ? "Reclamar $1 000 de hoy" : "Reclamado hoy"}
    </button>
  </section>
);

const PackageCard = ({ p }) => {
  const pct = Math.round(
    ((p.diasTotales - p.diasRestantes) / p.diasTotales) * 100
  );
  return (
    <div className="bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 shadow-xl p-6 space-y-4 transition transform hover:scale-[1.02]">
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

const MovList = ({ movs }) => (
  <ul className="space-y-4">
    {movs.map((m, idx) => (
      <li
        key={idx}
        className="bg-white/10 border border-white/20 rounded-lg p-4 shadow-md animate-fade-in flex justify-between items-center"
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