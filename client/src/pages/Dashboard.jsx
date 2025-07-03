import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { ref, onValue, set, update } from "firebase/database";
import clsx from "clsx";

/* Utilidades */
const COP = (n) => n.toLocaleString("es-CO");
const hoyISO = () => new Date().toISOString().split("T")[0];
const diasEntre = (d) => (d ? Math.floor((Date.now() - Date.parse(d)) / 864e5) : 0);

export default function Dashboard() {
  const [data, setData]        = useState(null);
  const [showIAModal, setShow] = useState(false);

  /* Suscripción a Firebase */
  useEffect(() => {
    const off = onAuthStateChanged(auth, (u) => {
      if (!u) return;
      const uid = u.uid;
      const userRef = ref(db, `usuarios/${uid}`);

      onValue(userRef, (snap) => {
        if (snap.exists()) {
          setData(snap.val());
          if (!snap.val().iaActiva) setShow(true);
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
          setShow(true);
        }
      });
    });
    return () => off();
  }, []);

  /* Activar / reclamar IA */
  const activarIA = () => {
    const uid = auth.currentUser.uid;
    update(ref(db, `usuarios/${uid}`), {
      iaActiva: true,
      iaInicio: hoyISO(),
      iaUltimoReclamo: null,
      iaSaldo: 0,
    });
    setShow(false);
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

  /* Loading */
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Cargando…
      </div>
    );
  }

  /* Derivados */
  const [nombre] = auth.currentUser.displayName?.split("|") || ["Usuario"];
  const {
    iaActiva,
    iaSaldo      = 0,
    iaInicio,
    iaUltimoReclamo,
    saldoInversion = 0,
    saldoGanado   = 0,
    saldoBonos    = 0,
    paquetes      = {},
    movimientos   = [],
  } = data;

  /* IA progreso */
  const totalDiasIA   = 60;
  const diasIA        = diasEntre(iaInicio);
  const pctIA         = Math.min(Math.round((diasIA / totalDiasIA) * 100), 100);
  const puedeReclamar = iaActiva && iaUltimoReclamo !== hoyISO() && diasIA < totalDiasIA;

  /* Paquetes activos / finalizados */
  const packs = Object.values(paquetes);
  const activos     = packs.filter((p) => p.diasRestantes > 0);
  const finalizados = packs.filter((p) => p.diasRestantes <= 0);

  /* Últimos movimientos */
  const movs = [...movimientos]
    .sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha))
    .slice(0, 5);

  return (
    <div className="min-h-screen w-full bg-gradient-to-tr from-[#0f2027] via-[#203a43] to-[#2c5364] text-white flex flex-col">

      {/* MODAL IA GRATUITA */}
      {showIAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative z-10 bg-white rounded-2xl max-w-md w-[90%] p-8 text-black space-y-4 shadow-2xl">
            <h2 className="text-3xl font-extrabold text-center text-blue-600">¡Felicidades 🥳!</h2>
            <p>
              Activa tu <strong>IA Gratuita</strong> y recibe
              <strong> $1 000 COP</strong> cada día durante
              <strong> 60 días</strong>. Podrás retirarlo cuando tengas tu primer
              paquete real.
            </p>
            <button
              onClick={activarIA}
              className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 hover:to-yellow-500 text-black font-bold py-3 rounded-lg shadow-lg"
            >
              Activar IA gratuita
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="py-6 text-center space-y-1">
        <h1 className="text-4xl font-bold">Hola, {nombre} 👋</h1>
        <p className="text-gray-300">Panel de control de tus inversiones</p>
      </header>

      {/* BOTONES ACCIONES PRINCIPALES */}
      <nav className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-6">
        <ActionCard to="/invest"    label="Invertir" icon="💼" />
        <ActionCard to="/withdraw"  label="Retirar"  icon="💸" />
        <ActionCard to="/referrals" label="Invitar"  icon="📨" />
        <ActionCard to="/game"      label="Jugar"    icon="🎮" />
      </nav>

      {/* MÉTRICAS */}
      <section className="grid sm:grid-cols-3 gap-6 px-6 mt-10">
        <Metric title="Invertido" val={saldoInversion} color="yellow" />
        <Metric title="Ganado"    val={saldoGanado}    color="green"  />
        <Metric title="Bonos"     val={saldoBonos}     color="blue"   />
      </section>

      {/* IA Widget */}
      {iaActiva && (
        <section className="px-6 mt-10">
          <IAWidget
            saldo={iaSaldo}
            pct={pctIA}
            puede={puedeReclamar}
            onClaim={reclamarIA}
            diasRest={totalDiasIA - diasIA}
          />
        </section>
      )}

      {/* Paquetes */}
      <DashboardSection title="📦 Paquetes activos">
        {activos.length === 0 ? (
          <EmptyText>No tienes paquetes activos.</EmptyText>
        ) : (
          <CardsGrid>
            {activos.map((p) => (
              <PackageCard key={p.id} p={p} />
            ))}
          </CardsGrid>
        )}
      </DashboardSection>

      <DashboardSection title="📁 Paquetes finalizados">
        {finalizados.length === 0 ? (
          <EmptyText>Aún no has finalizado ningún paquete.</EmptyText>
        ) : (
          <CardsGrid>
            {finalizados.map((p) => (
              <PackageCard key={p.id} p={p} fin />
            ))}
          </CardsGrid>
        )}
      </DashboardSection>

      {/* Movimientos */}
      <DashboardSection title="📝 Últimos movimientos">
        {movs.length === 0 ? (
          <EmptyText>Sin movimientos registrados.</EmptyText>
        ) : (
          <ul className="space-y-3">
            {movs.map((m, i) => (
              <li
                key={i}
                className="bg-white/10 border border-white/20 rounded-lg p-4 flex justify-between items-center"
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
      </DashboardSection>

      {/* Footer por qué invertir */}
      <footer className="mt-16 bg-white/10 py-6 px-6 space-y-2 text-center text-gray-200">
        <p className="text-lg font-semibold">💡 ¿Por qué invertir con CartAI?</p>
        <p>🚀 IA 24/7 optimizando tu capital.</p>
        <p>🔒 Seguridad y transparencia con Firebase.</p>
        <p>🎁 Bonos, referidos y torneos futuros.</p>
      </footer>

      {/* Logout flotante */}
      <button
        onClick={() => signOut(auth)}
        className="fixed bottom-4 right-4 bg-red-600 hover:bg-red-700 text-white p-3 rounded-full shadow-xl text-2xl"
        title="Cerrar sesión"
      >
        ⎋
      </button>
    </div>
  );
}

/* --------- Sub-componentes UI --------- */

const Metric = ({ title, val, color }) => {
  const c =
    color === "green"
      ? "text-green-400"
      : color === "blue"
      ? "text-blue-400"
      : "text-yellow-400";
  return (
    <div className="bg-white/10 rounded-xl p-6 text-center shadow-lg hover:bg-white/20 transition">
      <p className="text-sm text-gray-300">{title}</p>
      <h3 className={clsx("text-3xl font-bold", c)}>${COP(val)}</h3>
    </div>
  );
};

const IAWidget = ({ saldo, pct, puede, onClaim, diasRest }) => (
  <div className="bg-blue-100 text-black rounded-xl p-6 shadow-lg space-y-4">
    <header className="flex justify-between">
      <h3 className="font-bold text-xl">🤖 IA gratuita</h3>
      <span className="text-sm">{diasRest} d restantes</span>
    </header>
    <p>
      Saldo acumulado: <strong>${COP(saldo)}</strong>
    </p>
    <div className="w-full bg-white/50 h-3 rounded-full overflow-hidden">
      <div
        style={{ width: `${pct}%` }}
        className="h-full bg-gradient-to-r from-yellow-400 to-green-500"
      />
    </div>
    <p className="text-right text-xs">{pct}% de $60 000</p>
    <button
      onClick={onClaim}
      disabled={!puede}
      className={clsx(
        "w-full py-2 rounded-md font-bold transition",
        puede
          ? "bg-green-400 hover:bg-green-500"
          : "bg-gray-400 cursor-not-allowed"
      )}
    >
      {puede ? "Reclamar $1 000 de hoy" : "Reclamado hoy"}
    </button>
  </div>
);

const PackageCard = ({ p, fin }) => {
  const pct =
    p.diasTotales === 0
      ? 100
      : Math.round(((p.diasTotales - p.diasRestantes) / p.diasTotales) * 100);
  return (
    <div className="bg-white/10 rounded-xl p-6 shadow-lg space-y-4 hover:bg-white/20 transition">
      <header className="flex justify-between items-start">
        <h4 className="font-bold">{p.nombre}</h4>
        <span className="text-xs text-gray-400">
          {fin ? "Finalizado" : `${p.diasRestantes}/${p.diasTotales} d`}
        </span>
      </header>
      <p className="text-sm">💸 Invertido: ${COP(p.invertido)}</p>
      <p className="text-sm">🏁 Total: ${COP(p.total)}</p>
      <div className="w-full h-2 bg-white/30 rounded-full overflow-hidden">
        <div
          style={{ width: `${pct}%` }}
          className="h-full bg-gradient-to-r from-yellow-400 to-green-500"
        />
      </div>
      <p className="text-right text-xs">{pct}%</p>
    </div>
  );
};

const ActionCard = ({ to, icon, label }) => (
  <Link
    to={to}
    className="bg-white/10 backdrop-blur-lg rounded-xl p-6 flex flex-col items-center justify-center gap-2 shadow-lg hover:bg-white/20 transition"
  >
    <span className="text-3xl">{icon}</span>
    <span className="font-semibold">{label}</span>
  </Link>
);

const DashboardSection = ({ title, children }) => (
  <section className="mt-14 px-6 space-y-6">
    <h2 className="text-2xl font-bold">{title}</h2>
    {children}
  </section>
);

const CardsGrid = ({ children }) => (
  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">{children}</div>
);

const EmptyText = ({ children }) => (
  <p className="text-gray-300">{children}</p>
);