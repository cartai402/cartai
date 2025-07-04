import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

/* helpers */
const baraja = () => {
  const s = [];
  for (let i = 0; i <= 6; i++) for (let j = i; j <= 6; j++) s.push([i, j]);
  return s.sort(() => Math.random() - 0.5);
};
const dobleAlto = (h) =>
  h.filter((f) => f[0] === f[1]).sort((a, b) => b[0] - a[0])[0];
const suma = (m) => m.reduce((t, [a, b]) => t + a + b, 0);

/* puntos */
const dots = [
  [], [[50, 50]], [[25, 25], [75, 75]],
  [[25,25],[50,50],[75,75]],
  [[25,25],[25,75],[75,25],[75,75]],
  [[25,25],[25,75],[50,50],[75,25],[75,75]],
  [[25,25],[25,50],[25,75],[75,25],[75,50],[75,75]]
];
const Face = ({ n }) => (
  <div style={st.face}>
    {dots[n].map(([x, y], i) => (
      <div key={i} style={{ ...st.dot, left: `${x}%`, top: `${y}%` }} />
    ))}
  </div>
);
const Tile = ({ v, ...pr }) => (
  <div {...pr} style={st.tile}>
    <Face n={v[0]} />
    <div style={st.div} />
    <Face n={v[1]} />
  </div>
);

/* ───────── COMPONENTE PRINCIPAL ───────── */
export default function Game() {
  /* state */
  const [mesa, setMesa] = useState([]);
  const [mano, setMano] = useState([]);
  const [ai, setAI] = useState([]);
  const [turn, setTurn] = useState("user");
  const [msg, setMsg] = useState("Arrastra una ficha");
  const [pts, setPts] = useState({ user: 0, ai: 0 });
  const [end, setEnd] = useState("");

  /* repartir ronda */
  const nuevaRonda = () => {
    const d = baraja();
    const u = d.slice(0, 7);
    const a = d.slice(7, 14);
    const first = dobleAlto(u) || dobleAlto(a) || u[0];
    setMesa([first]);
    if (u.includes(first)) {
      setMano(u.filter((f) => f !== first));
      setAI(a);
      setTurn("ia");
      setMsg("IA juega…");
    } else {
      setMano(u);
      setAI(a.filter((f) => f !== first));
      setTurn("user");
      setMsg("Arrastra una ficha");
    }
    setEnd("");
  };
  useEffect(nuevaRonda, []);

  /* extremos y validación */
  const ends = () => (mesa.length ? { L: mesa[0][0], R: mesa.at(-1)[1] } : { L: null, R: null });
  const can = (t) => {
    const { L, R } = ends();
    return t.includes(L) || t.includes(R);
  };
  const place = (tile, side) => {
    const rev = ([a, b]) => [b, a];
    setMesa((m) => {
      if (!m.length) return [tile];
      if (side === "left") {
        const L = m[0][0];
        const ok = tile[1] === L ? tile : rev(tile);
        return [ok, ...m];
      } else {
        const R = m.at(-1)[1];
        const ok = tile[0] === R ? tile : rev(tile);
        return [...m, ok];
      }
    });
  };

  /* IA simple */
  useEffect(() => {
    if (turn !== "ia" || end) return;
    const { L, R } = ends();
    const move = ai.find((f) => f.includes(L) || f.includes(R));
    if (move) {
      setTimeout(() => {
        place(move, move.includes(L) ? "left" : "right");
        setAI((h) => h.filter((x) => x !== move));
        setTurn("user");
        setMsg("Arrastra una ficha");
      }, 600);
    } else {
      setTimeout(() => {
        setTurn("user");
        setMsg("IA pasa • Tu turno");
      }, 500);
    }
  }, [turn]);

  /* drag handlers */
  const onDragStart = (i) => (e) => e.dataTransfer.setData("idx", i);
  const onDrop = (side) => (e) => {
    e.preventDefault();
    if (turn !== "user") return;
    const idx = Number(e.dataTransfer.getData("idx"));
    const tile = mano[idx];
    if (!tile || !can(tile)) return;
    if (
      side === "left" && !tile.includes(ends().L) ||
      side === "right" && !tile.includes(ends().R)
    ) return; // invalid
    place(tile, side);
    setMano((h) => h.filter((_, j) => j !== idx));
    setTurn("ia");
    setMsg("IA juega…");
  };
  const prevent = (e) => e.preventDefault();

  /* fin ronda simple (vacío o bloqueo) */
  useEffect(() => {
    if (end) return;
    if (!mano.length || !ai.length) {
      const winner = !mano.length ? "user" : "ia";
      const ptsSum = suma(winner === "user" ? ai : mano);
      const nuevo = { ...pts, [winner]: pts[winner] + ptsSum };
      setPts(nuevo);
      if (nuevo[winner] >= 100) {
        setEnd(`${winner === "user" ? "🎉 Ganaste" : "IA gana"} la partida`);
      } else {
        setEnd(`${winner === "user" ? "Ganaste" : "Perdiste"} la ronda (+${ptsSum})`);
      }
    }
  }, [mano, ai]);

  /* render */
  return (
    <main style={st.bg}>
      <h2 style={st.msg}>{msg}</h2>
      <div style={st.score}>Tú&nbsp;{pts.user} • IA&nbsp;{pts.ai}</div>

      {/* tablero madera 3-D */}
      <section style={st.board}>
        {/* zona drop izquierda */}
        <div
          style={st.drop}
          onDragOver={prevent}
          onDrop={onDrop("left")}
        />
        {/* fichas mesa */}
        <div style={st.row}>
          {mesa.map((f, i) => (
            <Tile key={i} v={f} rot={i % 2 ? 90 : 0} />
          ))}
        </div>
        {/* zona drop derecha */}
        <div
          style={st.drop}
          onDragOver={prevent}
          onDrop={onDrop("right")}
        />
      </section>

      {/* mano user (draggable) */}
      <div style={st.hand}>
        {mano.map((f, i) => (
          <Tile
            key={i}
            v={f}
            draggable
            onDragStart={onDragStart(i)}
            style={{ opacity: can(f) ? 1 : 0.3 }}
          />
        ))}
      </div>

      {/* mano IA oculta */}
      <div style={st.aiRow}>
        {ai.map((_, i) => (
          <Tile key={i} v={[0, 0]} oculta />
        ))}
      </div>

      {end && (
        <button onClick={nuevaRonda} style={st.btn}>
          🔄 Siguiente ronda
        </button>
      )}
      {!end && (
        <Link to="/dashboard" style={st.link}>
          ← Dashboard
        </Link>
      )}
    </main>
  );
}

