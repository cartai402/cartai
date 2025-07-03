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
          const p = datos[uid][pagoId];
          todos.push({
            uid,
            pagoId,
            paqueteNom: p.paquete?.nombre || "Sin nombre",
            inversion: p.paquete?.inversion || 0,
            referencia: p.referencia || "Sin ref.",
            fecha: p.fecha || null,
          });
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

  const aprobarPago = async (uid, pagoId, inversion, paqueteNom) => {
    const userRef = ref(db, `usuarios/${uid}`);
    const userSnap = await get(userRef);
    const userData = userSnap.val();

    const nuevoSaldo = (userData.saldoInversion || 0) + inversion;

    await update(userRef, {
      saldoInversion: nuevoSaldo,
      paqueteActivo: true,
    });

    const historialRef = ref(db, `usuarios/${uid}/paquetes`);
    await push(historialRef, {
      nombre: paqueteNom,
      inversion,
      fecha: Date.now(),
      estado: "activo",
    });

    await remove(ref(db, `pagosPendientes/${uid}/${pagoId}`));

    setMensaje("✅ Pago aprobado, paquete activado y saldo sumado.");
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
    const codigoRef = ref(db, `codigosPromocionales/${codigoPromo}`);
    set(codigoRef, { activo: true });
    setCodigoPromo("");
    setMensaje("🎉 Código creado correctamente.");
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f766e] text-white p-6">
      <div className="max-w-6xl mx-auto space-y-10">
        <h1 className="text-3xl font-extrabold text-center tracking-tight">⚙️ Panel Administrativo CartAI</h1>

        {mensaje && (
          <div className="text-center bg-green-600/10 border border-green-400 text-green-300 font-medium py-2 rounded">
            {mensaje}
          </div>
        )}

        {/* Estadísticas generales */}
        <section className="grid sm:grid-cols-3 gap-6 text-center">
          <div className="bg-white/10 p-5 rounded-xl border border-white/10 shadow-lg">
            <p className="text-gray-300 text-sm">Usuarios registrados</p>
            <h2 className="text-2xl font-bold">{Object.keys(usuarios).length}</h2>
          </div>
          <div className="bg-white/10 p-5 rounded-xl border border-white/10 shadow-lg">
            <p className="text-gray-300 text-sm">Total inversión</p>
            <h2 className="text-2xl font-bold text-green-400">
              $
              {Object.values(usuarios)
                .reduce((a, b) => a + (b.saldoInversion || 0), 0)
                .toLocaleString()}
            </h2>
          </div>
          <div className="bg-white/10 p-5 rounded-xl border border-white/10 shadow-lg">
            <p className="text-gray-300 text-sm">IA activas</p>
            <h2 className="text-2xl font-bold text-yellow-400">
              {
                Object.values(usuarios).filter((u) => u.paqueteActivo === true)
                  .length
              }
            </h2>
          </div>
        </section>

        {/* Pagos pendientes */}
        <section>
          <h2 className="text-xl font-bold mb-4">🧾 Pagos pendientes</h2>
          {pagos.length === 0 ? (
            <p className="text-gray-400">No hay pagos por aprobar.</p>
          ) : (
            pagos.map((p, i) => (
              <div
                key={i}
                className="bg-white/5 p-4 rounded-lg mb-4 border border-white/10 shadow-md space-y-1"
              >
                <p><b>👤 Usuario:</b> {usuarios[p.uid]?.nombre || p.uid}</p>
                <p><b>📦 Paquete:</b> {p.paqueteNom}</p>
                <p><b>💰 Monto:</b> ${p.inversion.toLocaleString()}</p>
                <p><b>🧾 Ref.:</b> {p.referencia}</p>
                <div className="flex gap-3 mt-3">
                  <button
                    onClick={() =>
                      aprobarPago(p.uid, p.pagoId, p.inversion, p.paqueteNom)
                    }
                    className="bg-green-600 hover:bg-green-700 px-4 py-1 rounded-md font-semibold"
                  >
                    ✅ Aprobar
                  </button>
                  <button
                    onClick={() => rechazarPago(p.uid, p.pagoId)}
                    className="bg-red-600 hover:bg-red-700 px-4 py-1 rounded-md font-semibold"
                  >
                    ❌ Rechazar
                  </button>
                </div>
              </div>
            ))
          )}
        </section>

        {/* Retiros pendientes */}
        <section>
          <h2 className="text-xl font-bold mb-4">🏦 Retiros pendientes</h2>
          {retiros.length === 0 ? (
            <p className="text-gray-400">No hay retiros pendientes.</p>
          ) : (
            retiros.map((r, i) => (
              <div
                key={i}
                className="bg-white/5 p-4 rounded-lg mb-4 border border-white/10 shadow-md space-y-1"
              >
                <p><b>👤 Usuario:</b> {usuarios[r.uid]?.nombre || r.uid}</p>
                <p><b>💵 Monto:</b> ${r.monto.toLocaleString()}</p>
                <p><b>📱 Cuenta:</b> {r.cuenta} ({r.tipo})</p>
                <div className="flex gap-3 mt-3">
                  <button
                    onClick={() =>
                      aprobarRetiro(r.uid, r.retiroId, r.monto)
                    }
                    className="bg-green-600 hover:bg-green-700 px-4 py-1 rounded-md font-semibold"
                  >
                    ✅ Aprobar
                  </button>
                  <button
                    onClick={() => rechazarRetiro(r.uid, r.retiroId)}
                    className="bg-red-600 hover:bg-red-700 px-4 py-1 rounded-md font-semibold"
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
          <h2 className="text-xl font-bold">🎁 Crear código promocional</h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ej: BONO500"
              value={codigoPromo}
              onChange={(e) => setCodigoPromo(e.target.value.toUpperCase())}
              className="bg-white/10 p-3 rounded-md w-full placeholder-white"
            />
            <button
              onClick={crearCodigo}
              className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded-md font-bold"
            >
              Crear
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}