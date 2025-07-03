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
      if (data?.saldo) setSaldo(data.saldo);
    });

    const ctaRef = ref(db, `usuarios/${uid}/cuentaRetiro`);
    get(ctaRef).then((snap) => {
      if (snap.exists()) setCuentaRegistrada(snap.val());
    });

    const movRef = ref(db, `retiros/${uid}`);
    onValue(movRef, (snap) => {
      const data = snap.val() || {};
      const lista = Object.values(data).reverse();
      setMovimientos(lista);
    });
  }, [uid]);

  const registrarCuenta = async () => {
    if (numero1 !== numero2) return alert("❌ Los números no coinciden.");
    if (numero1.length < 9) return alert("❌ El número ingresado no es válido.");

    const cuenta = { tipo: tipoCta, numero: numero1 };
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
    alert("✅ Retiro solicitado correctamente.");
    setMonto("");
  };

  const opciones = [
    { id: "nequi", nombre: "Nequi", logo: nequiLogo },
    { id: "daviplata", nombre: "Daviplata", logo: daviLogo },
  ];

  return (
    <main style={styles.bg}>
      <div className="max-w-3xl mx-auto space-y-10">
        <h1 style={styles.title}>💸 Retirar dinero</h1>

        {/* Cuenta no registrada */}
        {!cuentaRegistrada ? (
          <div style={styles.card}>
            <h2 style={styles.subtitle}>📲 Registrar cuenta de retiro</h2>

            <div style={{ position: "relative" }}>
              <select
                value={tipoCta}
                onChange={(e) => setTipoCta(e.target.value)}
                style={{
                  ...styles.input,
                  backgroundImage: `url(${opciones.find(o => o.id === tipoCta).logo})`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 1rem center",
                  backgroundSize: "26px 26px",
                  appearance: "none"
                }}
              >
                {opciones.map(op => (
                  <option key={op.id} value={op.id} style={{ color: "#000" }}>
                    {op.nombre}
                  </option>
                ))}
              </select>
            </div>

            <input
              placeholder="Número de cuenta"
              value={numero1}
              onChange={(e) => setNumero1(e.target.value)}
              style={styles.input}
            />
            <input
              placeholder="Confirma el número"
              value={numero2}
              onChange={(e) => setNumero2(e.target.value)}
              style={styles.input}
            />
            <button onClick={registrarCuenta} style={styles.greenBtn}>
              Guardar cuenta
            </button>
          </div>
        ) : (
          <div style={styles.card}>
            <h2 style={styles.subtitle}>💰 Solicitar retiro</h2>
            <p>Cuenta: <b>{cuentaRegistrada.tipo.toUpperCase()} - {cuentaRegistrada.numero}</b></p>
            <p>Saldo disponible: <b>${saldo.toLocaleString()}</b></p>

            <input
              placeholder="Monto a retirar (mínimo $20.000)"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              style={styles.input}
            />
            <button onClick={solicitarRetiro} style={styles.yellowBtn}>
              Solicitar retiro
            </button>
          </div>
        )}

        {/* Movimientos */}
        <div style={styles.card}>
          <h2 style={styles.subtitle}>📄 Movimientos</h2>
          <div style={{ maxHeight: 300, overflowY: "auto", marginTop: 12 }}>
            {movimientos.length === 0 ? (
              <p style={{ color: "#aaa" }}>Aún no tienes movimientos.</p>
            ) : (
              movimientos.map((mov, i) => {
                const color =
                  mov.estado === "aprobado" ? "#00e676" :
                  mov.estado === "rechazado" ? "#ef5350" : "#ffd54f";

                return (
                  <div key={i} style={{
                    background: "#202b3d",
                    display: "flex",
                    justifyContent: "space-between",
                    padding: 12,
                    borderRadius: 10,
                    marginBottom: 8,
                    borderLeft: `4px solid ${color}`,
                    boxShadow: "2px 2px 6px #000a"
                  }}>
                    <span style={{ color }}>{`$${mov.monto.toLocaleString()}`}</span>
                    <span style={{ fontSize: 12, color: "#aaa" }}>{mov.estado.toUpperCase()}</span>
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

/* === ESTILOS 4D tipo Dashboard === */
const styles = {
  bg: {
    background: "#0a0f1e",
    minHeight: "100vh",
    color: "white",
    padding: 20
  },
  card: {
    background: "#152037",
    padding: 20,
    borderRadius: 20,
    boxShadow: "4px 4px 12px #000a"
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center"
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12
  },
  input: {
    width: "100%",
    background: "rgba(255,255,255,0.08)",
    color: "white",
    padding: "12px 16px",
    borderRadius: 12,
    marginBottom: 10,
    border: "none",
    outline: "none",
    fontWeight: 500
  },
  greenBtn: {
    width: "100%",
    padding: "12px 16px",
    backgroundColor: "#00c853",
    color: "white",
    border: "none",
    borderRadius: 12,
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: "3px 3px 6px #0008"
  },
  yellowBtn: {
    width: "100%",
    padding: "12px 16px",
    backgroundColor: "#ffd600",
    color: "#000",
    border: "none",
    borderRadius: 12,
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: "3px 3px 6px #0008"
  }
};