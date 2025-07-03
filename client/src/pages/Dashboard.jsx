import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut as fbSignOut } from "firebase/auth";
import { ref, onValue, set, update } from "firebase/database";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "../firebase";

/* ────────────────────────────── Utilities ────────────────────────────── */
const formatCurrency = (n = 0) => `$${n.toLocaleString("es-CO")}`;
const getTodayISO = () => new Date().toISOString().split("T")[0];
const getDaysBetween = (date) => date ? Math.floor((new Date() - new Date(date)) / 86_400_000) : 0;

/* ────────────────────────────── Main Component ────────────────────────────── */
export default function Dashboard() {
  const [userData, setUserData] = useState(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  /* ────────────────────────────── Firebase Data ────────────────────────────── */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) return navigate("/login");
      
      const userRef = ref(db, `usuarios/${user.uid}`);

      onValue(userRef, (snap) => {
        setIsLoading(false);
        if (snap.exists()) {
          const data = snap.val();
          setUserData(data);
          if (!data.iaActiva) setShowAIModal(true);
        } else {
          const defaultData = initializeUserData();
          set(userRef, defaultData);
          setUserData(defaultData);
          setShowAIModal(true);
        }
      });
    });

    return () => unsubscribe();
  }, [navigate]);

  const initializeUserData = () => ({
    iaActiva: false,
    iaSaldo: 0,
    iaInicio: null,
    iaUltimoReclamo: null,
    saldoInversion: 0,
    saldoGanado: 0,
    saldoBonos: 0,
    paquetes: {},
    movimientos: [],
  });

  /* ────────────────────────────── Actions ────────────────────────────── */
  const activateFreeAI = async () => {
    const uid = auth.currentUser.uid;
    await update(ref(db, `usuarios/${uid}`), { 
      iaActiva: true, 
      iaInicio: getTodayISO() 
    });
    setShowAIModal(false);
    setShowSuccess(true);
  };

  const claimDailyBonus = async () => {
    if (!userData?.iaActiva || userData.iaUltimoReclamo === getTodayISO()) return;

    const uid = auth.currentUser.uid;
    await update(ref(db, `usuarios/${uid}`), {
      iaSaldo: (userData.iaSaldo || 0) + 1000,
      saldoBonos: (userData.saldoBonos || 0) + 1000,
      iaUltimoReclamo: getTodayISO(),
    });
  };

  const handleSignOut = () => fbSignOut(auth);

  /* ────────────────────────────── Derived Data ────────────────────────────── */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="animate-pulse">Cargando tu panel...</div>
      </div>
    );
  }

  const [userName] = auth.currentUser.displayName?.split("|") || ["Usuario"];
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

  // IA Progress
  const TOTAL_AI_DAYS = 60;
  const daysPassed = getDaysBetween(iaInicio);
  const aiProgress = Math.min(Math.round((daysPassed / TOTAL_AI_DAYS) * 100), 100);
  const canClaimToday = iaActiva && iaUltimoReclamo !== getTodayISO() && daysPassed < TOTAL_AI_DAYS;

  // Packages
  const packages = Object.values(paquetes);
  const activePackages = packages
    .filter(p => p.diasRestantes > 0)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  // Transactions
  const recentTransactions = [...movimientos]
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, 5);

  /* ────────────────────────────── Render ────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      {/* Navigation */}
      <nav className="bg-gray-800/80 backdrop-blur-md shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap justify-center gap-3">
          <NavLink to="/dashboard" label="Dashboard" emoji="🏠" />
          <NavLink to="/invest" label="Invertir" emoji="💼" />
          <NavLink to="/withdraw" label="Retirar" emoji="💸" />
          <NavLink to="/referrals" label="Invitar" emoji="📨" />
          <NavLink to="/game" label="Jugar" emoji="🎮" />
          <button
            onClick={handleSignOut}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        {/* Welcome Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h1 className="text-3xl md:text-4xl font-bold">
            Bienvenido, <span className="text-yellow-300">{userName}</span> 👋
          </h1>
          <p className="text-gray-400">Resumen de tu inversión</p>
        </motion.header>

        {/* AI Widget */}
        {iaActiva && (
          <AIWidget 
            balance={iaSaldo}
            progress={aiProgress}
            canClaim={canClaimToday}
            onClaim={claimDailyBonus}
            daysRemaining={TOTAL_AI_DAYS - daysPassed}
          />
        )}

        {/* Metrics */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <MetricCard title="Invertido" value={saldoInversion} color="yellow" />
          <MetricCard title="Ganado" value={saldoGanado} color="green" />
          <MetricCard title="Bonos" value={saldoBonos} color="cyan" />
        </section>

        {/* Active Packages */}
        <Section title="📦 Paquetes activos">
          {activePackages.length > 0 ? (
            <div className="grid lg:grid-cols-2 gap-5">
              {activePackages.map(pkg => (
                <PackageCard key={pkg.id} packageData={pkg} />
              ))}
            </div>
          ) : (
            <EmptyState message="Aún no tienes paquetes activos" />
          )}
        </Section>

        {/* Recent Transactions */}
        <Section title="📝 Últimos movimientos">
          {recentTransactions.length > 0 ? (
            <TransactionList transactions={recentTransactions} />
          ) : (
            <EmptyState message="Sin movimientos registrados" />
          )}
        </Section>
      </main>

      {/* AI Activation Modal */}
      <AnimatePresence>
        {showAIModal && (
          <Modal onClose={() => setShowAIModal(false)}>
            <AIActivationModal onActivate={activateFreeAI} />
          </Modal>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccess && (
          <Modal onClose={() => setShowSuccess(false)}>
            <AISuccessModal onClose={() => setShowSuccess(false)} />
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ────────────────────────────── Subcomponents ────────────────────────────── */

const NavLink = ({ to, label, emoji }) => (
  <Link
    to={to}
    className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
  >
    <span>{emoji}</span>
    <span>{label}</span>
  </Link>
);

const Section = ({ title, children }) => (
  <section className="space-y-4">
    <h2 className="text-2xl font-semibold border-b border-gray-700 pb-2">
      {title}
    </h2>
    {children}
  </section>
);

const MetricCard = ({ title, value, color }) => {
  const colorClasses = {
    green: "text-green-400",
    cyan: "text-cyan-300",
    yellow: "text-yellow-300",
  };

  return (
    <motion.div 
      whileHover={{ y: -3 }}
      className="bg-gray-800/50 rounded-xl p-5 text-center border border-gray-700 shadow-lg"
    >
      <p className="text-gray-400 text-sm">{title}</p>
      <h3 className={`text-3xl font-bold ${colorClasses[color]}`}>
        {formatCurrency(value)}
      </h3>
    </motion.div>
  );
};

const AIWidget = ({ balance, progress, canClaim, onClaim, daysRemaining }) => (
  <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6 shadow-lg border border-gray-600">
    <div className="flex justify-between items-center mb-3">
      <h3 className="text-xl font-bold flex items-center gap-2">
        <span className="text-blue-300">🤖</span> IA Gratuita
      </h3>
      <span className="text-sm text-yellow-300">
        {daysRemaining} días restantes
      </span>
    </div>

    <div className="mb-4">
      <div className="flex justify-between text-sm mb-1">
        <span>Saldo acumulado:</span>
        <span className="font-bold">{formatCurrency(balance)}</span>
      </div>
      
      <div className="w-full bg-gray-700 rounded-full h-2.5">
        <div
          style={{ width: `${progress}%` }}
          className="h-full bg-gradient-to-r from-yellow-400 to-green-400 rounded-full transition-all duration-500"
        />
      </div>
      <div className="text-right text-xs text-gray-400 mt-1">
        {progress}% de {formatCurrency(60000)}
      </div>
    </div>

    <button
      onClick={onClaim}
      disabled={!canClaim}
      className={clsx(
        "w-full py-2.5 rounded-lg font-bold transition-colors",
        canClaim
          ? "bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black"
          : "bg-gray-600 text-gray-400 cursor-not-allowed"
      )}
    >
      {canClaim ? "Reclamar $1.000 de hoy" : "Ya reclamado hoy"}
    </button>
  </div>
);

const PackageCard = ({ packageData }) => {
  const progress = Math.round(
    ((packageData.diasTotales - packageData.diasRestantes) / packageData.diasTotales) * 100
  );

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className="bg-gray-800/50 rounded-xl p-5 border border-gray-700 shadow-lg"
    >
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-bold">{packageData.nombre}</h4>
        <span className="text-sm text-gray-400">
          {packageData.diasRestantes}/{packageData.diasTotales} días
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
        <div>
          <p className="text-gray-400">Invertido</p>
          <p>{formatCurrency(packageData.invertido)}</p>
        </div>
        <div>
          <p className="text-gray-400">Ganancia</p>
          <p className="text-green-400">{formatCurrency(packageData.total)}</p>
        </div>
      </div>

      <div className="w-full bg-gray-700 rounded-full h-2 mb-1">
        <div
          style={{ width: `${progress}%` }}
          className="h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"
        />
      </div>
      <p className="text-right text-xs text-gray-400">{progress}% completado</p>
    </motion.div>
  );
};

const TransactionList = ({ transactions }) => (
  <ul className="space-y-3">
    {transactions.map((txn, index) => (
      <motion.li
        key={index}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        className="flex justify-between items-center bg-gray-800/50 p-4 rounded-lg border border-gray-700"
      >
        <div>
          <p className="font-medium">{txn.concepto}</p>
          <p className="text-xs text-gray-400">{txn.fecha}</p>
        </div>
        <span className={clsx(
          "font-semibold",
          txn.monto.startsWith("-") ? "text-red-400" : "text-green-400"
        )}>
          {txn.monto}
        </span>
      </motion.li>
    ))}
  </ul>
);

const EmptyState = ({ message }) => (
  <div className="bg-gray-800/30 rounded-lg p-8 text-center border border-dashed border-gray-700">
    <p className="text-gray-400">{message}</p>
  </div>
);

const Modal = ({ children, onClose }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.9, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.9, y: 20 }}
      className="w-full max-w-md"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </motion.div>
  </motion.div>
);

const AIActivationModal = ({ onActivate }) => (
  <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 shadow-2xl">
    <div className="text-center mb-5">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-500/20 rounded-full mb-4">
        <span className="text-3xl">🎁</span>
      </div>
      <h3 className="text-2xl font-bold mb-2">¡Activa tu IA Gratuita!</h3>
      <p className="text-gray-400">
        Recibe $1.000 diarios durante 60 días sin inversión inicial
      </p>
    </div>

    <div className="space-y-4 mb-6">
      <div className="flex items-center gap-3">
        <div className="bg-blue-500/10 p-2 rounded-lg">
          <span className="text-blue-400">🤖</span>
        </div>
        <div>
          <p className="font-medium">Inteligencia Artificial</p>
          <p className="text-sm text-gray-400">Optimiza tus ganancias</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="bg-green-500/10 p-2 rounded-lg">
          <span className="text-green-400">💰</span>
        </div>
        <div>
          <p className="font-medium">$60,000 en bonos</p>
          <p className="text-sm text-gray-400">$1,000 diarios por 60 días</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="bg-purple-500/10 p-2 rounded-lg">
          <span className="text-purple-400">🔄</span>
        </div>
        <div>
          <p className="font-medium">Sin compromiso</p>
          <p className="text-sm text-gray-400">Cancela cuando quieras</p>
        </div>
      </div>
    </div>

    <button
      onClick={onActivate}
      className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-3 rounded-lg shadow-lg transition-all"
    >
      Activar Beneficio
    </button>
  </div>
);

const AISuccessModal = ({ onClose }) => (
  <div className="bg-gradient-to-br from-blue-900/80 to-purple-900/80 rounded-xl p-8 border border-blue-700/50 shadow-2xl text-center relative overflow-hidden">
    {/* Confetti effect */}
    <div className="absolute inset-0 bg-[url('https://assets.codepen.io/13471/sparkles.gif')] opacity-20 mix-blend-screen" />
    
    <div className="relative z-10">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-400/20 rounded-full mb-5 mx-auto">
        <span className="text-4xl">🎉</span>
      </div>
      
      <h3 className="text-3xl font-bold mb-3 text-white">¡Felicidades!</h3>
      <p className="text-xl mb-5 text-blue-100">
        Has activado tu <span className="text-yellow-300">IA Gratuita</span>
      </p>
      
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 mb-6 border border-white/20">
        <p className="text-sm text-white/90 mb-3">
          A partir de hoy recibirás:
        </p>
        <p className="text-2xl font-bold text-yellow-300 mb-1">
          $1,000 diarios
        </p>
        <p className="text-sm text-white/80">
          durante los próximos 60 días
        </p>
      </div>
      
      <p className="text-white/80 mb-6">
        Este saldo se acumulará en tu cuenta de bonos y podrás usarlo para
        invertir en nuestros paquetes premium.
      </p>
      
      <button
        onClick={onClose}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 rounded-lg shadow-lg transition-all"
      >
        Comenzar a usar la plataforma
      </button>
    </div>
  </div>
);