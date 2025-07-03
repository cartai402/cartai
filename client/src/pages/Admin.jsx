import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  ref,
  onValue,
  update,
  remove,
  push,
  get,
  set,
} from "firebase/database";
import { useNavigate } from "react-router-dom";

export default function Admin() {
  const [usuario, setUsuario] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [retiros, setRetiros] = useState([]);
  const [usuarios, setUsuarios] = useState({});
  const [codigoPromo, setCodigoPromo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user || user.email !== "admincartai@cartai.com") {
        navigate("/login");
      } else {
        setUsuario(user);
      }
    });
    return unsubscribe;
  }, [navigate]);

  useEffect(() => {
    if (!usuario) return;

    const pagosRef = ref(db, "pagosPendientes");
    onValue(pagosRef, (snap) => {
      const datos = snap.val() || {};
      const todos = [];
      for (const uid in datos) {
        for (const pagoId in datos[uid]) {
          todos.push({ ...datos[uid][pagoId], uid, pagoId });
        }
      }
      setPagos(todos);
    });

    const retirosRef = ref(db, "retirosPendientes");
    onValue(retirosRef, (snap) => {
      const datos = snap.val() || {};
      const todos = [];
      for (const uid in datos) {
        for (const retiroId in datos[uid]) {
          todos.push({ ...datos[uid][retiroId], uid, retiroId });
        }
      }
      setRetiros(todos);
    });

    onValue(ref(db, "usuarios"), (snap) => {
      setUsuarios(snap.val() || {});
    });
  }, [usuario]);

  const aprobarPago = async (uid, pagoId, inversion, paquete) => {
    const userRef = ref(db, `usuarios/${uid}`);
    const userSnap = await get(userRef);
    const data = userSnap.val();

    const nuevoSaldo = (data.saldoInversion || 0) + inversion;

    await push(ref(db, `usuarios/${uid}/paquetes`), {
      ...paquete,
      fecha: Date.now(),
      estado: "activo",
    });

    await update(userRef, {
      saldoInversion: nuevoSaldo,
      paqueteActivo: true,
    });

    await remove(ref(db, `pagosPendientes/${uid}/${pagoId}`));
    setMensaje(`✅ Pago aprobado para ${data.nombre}`);
  };

  const rechazarPago = async (uid, pagoId) => {
    await remove(ref(db, `pagosPendientes/${uid}/${pagoId}`));
    setMensaje("❌ Pago rechazado.");
  };

  const aprobarRetiro = async (uid, retiroId, monto) => {
    const userRef = ref(db, `usuarios/${uid}`);
    const snap = await get(userRef);
    const data = snap.val();
    const nuevoSaldo = (data.saldoGanado || 0) - monto;

    await update(userRef, { saldoGanado: nuevoSaldo });
    await remove(ref(db, `retirosPendientes/${uid}/${retiroId}`));
    setMensaje("✅ Retiro aprobado.");
  };

  const rechazarRetiro = async (uid, retiroId) => {
    await remove(ref(db, `retirosPendientes/${uid}/${retiroId}`));
    setMensaje("❌ Retiro rechazado.");
  };

  const crearCodigo = () => {
    if (!codigoPromo.trim()) return;
    const codigo = codigoPromo.toUpperCase();
    const codigoRef = ref(db, `codigosPromocionales/${codigo}`);
    set(codigoRef, { activo: true, creado: Date.now() });
    setCodigoPromo("");
    setMensaje("🎉 Código promocional creado.");
  };

  return (
    <main
      className="min-h-screen p-6 text-white bg-[#0f0f1a] bg-gradient-to-br from-[#0f0f1a] to-[#1a1a2e] via-[#121223] flex justify-center items-start"
      style={{ fontFamily: "Segoe UI, sans-serif" }}
    >
      <div className="w-full max-w-6xl space-y-12">
        <h1 className="text-4xl font-extrabold text-center text-purple-300 drop-shadow-md">
          🧠 Panel Administrativo - CartAI
        </h1>

        {mensaje && (
          <p className="text-center text-green-400 bg-green-800/20 py-2 rounded shadow-lg">
            {mensaje}
          </p>
        )}

        {/* Estadísticas */}
        <section className="grid sm:grid-cols-3 gap-6">
          {[
            {
              label: "Usuarios registrados",
              value: Object.keys(usuarios).length,
            },
            {
              label: "Total inversión",
              value: "$" +
                Object.values(usuarios)
                  .reduce((a, b) => a + (b.saldoInversion || 0), 0)
                  .toLocaleString(),
            },
            {
              label: "IA activas",
              value: Object.values(usuarios).filter((u) => u.iaActiva).length,
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-white/5 p-6 rounded-xl shadow-2xl border border-white/10 hover:scale-[1.02] transition-all"
            >
              <p className="text-sm text-gray-400">{stat.label}</p>
              <h2 className="text-3xl font-bold text-purple-200 mt-1">{stat.value}</h2>
            </div>
          ))}
        </section>

        {/* Pagos pendientes */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-yellow-300">💳 Pagos Pendientes</h2>
          {pagos.length === 0 ? (
            <p className="text-gray-400">No hay pagos por aprobar.</p>
          ) : (
            pagos.map((p, i) => (
              <div
                key={i}
                className="bg-[#1e1e2f] p-4 rounded-lg border border-white/10 shadow-md"
              >
                <p><strong>👤 Usuario:</strong> {usuarios[p.uid]?.nombre || p.uid}</p>
                <p><strong>📦 Paquete:</strong> {p.paquete?.nombre}</p>
                <p><strong>💰 Monto:</strong> ${p.paquete?.inversion?.toLocaleString()}</p>
                <p><strong>🧾 Referencia:</strong> {p.referencia || "—"}</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() =>
                      aprobarPago(p.uid, p.pagoId, p.paquete.inversion, p.paquete)
                    }
                    className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded font-bold shadow-md transition"
                  >
                    ✅ Aprobar
                  </button>
                  <button
                    onClick={() => rechazarPago(p.uid, p.pagoId)}
                    className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded font-bold shadow-md transition"
                  >
                    ❌ Rechazar
                  </button>
                </div>
              </div>
            ))
          )}
        </section>

        {/* Retiros pendientes */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-cyan-300">💸 Retiros Pendientes</h2>
          {retiros.length === 0 ? (
            <p className="text-gray-400">No hay retiros pendientes.</p>
          ) : (
            retiros.map((r, i) => (
              <div
                key={i}
                className="bg-[#1c1c2c] p-4 rounded-lg border border-white/10 shadow-md"
              >
                <p><strong>👤 Usuario:</strong> {usuarios[r.uid]?.nombre || r.uid}</p>
                <p><strong>💵 Monto:</strong> ${r.monto.toLocaleString()}</p>
                <p><strong>🏦 Cuenta:</strong> {r.cuenta} ({r.tipo})</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => aprobarRetiro(r.uid, r.retiroId, r.monto)}
                    className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded font-bold shadow-md transition"
                  >
                    ✅ Aprobar
                  </button>
                  <button
                    onClick={() => rechazarRetiro(r.uid, r.retiroId)}
                    className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded font-bold shadow-md transition"
                  >
                    ❌ Rechazar
                  </button>
                </div>
              </div>
            ))
          )}
        </section>

        {/* Crear código promocional */}
        <section className="space-y-3">
          <h2 className="text-2xl font-bold text-pink-300">🎁 Crear Código Promocional</h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ej: BONO50"
              value={codigoPromo}
              onChange={(e) => setCodigoPromo(e.target.value)}
              className="bg-white/10 px-4 py-3 rounded-md w-full placeholder-white text-white border border-white/20"
            />
            <button
              onClick={crearCodigo}
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-4 py-2 rounded-md shadow-lg"
            >
              Crear
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}