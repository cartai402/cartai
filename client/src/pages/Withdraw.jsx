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

  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;

    // Verificar si ya hay una cuenta registrada
    const ctaRef = ref(db, `usuarios/${uid}/cuentaRetiro`);
    get(ctaRef).then((snap) => {
      if (snap.exists()) {
        setCuentaRegistrada(snap.val());
      }
    });

    // Cargar movimientos
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

    const cuenta = {
      tipo: tipoCta,
      numero: numero1,
    };

    await set(ref(db, `usuarios/${uid}/cuentaRetiro`), cuenta);
    setCuentaRegistrada(cuenta);
    alert("✅ Cuenta registrada correctamente.");
  };

  const solicitarRetiro = async () => {
    const cantidad = parseInt(monto);
    if (isNaN(cantidad) || cantidad < 20000) {
      alert("❌ El retiro mínimo es de $20.000");
      return;
    }

    const nuevoRetiro = {
      monto: cantidad,
      estado: "pendiente",
      fecha: new Date().toISOString(),
    };

    await push(ref(db, `retiros/${uid}`), nuevoRetiro);
    alert("✅ Retiro solicitado correctamente.");
    setMonto("");
  };

  const opciones = [
    { id: "nequi", nombre: "Nequi", logo: nequiLogo },
    { id: "daviplata", nombre: "Daviplata", logo: daviLogo },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-tr from-[#141e30] to-[#243b55] text-white p-6">
      <div className="max-w-3xl mx-auto space-y-10">
        <h1 className="text-3xl font-bold text-center">💸 Retirar dinero</h1>

        {/* Registro de cuenta */}
        {!cuentaRegistrada ? (
          <div className="bg-white/10 p-6 rounded-lg border border-white/20 space-y-4">
            <h2 className="text-xl font-semibold">📲 Registrar cuenta de retiro</h2>

            <div className="relative">
              <select
                value={tipoCta}
                onChange={(e) => setTipoCta(e.target.value)}
                className="w-full bg-white/20 p-3 rounded-lg appearance-none text-white font-semibold pr-10"
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
              className="w-full bg-white/20 p-3 rounded-lg placeholder-gray-300"
              value={numero1}
              onChange={(e) => setNumero1(e.target.value)}
            />
            <input
              placeholder="Confirma el número"
              className="w-full bg-white/20 p-3 rounded-lg placeholder-gray-300"
              value={numero2}
              onChange={(e) => setNumero2(e.target.value)}
            />
            <button
              onClick={registrarCuenta}
              className="w-full bg-green-500 hover:bg-green-600 font-bold py-3 rounded-lg transition"
            >
              Guardar cuenta
            </button>
          </div>
        ) : (
          <>
            {/* Formulario de retiro */}
            <div className="bg-white/10 p-6 rounded-lg border border-white/20 space-y-4">
              <h2 className="text-xl font-semibold">💰 Solicitar retiro</h2>
              <p className="text-gray-300">
                Cuenta registrada:{" "}
                <span className="font-bold">
                  {cuentaRegistrada.tipo.toUpperCase()} - {cuentaRegistrada.numero}
                </span>
              </p>
              <input
                placeholder="Monto a retirar (mínimo $20.000)"
                className="w-full bg-white/20 p-3 rounded-lg placeholder-gray-300"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
              />
              <button
                onClick={solicitarRetiro}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 rounded-lg transition"
              >
                Solicitar retiro
              </button>
            </div>
          </>
        )}

        {/* Lista de movimientos */}
        <div className="bg-white/10 p-6 rounded-lg border border-white/20">
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
                    className={`flex justify-between bg-white/5 p-3 rounded-md border-l-4 ${
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

