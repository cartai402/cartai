/* ------------------------------------------------------------------
   CartAI – Dashboard
   ------------------------------------------------------------------ */
import { useState, useEffect, Fragment } from "react";
import { Link } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { ref, onValue, set, update } from "firebase/database";
import clsx from "clsx";

/* ───────── Utilidades ───────── */
const COP = (n) => n.toLocaleString("es-CO");                // $1.000
const isoHoy = () => new Date().toISOString().split("T")[0];
const diffDias = (iso) =>
  iso ? Math.floor((Date.now() - new Date(iso)) / 86_400_000) : 0;

/* ───────── Componente principal ───────── */
export default function Dashboard() {
  const [data,    setData]    = useState(null);   // nodo completo en RTDB
  const [loading, setLoading] = useState(true);

  /* ► Sesión + RTDB */
  useEffect(() => {
    const offAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      const uid = user.uid;
      const userRef = ref(db, `usuarios/${uid}`);

      onValue(userRef, (snap) => {
        if (snap.exists()) {
          setData(snap.val());
        } else {
          // nodo mínimo
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
        setLoading(false);
      });
    });
    return () => offAuth();
  }, []);

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white animate-pulse">
        Cargando dashboard…
      </div>
    );
  }

  /* ───────── Datos derivados ───────── */
  const [nombre]   = auth.currentUser.displayName?.split("|") || ["Usuario"];
  const uid        = auth.currentUser.uid;

  const {
    iaActiva,
    iaSaldo       = 0,
    iaInicio,
    iaUltimoReclamo,
    saldoInversion = 0,
    saldoGanado    = 0,
    saldoBonos     = 0,
    paquetes       = {},
    movimientos    = [],
  } = data;

  /* ► IA diaria */
  const TOTAL_DIAS_IA    = 60;
  const diasPasados      = diffDias(iaInicio);
  const pctIA            = Math.min(Math.round((diasPasados / TOTAL_DIAS_IA) * 100), 100);
  const puedeReclamarIA  =
    iaActiva && iaUltimoReclamo !== isoHoy() && diasPasados < TOTAL_DIAS_IA;

  const reclamarIA = () =>
    puedeReclamarIA &&
    update(ref(db, `usuarios/${uid}`), {
      iaSaldo: iaSaldo + 1000,
      saldoBonos: saldoBonos + 1000,
      iaUltimoReclamo: isoHoy(),
      iaInicio: iaInicio || isoHoy(),
    });

  /* ► Paquetes y movimientos ordenados  */
  const packs = Object.values(paquetes).sort(
    (a, b) => new Date(a.fecha) - new Date(b.fecha)
  );
  const movs = [...movimientos]
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 5);

  /* ───────── Render ───────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      {/* ─── NAV superior ─── */}
      <nav className="w-full bg-slate-950/60 backdrop-blur sticky top-0 z-50 py-3 shadow-inner">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 gap-2">
          <div className="flex gap-2 text-sm sm:text-base">
            <NavBtn to="/dashboard" icon="🏡" text="Dashboard" />
            <NavBtn to="/invest"    icon="💼" text="Invertir"   />
            <NavBtn to="/withdraw"  icon="💸" text="Retirar"    />
            <NavBtn to="/referrals" icon="✉️" text="Invitar"    />
            <NavBtn to="/game"      icon="🎮" text="Jugar"      />
          </div>
          <button
            onClick={() => signOut(auth)}
            className="px-4 py-1 rounded-full bg-rose-600 hover:bg-rose-500 text-xs sm:text-sm font-semibold shadow-lg"
          >
            Cerrar sesión
          </button>
        </div>
      </nav>

      {/* ─── CONTENIDO ─── */}
      <main className="max-w-5xl mx-auto px-4 py-10 space-y-12">
        {/* Saludo */}
        <header className="text-center space-y-1 mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold">
            Bienvenido, {nombre} 👋
          </h1>
          <p className="text-slate-300 text-sm">
            Resumen de tu inversión
          </p>
        </header>

        {/* ► IA gratuita */}
        {iaActiva && (
          <section className="bg-slate-800/60 rounded-xl border border-slate-700 p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span className="flex items-center gap-1 text-cyan-300">
                🤖 <span>IA gratuita</span>
              </span>
              <span className="text-sm text-slate-300">
                {TOTAL_DIAS_IA - diasPasados} días restantes
              </span>
            </div>

            <p className="text-slate-200">
              Saldo acumulado:{" "}
              <strong className="text-white">${COP(iaSaldo)}</strong>
            </p>

            {/* Barra */}
            <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
              <div
                style={{ width: `${pctIA}%` }}
                className="h-full bg-gradient-to-r from-yellow-400 to-green-400 transition-all"
              />
            </div>
            <p className="text-right text-xs text-slate-400">
              {pctIA}% de $60 000
            </p>

            <button
              onClick={reclamarIA}
              disabled={!puedeReclamarIA}
              className={clsx(
                "w-full py-3 rounded-lg font-bold shadow-lg transition",
                puedeReclamarIA
                  ? "bg-green-500 hover:bg-green-400 text-black"
                  : "bg-slate-600 cursor-not-allowed text-slate-300"
              )}
            >
              {puedeReclamarIA ? "Reclamar $1 000 de hoy" : "Reclamado hoy"}
            </button>
          </section>
        )}

        {/* ► Métricas */}
        <div className="grid sm:grid-cols-3 gap-6">
          <Metric label="Invertido" color="yellow" value={saldoInversion} />
          <Metric label="Ganado"   color="green"  value={saldoGanado}   />
          <Metric label="Bonos"    color="cyan"   value={saldoBonos}    />
        </div>

        {/* ► Paquetes activos */}
        <SectionTitle emoji="📦">Paquetes activos</SectionTitle>
        {packs.length === 0 ? (
          <p className="text-slate-400">Aún no tienes paquetes.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {packs.map((p) => (
              <PackageCard key={p.id} {...p} />
            ))}
          </div>
        )}

        {/* ► Movimientos */}
        <SectionTitle emoji="📝">Últimos movimientos</SectionTitle>
        {movs.length === 0 ? (
          <p className="text-slate-400">Sin movimientos registrados.</p>
        ) : (
          <Movements list={movs} />
        )}
      </main>
    </div>
  );
}

