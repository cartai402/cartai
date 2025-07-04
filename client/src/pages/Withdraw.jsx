import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { ref, get, set, push, onValue, update } from "firebase/database"; // ← añadimos update
import nequiLogo from "../assets/nequi.png";
import daviLogo from "../assets/daviplata.png";

export default function Withdraw() {
  const [cuentaRegistrada, setCuentaRegistrada] = useState(null);
  const [tipoCta, setTipoCta] = useState("nequi");
  const [numero1, setNumero1] = useState("");
  const [numero2, setNumero2] = useState("");
  const [monto, setMonto] = useState("");
  const [movimientos, setMovimientos] = useState([]);
  const [saldo, setSaldo] = useState(0);            // ← aquí “saldo” = ganancia
  const [showSuccess, setShowSuccess] = useState(false);

  const uid = auth.currentUser?.uid;

  /* ---------- Load ---------- */
  useEffect(() => {
    if (!uid) return;

    (async () => {
      // Cargamos la GANANCIA como saldo disponible
      const userSnap = await get(ref(db, `usuarios/${uid}`));
      setSaldo(userSnap.val()?.ganancias ?? 0);

      const ctaSnap = await get(ref(db, `usuarios/${uid}/cuentaRetiro`));
      if (ctaSnap.exists()) setCuentaRegistrada(ctaSnap.val());
    })();

    const movRef = ref(db, `retiros/${uid}`);
    return onValue(movRef, snap => {
      const lista = Object.values(snap.val() || {}).reverse();
      setMovimientos(lista);
    });
  }, [uid]);

  /* ---------- Guardar cuenta ---------- */
  const registrarCuenta = async () => {
    if (numero1 !== numero2) return alert("❌ Los números no coinciden.");
    if (numero1.length < 9)   return alert("❌ El número ingresado no es válido.");

    const cuenta = { tipo: tipoCta, numero: numero1 };
    await set(ref(db, `usuarios/${uid}/cuentaRetiro`), cuenta);
    setCuentaRegistrada(cuenta);
    alert("✅ Cuenta registrada correctamente.");
  };

  /* ---------- Retiro ---------- */
  const solicitarRetiro = async () => {
    const cant = parseInt(monto);
    if (isNaN(cant) || cant < 20000) return alert("❌ Mínimo $20.000.");
    if (cant > saldo)               return alert("❌ Ganancia insuficiente.");

    // Registrar el retiro
    await push(ref(db, `retiros/${uid}`), {
      monto: cant,
      estado: "pendiente",
      fecha: new Date().toISOString(),
    });

    // Descontar de GANANCIA
    const nuevaGanancia = saldo - cant;
    await update(ref(db, `usuarios/${uid}`), { ganancias: nuevaGanancia });

    // Actualizar estado local
    setSaldo(nuevaGanancia);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 1800);
    setMonto("");
  };

  /* ---------- UI ---------- */
  const opciones = [
    { id: "nequi", nombre: "Nequi",   logo: nequiLogo },
    { id: "daviplata", nombre: "Daviplata", logo: daviLogo },
  ];

  return (
    <main style={styles.bg}>
      <div className="max-w-3xl mx-auto space-y-10">
        <h1 style={styles.title}>💸 Retirar dinero</h1>

        {/* ---------- cuenta ---------- */}
        {!cuentaRegistrada ? (
          <Card>
            <h2 style={styles.subtitle}>📲 Registrar cuenta</h2>
            {/* selector */}
            <div style={{ position: "relative" }}>
              <select
                value={tipoCta}
                onChange={e => setTipoCta(e.target.value)}
                style={{
                  ...styles.input,
                  backgroundImage: `url(${opciones.find(o => o.id === tipoCta).logo})`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 1rem center",
                  backgroundSize: "26px 26px",
                  animation: "pulseIcon 3s infinite",
                  appearance: "none",
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
              style={styles.input}
              value={numero1}
              onChange={e => setNumero1(e.target.value)}
            />
            <input
              placeholder="Confirma el número"
              style={styles.input}
              value={numero2}
              onChange={e => setNumero2(e.target.value)}
            />
            <button onClick={registrarCuenta} style={styles.greenBtn}>
              Guardar cuenta
            </button>
          </Card>
        ) : (
          <Card>
            <h2 style={styles.subtitle}>💰 Solicitar retiro</h2>
            <p>
              Cuenta:{" "}
              <b>
                {cuentaRegistrada.tipo.toUpperCase()} - {cuentaRegistrada.numero}
              </b>
            </p>
            {/* Mostramos la ganancia como saldo disponible */}
            <p>
              Ganancia disponible: <b>${saldo.toLocaleString()}</b>
            </p>

            <input
              placeholder="Monto a retirar (mínimo $20.000)"
              style={styles.input}
              value={monto}
              onChange={e => setMonto(e.target.value)}
            />
            <button onClick={solicitarRetiro} style={styles.yellowBtn}>
              Solicitar retiro
            </button>
          </Card>
        )}

        {/* ---------- movimientos ---------- */}
        <Card>
          <h2 style={styles.subtitle}>📄 Movimientos</h2>
          <div style={{ maxHeight: 300, overflowY: "auto", marginTop: 12 }}>
            {movimientos.length === 0 ? (
              <p style={{ color: "#aaa" }}>Aún no tienes movimientos.</p>
            ) : (
              movimientos.map((m, i) => {
                const col =
                  m.estado === "aprobado"
                    ? "#00e676"
                    : m.estado === "rechazado"
                    ? "#ef5350"
                    : "#ffd54f";
                return (
                  <div
                    key={i}
                    style={{
                      background: "#202b3d",
                      display: "flex",
                      justifyContent: "space-between",
                      padding: 12,
                      borderRadius: 10,
                      marginBottom: 8,
                      borderLeft: `4px solid ${col}`,
                      boxShadow: "2px 2px 6px #000a",
                    }}
                  >
                    <span style={{ color: col }}>${m.monto.toLocaleString()}</span>
                    <span style={{ fontSize: 12, color: "#aaa" }}>
                      {m.estado.toUpperCase()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* ---------- overlay éxito ---------- */}
      {showSuccess && <SuccessOverlay />}
    </main>
  );
}

/* ---------- tarjetas ---------- */
const Card = ({ children }) => <div style={styles.card}>{children}</div>;

/* ---------- overlay éxito ---------- */
const SuccessOverlay = () => (
  <div style={styles.overlay}>
    {Array.from({ length: 8 }).map((_, i) => (
      <span
        key={i}
        className="confetti-piece"
        style={{
          left: `${Math.random() * 100}%`,
          background: `hsl(${Math.random() * 360} 80% 60%)`,
          animationDelay: `${Math.random() * 0.3}s`,
        }}
      />
    ))}
    <div style={styles.checkBox}>
      <span style={{ fontSize: 48, lineHeight: 1 }}>✔️</span>
      <p style={{ margin: 0, marginTop: 6, fontWeight: 600 }}>Solicitud enviada</p>
    </div>
  </div>
);

/* ---------- styles ---------- */
const styles = {
  bg: { background: "#0a0f1e", minHeight: "100vh", color: "white", padding: 20 },
  title: { fontSize: 28, fontWeight: "bold", textAlign: "center" },
  subtitle: { fontSize: 20, fontWeight: "bold", marginBottom: 12 },
  card: {
    background: "#152037",
    padding: 20,
    borderRadius: 22,
    boxShadow: "4px 4px 12px #000a",
    backdropFilter: "blur(4px)",
  },
  input: {
    width: "100%",
    background: "rgba(255,255,255,.08)",
    color: "white",
    padding: "12px 16px",
    borderRadius: 14,
    marginBottom: 10,
    border: "none",
    outline: "none",
    fontWeight: 500,
  },
  greenBtn: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 14,
    background: "#00c853",
    border: "none",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "3px 3px 8px #0009",
    transition: ".2s",
  },
  yellowBtn: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 14,
    background: "#ffd600",
    border: "none",
    color: "#000",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "3px 3px 8px #0009",
    transition: ".2s",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  checkBox: {
    background: "#152037",
    padding: "40px 60px",
    borderRadius: 30,
    boxShadow: "0 8px 20px #000c",
    textAlign: "center",
  },
};