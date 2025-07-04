import { Link } from "react-router-dom";
import logo from "../assets/logor.png";

/* ─────────────────────────── Componente ─────────────────────────── */
export default function NotFound() {
  return (
    <main style={st.bg}>

      {/* capa de partículas sutiles */}
      <div style={st.stars} />

      <section style={st.card}>

        <img src={logo} alt="CartAI" style={st.logo} />

        <h1 style={st.big404}>
          4<span style={{ filter:"drop-shadow(0 0 8px #facc15aa)" }}>0</span>4
        </h1>

        <p style={st.sub}>
          Ups… La página que buscas no existe o cambió de dirección.
        </p>

        <Link to="/" style={{ ...st.btn3d, ...st.btnGold }}>
          ⬅ Volver al inicio
        </Link>
      </section>

      {/* keyframes extra */}
      <style>{`
        @keyframes floatBg {
          0% { background-position: 0 0; }
          100% { background-position: 600px 600px; }
        }
        @keyframes twinkle {
          0%,100% { opacity: .8 }
          50% { opacity: .3 }
        }
      `}</style>
    </main>
  );
}

/* ─────────────────────────── Estilos inline ─────────────────────────── */
const st = {
  /* fondo animado + blur */
  bg: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    background: "linear-gradient(135deg,#0f172a,#1e293b 40%,#1f4037)",
    backgroundSize: "600% 600%",
    animation: "floatBg 25s linear infinite",
    color: "#fff",
    padding: 20,
  },
  /* partículas */
  stars: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "radial-gradient(#ffffff55 1.2px, transparent 1.2px), radial-gradient(#ffffff33 1px, transparent 1px)",
    backgroundSize: "6px 6px, 12px 12px",
    animation: "twinkle 3s ease-in-out infinite",
    opacity: 0.4,
    pointerEvents: "none",
  },
  /* tarjeta de cristal */
  card: {
    backdropFilter: "blur(12px)",
    background: "rgba(255,255,255,.05)",
    border: "1px solid rgba(255,255,255,.1)",
    borderRadius: 24,
    padding: "40px 32px",
    width: "100%",
    maxWidth: 420,
    textAlign: "center",
    boxShadow: "0 8px 20px #000a",
    position: "relative",
    zIndex: 1,
  },
  logo: {
    width: 72,
    marginBottom: 26,
    filter: "drop-shadow(0 4px 8px #0006)",
  },
  big404: {
    fontSize: "5rem",
    fontWeight: 900,
    lineHeight: 1,
    background: "linear-gradient(90deg,#facc15 30%,#eab308 70%)",
    WebkitBackgroundClip: "text",
    color: "transparent",
    margin: 0,
    letterSpacing: 2,
  },
  sub: {
    fontSize: 18,
    opacity: 0.9,
    margin: "18px 0 32px",
  },
  /* botón 3-D */
  btn3d: {
    padding: "14px 30px",
    borderRadius: 18,
    fontWeight: 700,
    textDecoration: "none",
    boxShadow: "4px 4px 14px #000a",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  btnGold: {
    background: "linear-gradient(90deg,#facc15,#eab308)",
    color: "#000",
  },
};