/* ───────── Sub-componentes ───────── */

const NavBtn = ({ to, icon, text }) => (
  <Link
    to={to}
    className="flex items-center gap-1 px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 shadow-sm text-xs sm:text-sm"
  >
    <span>{icon}</span>
    {text}
  </Link>
);

const SectionTitle = ({ emoji, children }) => (
  <h2 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
    <span>{emoji}</span> {children}
  </h2>
);

const Metric = ({ label, value, color }) => {
  const colorClass =
    color === "green"
      ? "text-green-400"
      : color === "cyan"
      ? "text-cyan-400"
      : "text-yellow-400";
  return (
    <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-6 shadow-lg text-center hover:-translate-y-1 transition">
      <p className="text-slate-300 text-sm">{label}</p>
      <h3 className={`text-3xl font-bold ${colorClass}`}>${COP(value)}</h3>
    </div>
  );
};

const PackageCard = ({
  nombre,
  diasTotales,
  diasRestantes,
  invertido,
  total,
}) => {
  const pct = Math.round(((diasTotales - diasRestantes) / diasTotales) * 100);
  return (
    <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-6 shadow-lg hover:-translate-y-[2px] transition space-y-3">
      <header className="flex justify-between items-center">
        <h4 className="font-semibold">{nombre}</h4>
        <span className="text-xs text-slate-400">
          {diasRestantes}/{diasTotales} d
        </span>
      </header>

      <p className="text-sm text-slate-200">💸 Invertido: ${COP(invertido)}</p>
      <p className="text-sm text-slate-200">🏁 Recibirás: ${COP(total)}</p>

      <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
        <div
          style={{ width: `${pct}%` }}
          className="h-full bg-gradient-to-r from-yellow-400 to-green-400"
        />
      </div>
    </div>
  );
};

const Movements = ({ list }) => (
  <div className="space-y-3">
    {list.map((m, i) => (
      <Fragment key={i}>
        <div className="flex justify-between items-center bg-slate-800/60 rounded-md px-4 py-2 shadow">
          <span>{m.concepto}</span>
          <span
            className={clsx(
              "font-semibold",
              m.monto.startsWith("-") ? "text-red-400" : "text-green-400"
            )}
          >
            {m.monto}
          </span>
        </div>
      </Fragment>
    ))}
  </div>
);