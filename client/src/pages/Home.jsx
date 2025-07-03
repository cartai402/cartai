import React from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logor.png";

/* ─────────────────────────── Helpers ─────────────────────────── */
const Testi = ({ txt, name, city }) => (
  <div style={styles.testiCard}>
    <p style={{ fontStyle: "italic" }}>{`“${txt}”`}</p>
    <hr style={{ border: "none", height: 1, background: "#ffffff22", margin: "14px 0" }} />
    <span style={styles.testiName}>{name} • {city}</span>
  </div>
);

/* ─────────────────────────── Component ─────────────────────────── */
export default function Home() {
  return (
    <main style={styles.bg}>
      {/* 1️⃣ LOGO */}
      <img src={logo} alt="CartAI logo" style={styles.logo} />

      {/* 2️⃣ Hero */}
      <h1 style={styles.h1}>
        Invierte, gana y juega <br /> con inteligencia artificial
      </h1>
      <p style={styles.sub}>
        Desde <b>$10 000 COP</b> recibes ganancias diarias • Retiros a Nequi / Daviplata
      </p>

      {/* 3️⃣ Call-to-Action buttons */}
      <div style={styles.btnWrap}>
        <Link to="/register" style={{ ...styles.btn3d, ...styles.btnGold }}>
          🏁 Regístrate
        </Link>
        <Link to="/login" style={{ ...styles.btn3d, ...styles.btnCyan }}>
          🚀 Iniciar sesión
        </Link>
      </div>

      {/* 4️⃣ Highlights  */}
      <section style={styles.cardGlass}>
        <h2 style={styles.cardTitle}>🔥 Ventajas rápidas</h2>
        <div style={styles.highWrap}>
          <High icon="💰" text="IA gratuita: $1 000 / día" />
          <High icon="📈" text="Paquetes hasta 24 000 / día" />
          <High icon="🎮" text="Dominó & Cartas para apostar" />
          <High icon="🔐" text="Retiros jueves & sábado sin fee" />
        </div>
      </section>

      {/* 5️⃣ Testimonios slider */}
      <section style={styles.testiWrap}>
        <h2 style={styles.cardTitle}>Lo que dicen nuestros usuarios</h2>

        <div style={styles.testiRow}>
          {/* 🚨 Solo 4 ejemplos estáticos; duplica si deseas */}
          <Testi
            txt="En 1 mes tripliqué la plata que tenía parada en el banco."
            name="Laura P."
            city="Barranquilla"
          />
          <Testi
            txt="Los retiros a Nequi me llegaban en menos de 10 min."
            name="David R."
            city="Medellín"
          />
          <Testi
            txt="La IA gratis me animó a comprar mi primer paquete."
            name="Carlos M."
            city="Bogotá"
          />
          <Testi
            txt="Juego dominó, gano y lo paso al saldo de inversión."
            name="Estefanía G."
            city="Cali"
          />
        </div>
      </section>

      {/* 6️⃣ Segunda CTA súper resaltada */}
      <Link to="/invest" style={styles.bigCTA}>
        Ver paquetes de inversión
      </Link>
    </main>
  );
}

/*  Pequeña tarjeta highlight */
const High = ({ icon, text }) => (
  <div style={styles.highCard}>
    <span style={styles.highIcon}>{icon}</span>
    <span>{text}</span>
  </div>
);

/* ─────────────────────────── Estilos inline ─────────────────────────── */
const styles = {
  /* Fondo animado */
  bg: {
    minHeight: "100vh",
    padding: "50px 20px 80px",
    background: "linear-gradient(135deg,#0f172a,#1e293b 40%,#065f46)",
    backgroundSize: "600% 600%",
    animation: "floatBg 30s linear infinite",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  logo: {
    width: 110,
    filter: "drop-shadow(0 4px 8px #000a)",
    marginBottom: 24,
  },
  h1: {
    fontSize: "2.5rem",
    fontWeight: 800,
    textAlign: "center",
    lineHeight: 1.2,
    marginBottom: 12,
  },
  sub: {
    textAlign: "center",
    opacity: 0.85,
    marginBottom: 40,
    maxWidth: 600,
  },
  /* 3D button genérico */
  btn3d: {
    padding: "14px 30px",
    borderRadius: 18,
    fontWeight: 700,
    fontSize: "1.05rem",
    textDecoration: "none",
    boxShadow: "4px 4px 14px #000a",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  btnGold: {
    background: "linear-gradient(90deg,#facc15,#eab308)",
    color: "#000",
  },
  btnCyan: {
    background: "linear-gradient(90deg,#38bdf8,#0ea5e9)",
    color: "#fff",
  },
  btnWrap: { display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 50 },

  /* Card de cristal */
  cardGlass: {
    backdropFilter: "blur(10px)",
    background: "rgba(255,255,255,.05)",
    borderRadius: 20,
    padding: 30,
    boxShadow: "0 8px 18px #000a",
    width: "100%",
    maxWidth: 1000,
    marginBottom: 60,
  },
  cardTitle: { fontSize: 22, fontWeight: 700, marginBottom: 20, textAlign:"center" },

  /* Highlights mini-cards */
  highWrap: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
    gap: 18,
  },
  highCard: {
    background: "rgba(0,0,0,.25)",
    borderRadius: 16,
    padding: "18px 14px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontWeight: 500,
    boxShadow: "0 4px 10px #0007",
  },
  highIcon: { fontSize: 24 },

  /* Testimonios */
  testiWrap: {
    width: "100%",
    maxWidth: 1000,
    marginBottom: 70,
    textAlign: "center",
  },
  testiRow: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))",
    marginTop: 18,
  },
  testiCard: {
    background: "rgba(255,255,255,.04)",
    padding: 20,
    borderRadius: 18,
    boxShadow: "0 6px 14px #0007",
    lineHeight: 1.4,
    fontSize: 15,
  },
  testiName: { fontSize: 13, opacity: 0.8 },

  /* CTA inferior */
  bigCTA: {
    display: "inline-block",
    padding: "16px 36px",
    fontSize: "1.2rem",
    fontWeight: 700,
    background: "linear-gradient(90deg,#22c55e,#16a34a)",
    color: "#fff",
    borderRadius: 24,
    boxShadow: "0 0 20px #16a34a88",
    textDecoration: "none",
    animation: "pulse 2.5s infinite",
  },
};

/*  Nota:
    ▸  Asegúrate de tener en tu CSS global:
      @keyframes floatBg {0%{background-position:0 0}100%{background-position:600px 600px}}
      @keyframes pulse   {0%{box-shadow:0 0 0 0 #16a34a88}70%{box-shadow:0 0 0 20px #16a34a00}100%{box-shadow:0 0 0 0 #16a34a00}}
*/