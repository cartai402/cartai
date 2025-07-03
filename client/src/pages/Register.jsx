import { useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { ref, set, get, update, child } from "firebase/database";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { auth, db } from "../firebase";
import logo from "../assets/logor.png";

export default function Register() {
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    telefono: "",
    password: "",
    invitacion: "",
  });

  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { search } = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const refCode = params.get("ref");
    if (refCode) {
      setForm((prev) => ({ ...prev, invitacion: refCode }));
    }
  }, [search]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const { nombre, email, telefono, password, invitacion } = form;

    if (!nombre || !email || !telefono || !password) {
      setError("Por favor completa todos los campos.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;
      const uid = user.uid;
      const now = new Date().toISOString();

      await updateProfile(user, {
        displayName: `${nombre}|${telefono}|${invitacion || "N/A"}`,
      });

      await set(ref(db, `usuarios/${uid}`), {
        nombre,
        email,
        telefono,
        referidoPor: invitacion || null,
        registrado: now,
        paqueteActivo: false,
        saldoInversion: 0,
        saldoJuego: 0,
        bonoIA: 0,
        bonoReferido: 0,
        retiradoTotal: 0,
        movimientos: [],
      });

      await set(ref(db, `referidos/${uid}`), uid);

      if (invitacion) {
        const refSnapshot = await get(child(ref(db), `referidos/${invitacion}`));
        if (refSnapshot.exists()) {
          const referidorUID = refSnapshot.val();
          const referidorSnap = await get(ref(db, `usuarios/${referidorUID}`));
          if (referidorSnap.exists()) {
            const referidor = referidorSnap.val();
            if (referidor.paqueteActivo) {
              await update(ref(db, `usuarios/${uid}`), {
                bonoReferido: 2000,
              });
              await update(ref(db, `usuarios/${referidorUID}`), {
                bonoReferido: (referidor.bonoReferido || 0) + 6000,
              });
            }
          }
        }
      }

      navigate("/dashboard"); // o "/invest" si quieres redirigir directo a compra de paquete
    } catch (err) {
      console.error(err);
      setError("Ocurrió un error. Verifica los datos o intenta más tarde.");
    }
  };

  return (
    <main style={styles.bg}>
      <img src={logo} alt="CartAI logo" style={styles.logo} />
      <h1 style={styles.h1}>Crea tu cuenta en CartAI</h1>

      {error && <p style={styles.error}>{error}</p>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          name="nombre"
          type="text"
          placeholder="Nombre completo"
          value={form.nombre}
          onChange={handleChange}
          style={styles.input}
        />
        <input
          name="email"
          type="email"
          placeholder="Correo electrónico"
          value={form.email}
          onChange={handleChange}
          style={styles.input}
        />
        <input
          name="telefono"
          type="tel"
          placeholder="Número de teléfono"
          value={form.telefono}
          onChange={handleChange}
          style={styles.input}
        />
        <input
          name="password"
          type="password"
          placeholder="Contraseña"
          value={form.password}
          onChange={handleChange}
          style={styles.input}
        />
        <input
          name="invitacion"
          type="text"
          placeholder="Código de invitación (opcional)"
          value={form.invitacion}
          onChange={handleChange}
          style={styles.input}
        />

        <button type="submit" style={{ ...styles.btn3d, ...styles.btnGold }}>
          🏁 Registrarse
        </button>
      </form>

      <p style={styles.subText}>
        ¿Ya tienes cuenta?{" "}
        <Link to="/login" style={styles.link}>
          Inicia sesión
        </Link>
      </p>
    </main>
  );
}

/* ───────────── Estilos inline 4D ───────────── */
const styles = {
  bg: {
    minHeight: "100vh",
    padding: "60px 20px",
    background: "linear-gradient(135deg,#0f172a,#1e293b 40%,#065f46)",
    backgroundSize: "600% 600%",
    animation: "floatBg 30s linear infinite",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  logo: {
    width: 100,
    filter: "drop-shadow(0 4px 8px #000a)",
    marginBottom: 24,
  },
  h1: {
    fontSize: "2rem",
    fontWeight: 800,
    marginBottom: 24,
    textAlign: "center",
  },
  error: {
    background: "#dc2626",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: 12,
    fontWeight: 600,
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
    boxShadow: "0 2px 6px #0008",
  },
  form: {
    width: "100%",
    maxWidth: 400,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  input: {
    padding: "14px 18px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.07)",
    border: "none",
    color: "#fff",
    fontSize: "1rem",
    outline: "none",
    boxShadow: "inset 0 0 4px #ffffff22",
  },
  btn3d: {
    padding: "14px 30px",
    borderRadius: 18,
    fontWeight: 700,
    fontSize: "1.05rem",
    textDecoration: "none",
    boxShadow: "4px 4px 14px #000a",
    transition: "transform 0.2s, box-shadow 0.2s",
    cursor: "pointer",
    border: "none",
  },
  btnGold: {
    background: "linear-gradient(90deg,#facc15,#eab308)",
    color: "#000",
  },
  subText: {
    marginTop: 30,
    textAlign: "center",
    fontSize: 14,
    opacity: 0.85,
  },
  link: {
    color: "#facc15",
    fontWeight: 600,
    textDecoration: "underline",
  },
};

