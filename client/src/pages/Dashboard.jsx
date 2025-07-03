import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
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
  const [showIAInfo, setShowIAInfo] = useState(false);
  const navigate = useNavigate();

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
      iaSaldo: 0,
    });
    setShowIAInfo(false);
  };

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white animate-pulse">
        Cargando panel…
      </div>
    );
  }

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

  const nombre = auth.currentUser.displayName?.split("|")[0] || "Usuario";
  const correo = auth.currentUser.email;

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
    <div className="min-h-screen bg-gradient-to-tr from-[#0f2027] via-[#203a43] to-[#2c5364] text-white">
      {/* HEADER fijo */}
      <header className="flex justify-between items-center p-4 bg-white/10 backdrop-blur border-b border-white/20 shadow-md">
        <div className="font-bold text-yellow-400 text-xl">CartAI</div>
        <div className="text-sm flex items-center gap-4">
          <span className="hidden sm:block">{correo}</span>
          <button
            onClick={() => signOut(auth).then(() => navigate("/login"))}
            className="px-3 py-1 bg-red-500 hover:bg-red-600 rounded text-white text-sm"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* Botonera principal */}
      <nav className="flex justify-center flex-wrap gap-4 p-4 text-lg font-semibold">
        <NavLink to="/dashboard" label="🏠 Dashboard" />
        <NavLink to="/invest" label="💼 Invertir" />
        <NavLink to="/withdraw" label="💸 Retirar" />
        <NavLink to="/referrals" label="📨 Referidos" />
        <NavLink to="/game" label="🎮 Jugar" />
      </nav>

      {/* CONTENIDO */}
      <main className="p-6 space-y-12 max-w-5xl mx-auto">
        {/* Pestaña flotante de IA si no activa */}
        {!iaActiva && !showIAInfo && (
          <div className="fixed bottom-6 right-6 bg-yellow-400 text-black p-4 rounded-xl shadow-lg cursor-pointer animate-bounce" onClick={() => setShowIAInfo(true)}>
            🎁 ¡Activa tu IA gratuita!
          </div>
        )}

        {/* Modal de IA */}
        {showIAInfo && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-6">
            <div className="bg-white text-black rounded-xl p-6 max-w-md w-full space-y-4">
              <h2 className="text-2xl font-bold">🤖 Inteligencia Artificial gratuita</h2>
              <p>
                Recibe $1 000 cada día durante 60 días solo por registrarte. Este beneficio es único y se acredita como bono.
              </p>
              <div className="flex justify-end gap-4 pt-4">
                <button
                  onClick={() => setShowIAInfo(false)}
                  className="px-4 py-2 bg-gray-400 rounded hover:bg-gray-500"
                >
                  Más tarde
                </button>
                <button
                  onClick={activarIA}
                  className="px-4 py-2 bg-green-500 rounded hover:bg-green-600 text-white"
                >
                  Activar ahora
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="text-center space-y-1">
          <h1 className="text-4xl font-bold">Bienvenido, {nombre} 👋</h1>
          <p className="text-gray-300">Resumen de tu actividad en CartAI</p>
        </section>

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
        {packs.length === 0 ? (
          <p className="text-gray-300">Aún no tienes paquetes.</p>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {packs.map((p) => (
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

        <SectionTitle>🔍 ¿Por qué invertir con nosotros?</SectionTitle>
        <div className="bg-white/10 p-6 rounded-xl text-sm space-y-3 leading-relaxed">
          <p>🌐 Nuestra IA trabaja 24/7 para maximizar tu inversión de forma segura.</p>
          <p>📈 Obtienes retornos progresivos con paquetes adaptados a tus objetivos.</p>
          <p>🔐 Tu dinero está respaldado por un sistema de transparencia en tiempo real.</p>
          <p>🎁 Y además, ¡tienes IA gratuita por solo registrarte!</p>
        </div>
      </main>
    </div>
  );
}

const NavLink = ({ to, label }) => (
  <Link
    to={to}
    className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition shadow"
  >
    {label}
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
      <h3 className="text-xl font-bold flex items-center gap-1">🤖 IA gratuita</h3>
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
