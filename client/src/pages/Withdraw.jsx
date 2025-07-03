import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { ref, get, set, push, onValue } from "firebase/database";
import nequiLogo from "../assets/nequi.png";
import daviLogo from "../assets/daviplata.png";

export default function Withdraw() {
  const [cuentaRegistrada, setCuentaRegistrada] = useState(null);
  const [tipoCta, setTipoCta] = useState("nequi");
  const [numero1, setNumero1] = useState("");
  const [numero2, setNumero2] = useState("");
  const [monto, setMonto] = useState("");
  const [movimientos, setMovimientos] = useState([]);
  const [saldo, setSaldo] = useState(0);

  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;

    const userRef = ref(db, `usuarios/${uid}`);
    get(userRef).then((snap) => {
      const data = snap.val();
      if (data?.saldo) {
        setSaldo(data.saldo);
      }
    });

    const ctaRef = ref(db, `usuarios/${uid}/cuentaRetiro`);
    get(ctaRef).then((snap) => {
      if (snap.exists()) {
        setCuentaRegistrada(snap.val());
      }
    });

    const movRef = ref(db, `retiros/${uid}`);
    onValue(movRef, (snap) => {
      const data = snap.val() || {};
      const lista = Object.values(data).reverse();
      setMovimientos(lista);
    });
  }, [uid]);

  const registrarCuenta = async () => {
    if (numero1 !== numero2) {
      alert("❌ Los números no coinciden.");
      return;
    }
    if (numero1.length < 9) {
      alert("❌ El número ingresado no es válido.");
      return;
    }

    const cuenta = { tipo: tipoCta, numero: numero1 };
    await set(ref(db, `usuarios/${uid}/cuentaRetiro`), cuenta);
    setCuentaRegistrada(cuenta);
    alert("✅ Cuenta registrada correctamente.");
  };

  const solicitarRetiro = async () => {
    const cantidad = parseInt(monto);
    if (isNaN(cantidad) || cantidad < 20000) {
      alert("❌ El retiro mínimo es de $20.000.");
      return;
    }

    if (cantidad > saldo) {
      alert("❌ No tienes suficiente saldo disponible.");
      return;
    }

    const nuevoRetiro = {
      monto: cantidad,
      estado: "pendiente",
      fecha: new Date().toISOString(),
    };

    await push(ref(db, `retiros/${uid}`), nuevoRetiro);
    setMonto("");
    alert("✅ Retiro solicitado correctamente.");
  };

  const opciones = [
    { id: "nequi", nombre: "Nequi", logo: nequiLogo },
    { id: "daviplata", nombre: "Daviplata", logo: daviLogo },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-tr from-[#0a0f1e] to-[#141e30] text-white p-6">
      <div className="max-w-3xl mx-auto space-y-10">
        <h1 className="text-4xl font-bold text-center">💸 Retirar dinero</h1>

        {!cuentaRegistrada ? (
          <div className="bg-[#1d273b] p-6 rounded-xl shadow-2xl border border-white/10 space-y-4">
            <h2 className="text-xl font-semibold">📲 Registrar cuenta de retiro</h2>

            <div className="relative">
              <select
                value={tipoCta}
                onChange={(e) => setTipoCta(e.target.value)}
                className="w-full bg-white/10 p-3 rounded-lg text-white font-semibold pr-10 appearance-none"
                style={{
                  backgroundImage: `url(${opciones.find((o) => o.id === tipoCta)?.logo})`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 0.75rem center",
                  backgroundSize: "24px 24px",
                }}
              >
                {opciones.map((op) => (
                  <option key={op.id} value={op.id} className="text-black">
                    {op.nombre}
                  </option>
                ))}
              </select>
            </div>

            <input
              placeholder="Número de cuenta"
              className="w-full bg-white/10 p-3 rounded-lg placeholder-gray-300"
              value={numero1}
              onChange={(e) => setNumero1(e.target.value)}
            />
            <input
              placeholder="Confirma el número"
              className="w-full bg-white/10 p-3 rounded-lg placeholder-gray-300"
              value={numero2}
              onChange={(e) => setNumero2(e.target.value)}
            />
            <button
              onClick={registrarCuenta}
              className="w-full bg-green-500 hover:bg-green-600 font-bold py-3 rounded-lg transition shadow-md"
            >
              Guardar cuenta
            </button>
          </div>
        ) : (
          <div className="bg-[#1d273b] p-6 rounded-xl shadow-2xl border border-white/10 space-y-4">
            <h2 className="text-xl font-semibold">💰 Solicitar retiro</h2>
            <p className="text-gray-300">
              Cuenta registrada:{" "}
              <span className="font-bold text-white">
                {cuentaRegistrada.tipo.toUpperCase()} - {cuentaRegistrada.numero}
              </span>
            </p>
            <p className="text-gray-400">
              Saldo disponible: <b>${saldo.toLocaleString()}</b>
            </p>
            <input
              placeholder="Monto a retirar (mínimo $20.000)"
              className="w-full bg-white/10 p-3 rounded-lg placeholder-gray-300"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />
            <button
              onClick={solicitarRetiro}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 rounded-lg transition shadow-md"
            >
              Solicitar retiro
            </button>
          </div>
        )}

        <div className="bg-[#1d273b] p-6 rounded-xl shadow-2xl border border-white/10">
          <h2 className="text-xl font-semibold mb-4">📄 Movimientos</h2>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {movimientos.length === 0 ? (
              <p className="text-gray-400">Aún no tienes movimientos.</p>
            ) : (
              movimientos.map((mov, i) => {
                const color =
                  mov.estado === "aprobado"
                    ? "text-green-400"
                    : mov.estado === "rechazado"
                    ? "text-red-400"
                    : "text-yellow-300";
                return (
                  <div
                    key={i}
                    className={`flex justify-between bg-white/5 p-3 rounded-lg border-l-4 ${
                      color === "text-green-400"
                        ? "border-green-400"
                        : color === "text-red-400"
                        ? "border-red-400"
                        : "border-yellow-300"
                    }`}
                  >
                    <span className={color}>
                      ${mov.monto.toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-300">
                      {mov.estado.toUpperCase()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </main>
  );
}