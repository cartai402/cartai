/*  Dominó CartAI – fichas 3-D ligeras (sin dependencias externas)  */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

/* ───────── helpers de dominó ───────── */
const baraja = () => {
  const s = [];
  for (let i = 0; i <= 6; i++) for (let j = i; j <= 6; j++) s.push([i, j]);
  return s.sort(() => Math.random() - 0.5);
};
const dobleAlto = (h) =>
  h.filter((t) => t[0] === t[1]).sort((a, b) => b[0] - a[0])[0];

/* ───────── componente FICHA ───────── */
const pipPos = [
  [], // 0
  [[50, 50]], // 1
  [[25, 25], [75, 75]], // 2
  [[25, 25], [50, 50], [75, 75]], // 3
  [[25, 25], [25, 75], [75, 25], [75, 75]], // 4
  [[25, 25], [25, 75], [50, 50], [75, 25], [75, 75]], // 5
  [[25, 25], [25, 50], [25, 75], [75, 25], [75, 50], [75, 75]], // 6
];

const Face = ({ n }) => (
  <div style={st.face}>
    {pipPos[n].map(([x, y], i) => (
      <span key={i} style={{ ...st.dot, left: `${x}%`, top: `${y}%` }} />
    ))}
  </div>
);

const Tile = ({ v, onClick, selectable }) => (
  <div
    onClick={selectable ? onClick : undefined}
    style={{
      ...st.tile,
      cursor: selectable ? "pointer" : "not-allowed",
      boxShadow: selectable ? st.tile.boxShadow : "0 2px 4px #0006",
      transform: selectable ? st.tile.transformHover : st.tile.transform,
    }}
  >
    <Face n={v[0]} />
    <div style={st.divider} />
    <Face n={v[1]} />
  </div>
);

/* ───────── Componente principal ───────── */
export default function Game() {
  const [mesa, setMesa] = useState([]);
  const [mano, setMano] = useState([]);
  const [ia, setIA] = useState([]);
  const [turno, setTurno] = useState("user");
  const [msg, setMsg] = useState("Tu turno");
  const [fin, setFin] = useState("");

  /* repartir */
  const nuevoJuego = () => {
    const mazo = baraja();
    const jugador = mazo.slice(0, 7);
    const bot = mazo.slice(7, 14);
    const primera = dobleAlto(jugador) || dobleAlto(bot) || jugador[0];

    setMesa([primera]);
    if (jugador.includes(primera)) {
      setMano(jugador.filter((x) => x !== primera));
      setIA(bot);
      setTurno("ia");
      setMsg("IA juega…");
    } else {
      setMano(jugador);
      setIA(bot.filter((x) => x !== primera));
      setTurno("user");
      setMsg("Tu turno");
    }
    setFin("");
  };

  useEffect(nuevoJuego, []);

  /* utilidades de jugada */
  const extremos = () =>
    mesa.length ? { L: mesa[0][0], R: mesa.at(-1)[1] } : { L: null, R: null };
  const puede = (f) => {
    const { L, R } = extremos();
    return L === null || f.includes(L) || f.includes(R);
  };
  const colocar = (f, quien) => {
    const { L, R } = extremos();
    const inv = ([a, b]) => [b, a];
    const alInicio = f.includes(L);
    const fichaOK = alInicio
      ? f[1] === L
        ? f
        : inv(f)
      : f[0] === R
      ? f
      : inv(f);
    setMesa((m) => (alInicio ? [fichaOK, ...m] : [...m, fichaOK]));
    if (quien === "user") setMano((h) => h.filter((x) => x !== f));
    else setIA((h) => h.filter((x) => x !== f));
  };

  /* jugada usuario */
  const clickFicha = (f) => {
    if (turno !== "user" || !puede(f)) return;
    colocar(f, "user");
    setTurno("ia");
    setMsg("IA juega…");
  };

  /* jugada IA */
  useEffect(() => {
    if (turno !== "ia" || fin) return;
    const { L, R } = extremos();
    const jugada = ia.find((f) => f.includes(L) || f.includes(R));
    if (jugada) {
      setTimeout(() => {
        colocar(jugada, "ia");
        setTurno("user");
        setMsg("Tu turno");
      }, 800);
    } else {
      setTimeout(() => {
        setTurno("user");
        setMsg("IA pasa • Tu turno");
      }, 600);
    }
  }, [turno]);

  /* comprobar fin */
  useEffect(() => {
    if (!fin && mano.length === 0) {
      setFin("🎉 ¡Ganaste!");
      setMsg("🎉 ¡Ganaste!");
    } else if (!fin && ia.length === 0) {
      setFin("La IA ganó 😓");
      setMsg("La IA ganó 😓");
    }
  }, [mano, ia]);

  /* render */
  return (
    <main style={st.bg}>
      <header style={st.header}>{msg}</header>

      {/* mesa */}
      <div style={st.table}>
        {mesa.map((f, i) => (
          <Tile key={i} v={f} selectable={false} />
        ))}
        {!mesa.length && <p style={{ color: "#eee" }}>Empieza…</p>}
      </div>

      {/* mano */}
      {!fin && (
        <div style={st.hand}>
          {mano.map((f, i) => (
            <Tile key={i} v={f} selectable={puede(f)} onClick={() => clickFicha(f)} />
          ))}
        </div>
      )}

      {/* footer */}
      <footer style={st.footer}>
        {fin ? (
          <button onClick={nuevoJuego} style={st.btn}>
            🔄 Jugar de nuevo
          </button>
        ) : (
          <Link to="/dashboard" style={st.link}>
            ← Volver al Dashboard
          </Link>
        )}
      </footer>
    </main>
  );
}

/* ───────── estilos inline (inspirados en tu Home.jsx) ───────── */
const st = {
  bg: {
    minHeight: "100vh",
    background: "linear-gradient(135deg,#0f172a,#1e293b 40%,#064e3b)",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    color: "#fff",
  },
  header: { textAlign: "center", marginBottom: 12, fontWeight: 600 },
  table: {
    flex: 1,
    background: "#35654d",
    border: "6px solid #1e3b2d",
    borderRadius: 20,
    padding: 10,
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    boxShadow: "0 8px 20px #0006 inset",
  },
  hand: {
    marginTop: 14,
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  footer: { marginTop: 18, textAlign: "center" },
  link: { color: "#facc15", textDecoration: "underline" },
  btn: {
    padding: "10px 26px",
    background: "linear-gradient(90deg,#22c55e,#16a34a)",
    border: "none",
    color: "#fff",
    borderRadius: 18,
    fontWeight: 700,
    cursor: "pointer",
  },
  /* ─ ficha ─ */
  tile: {
    width: 64,
    height: 112,
    background: "#fff",
    borderRadius: 8,
    border: "2px solid #000",
    position: "relative",
    boxShadow: "0 4px 0 #aaa, 0 6px 10px #0009",
    transform: "rotateX(20deg)",
    transformHover: "rotateX(20deg) scale(1.05)",
  },
  face: {
    width: "100%",
    height: "50%",
    position: "relative",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  divider: {
    height: 2,
    background: "#000",
    width: "90%",
    margin: "0 auto",
  },
  dot: {
    position: "absolute",
    width: 12,
    height: 12,
    background: "#000",
    borderRadius: "50%",
    transform: "translate(-50%,-50%)",
  },
};