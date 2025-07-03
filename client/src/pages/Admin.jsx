import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  ref,
  onValue,
  update,
  remove,
  push,
  get,
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

  // Verifica si es el admin
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

  // Carga los datos
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

  // Aprobar pago
  const aprobarPago = async (uid, pagoId, inversion, paquete) => {
    const userRef = ref(db, `usuarios/${uid}`);
    const userSnap = await get(userRef);
    const data = userSnap.val();

    const saldo = (data.saldoInversion || 0) + inversion;

    const historialRef = ref(db, `usuarios/${uid}/paquetes`);
    push(historialRef, {
      ...paquete,
      fecha: Date.now(),
      estado: "activo",
    });

    await update(userRef, {
      saldoInversion: saldo,
      paqueteActivo: true,
    });

    await remove(ref(db, `pagosPendientes/${uid}/${pagoId}`));
    setMensaje("✅ Pago aprobado y saldo asignado.");
  };

  // Rechazar pago
  const rechazarPago = async (uid, pagoId) => {
    await remove(ref(db, `pagosPendientes/${uid}/${pagoId}`));
    setMensaje("❌ Pago rechazado.");
  };

  // Aprobar retiro
  const aprobarRetiro = async (uid, retiroId, monto) => {
    const userRef = ref(db, `usuarios/${uid}`);
    const snap = await get(userRef);
    const data = snap.val();
    const nuevoSaldo = (data.saldoGanado || 0) - monto;

    await update(userRef, { saldoGanado: nuevoSaldo });
    await remove(ref(db, `retirosPendientes/${uid}/${retiroId}`));
    setMensaje("✅ Retiro aprobado.");
  };

  // Rechazar retiro
  const rechazarRetiro = async (uid, retiroId) => {
    await remove(ref(db, `retirosPendientes/${uid}/${retiroId}`));
    setMensaje("❌ Retiro rechazado.");
  };

  // Crear código promocional
  const crearCodigo = () => {
    if (!codigoPromo.trim()) return;
    const codigoRef = ref(db, `codigosPromocionales/${codigoPromo}`);
    set(codigoRef, { activo: true });
    setCodigoPromo("");
    setMensaje("🎉 Código creado correctamente.");
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#141e30] to-[#243b55] text-white p-6">
      <div className="max-w-6xl mx-auto space-y-10">
        <h1 className="text-3xl font-bold text-center">Panel Administrativo 🛠️</h1>

        {mensaje && <p className="text-green-400 text-center">{mensaje}</p>}

        {/* Estadísticas */}
        <section className="grid sm:grid-cols-3 gap-4 text-center">
          <div className="bg-white/10 p-4 rounded-lg border border-white/10">
            <p className="text-gray-400 text-sm">Usuarios registrados</p>
            <h2 className="text-2xl font-bold">{Object.keys(usuarios).length}</h2>
          </div>
          <div className="bg-white/10 p-4 rounded-lg border border-white/10">
            <p className="text-gray-400 text-sm">Total inversión</p>
            <h2 className="text-2xl font-bold text-green-300">
              $
              {Object.values(usuarios)
                .reduce((a, b) => a + (b.saldoInversion || 0), 0)
                .toLocaleString()}
            </h2>
          </div>
          <div className="bg-white/10 p-4 rounded-lg border border-white/10">
            <p className="text-gray-400 text-sm">IA activas</p>
            <h2 className="text-2xl font-bold text-yellow-300">
              {Object.values(usuarios).filter((u) => u.iaActiva).length}
            </h2>
          </div>
        </section>

        {/* Aprobación de pagos */}
        <section>
          <h2 className="text-xl font-bold mb-3">Pagos pendientes</h2>
          {pagos.length === 0 ? (
            <p className="text-gray-400">No hay pagos por aprobar.</p>
          ) : (
            pagos.map((p, i) => (
              <div key={i} className="bg-white/10 p-4 rounded-lg mb-3 border border-white/20 space-y-1">
                <p><strong>UID:</strong> {p.uid}</p>
                <p><strong>Paquete:</strong> {p.paquete?.nombre || "—"}</p>
                <p><strong>Monto:</strong> ${p.paquete?.inversion?.toLocaleString()}</p>
                <p><strong>Referencia:</strong> {p.referencia || "N/A"}</p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() =>
                      aprobarPago(p.uid, p.pagoId, p.paquete.inversion, p.paquete)
                    }
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded-md"
                  >
                    Aprobar
                  </button>
                  <button
                    onClick={() => rechazarPago(p.uid, p.pagoId)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded-md"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))
          )}
        </section>

        {/* Retiros */}
        <section>
          <h2 className="text-xl font-bold mb-3">Retiros pendientes</h2>
          {retiros.length === 0 ? (
            <p className="text-gray-400">No hay retiros pendientes.</p>
          ) : (
            retiros.map((r, i) => (
              <div key={i} className="bg-white/10 p-4 rounded-lg mb-3 border border-white/20 space-y-1">
                <p><strong>UID:</strong> {r.uid}</p>
                <p><strong>Monto:</strong> ${r.monto.toLocaleString()}</p>
                <p><strong>Cuenta:</strong> {r.cuenta} ({r.tipo})</p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() =>
                      aprobarRetiro(r.uid, r.retiroId, r.monto)
                    }
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded-md"
                  >
                    Aprobar
                  </button>
                  <button
                    onClick={() => rechazarRetiro(r.uid, r.retiroId)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded-md"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))
          )}
        </section>

        {/* Crear código promocional */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Crear código promocional</h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ej: BONO50"
              value={codigoPromo}
              onChange={(e) => setCodigoPromo(e.target.value.toUpperCase())}
              className="bg-white/10 p-2 rounded-md w-full placeholder-white"
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
