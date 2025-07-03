import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { auth } from "../firebase";
import logo from "../assets/logor.png";

export default function Login() {
  const [userInput, setUserInput] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const phoneRegex = /^[0-9]{10,}$/;
    const email = phoneRegex.test(userInput)
      ? `${userInput}@cartai.com`
      : userInput;

    try {
      await signInWithEmailAndPassword(auth, email, password);

      if (email === "admincartai@cartai.com") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setErrorMsg("❌ Credenciales incorrectas");
    }
  };

  return (
    <main style={styles.bg}>
      {/* Logo */}
      <img src={logo} alt="CartAI logo" style={styles.logo} />

      <h1 style={styles.h1}>Iniciar sesión</h1>

      {errorMsg && (
        <p style={styles.errorMsg}>{errorMsg}</p>
      )}

      <form onSubmit={handleLogin} style={styles.form}>
        <input
          type="text"
          placeholder="Correo o número de teléfono"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          required
          style={styles.input}
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={styles.input}
        />

        <button type="submit" style={{ ...styles.btn3d, ...styles.btnGold }}>
          🚀 Ingresar
        </button>
      </form>

      <p style={styles.subText}>
        ¿No tienes cuenta?{" "}
        <Link to="/register" style={styles.link}>
          Regístrate aquí
        </Link>
      </p>
    </main>
  );
}

/* ─────────────── Estilos inline coherentes con Home.jsx ─────────────── */
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
    marginBottom: 28,
  },
  h1: {
    fontSize: "2rem",
    fontWeight: 800,
    marginBottom: 24,
    textAlign: "center",
  },
  form: {
    width: "100%",
    maxWidth: 400,
    display: "flex",
    flexDirection: "column",
    gap: 18,
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
  errorMsg: {
    background: "#dc2626",
    color: "#fff",
    padding: "8px 16px",
    borderRadius: 12,
    marginBottom: 16,
    fontWeight: 600,
    fontSize: 14,
    textAlign: "center",
    boxShadow: "0 2px 6px #0008",
  },
};