/* estilos */
const st = {
  bg: {
    minHeight: "100vh",
    background: "#0a4228",
    color: "#fff",
    padding: 12,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  msg: { fontWeight: 700, marginBottom: 4 },
  score: { marginBottom: 8 },
  board: {
    background: "url('https://i.imgur.com/3ZQ3ZQp.png') center / cover",
    border: "8px solid #c79a3b",
    borderRadius: 20,
    boxShadow: "0 8px 18px #0007 inset",
    display: "flex",
    alignItems: "center",
    padding: 6,
    width: "100%",
    maxWidth: 420,
    minHeight: 120,
    marginBottom: 12,
  },
  row: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 2,
    flex: 1,
  },
  drop: {
    width: 34,
    height: 90,
    border: "2px dashed #fff4",
    borderRadius: 8,
  },
  hand: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 4,
    marginBottom: 10,
  },
  aiRow: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 4,
    opacity: 0.8,
    marginBottom: 10,
  },
  tile: {
    width: 48,
    height: 80,
    background: "#fff",
    border: "2px solid #000",
    borderRadius: 6,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: 3,
    transform: "perspective(600px) rotateX(6deg)",
  },
  div: {
    height: 1,
    background: "#000",
    width: "90%",
    margin: "1px auto",
  },
  face: { flex: 1, position: "relative" },
  dot: {
    position: "absolute",
    width: 8,
    height: 8,
    background: "#000",
    borderRadius: "50%",
    transform: "translate(-50%,-50%)",
  },
  btn: {
    background: "#2a9d8f",
    border: "none",
    padding: "8px 20px",
    borderRadius: 18,
    color: "#fff",
    fontWeight: 700,
    marginTop: 10,
  },
  link: {
    color: "#facc15",
    textDecoration: "underline",
    marginTop: 10,
  },
};