import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

/* ===== Helpers dominó ===== */
const baraja = () => {
  const s = [];
  for (let i = 0; i <= 6; i++) for (let j = i; j <= 6; j++) s.push([i, j]);
  return s.sort(() => Math.random() - 0.5);
};
const dobleMayor = (h) =>
  h.filter((f) => f[0] === f[1]).sort((a, b) => b[0] - a[0])[0];
const suma = (m) => m.reduce((t, [a, b]) => t + a + b, 0);

/* puntos dibujados */
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
const Tile = ({ v, oculta, draggable, onDragStart, rotate }) => (
  <div
    draggable={draggable}
    onDragStart={onDragStart}
    style={{
      ...st.tile,
      transform: `perspective(600px) rotateX(6deg) rotate(${rotate || 0}deg)`,
      background: oculta ? "#c7c7c7" : "#fff",
      boxShadow: oculta ? "inset 0 0 8px #888" : "2px 2px 6px #0005",
      cursor: draggable ? "grab" : "default",
    }}
  >
    {oculta ? (
      <div style={st.backLine}></div>
    ) : (
      <>
        <Face n={v[0]} />
        <div style={st.div}></div>
        <Face n={v[1]} />
      </>
    )}
  </div>
);

export default function Game() {
  /* ---------- estado ---------- */
  const [board, setBoard] = useState([]);
  const [hand, setHand] = useState([]);
  const [ai, setAI]     = useState([]);
  const [turn, setTurn] = useState("user");
  const [msg, setMsg]   = useState("Arrastra una ficha");
  const [score, setScore] = useState({ user: 0, ai: 0 });
  const [end, setEnd]   = useState(false);

  /* ---------- nueva ronda ---------- */
  const nuevaRonda = () => {
    const d = baraja();
    const u = d.slice(0, 7);
    const a = d.slice(7, 14);
    const first = dobleMayor(u) || dobleMayor(a) || u[0];

    setBoard([first]);
    if (u.includes(first)) {
      setHand(u.filter(f => f !== first));
      setAI(a);
      setTurn("ia");   setMsg("IA juega…");
    } else {
      setHand(u);
      setAI(a.filter(f => f !== first));
      setTurn("user"); setMsg("Arrastra una ficha");
    }
    setEnd(false);
  };
  useEffect(nuevaRonda, []);

  /* ---------- util ---------- */
  const ends = () =>
    board.length ? { L: board[0][0], R: board.at(-1)[1] } : { L: null, R: null };
  const canPlay = (t) => {
    const { L, R } = ends();
    return t.includes(L) || t.includes(R);
  };
  const colocar = (ficha, side) => {
    const rev = ([a, b]) => [b, a];
    setBoard((b) => {
      if (!b.length) return [ficha];
      if (side === "left") {
        const L = b[0][0];
        const ok = ficha[1] === L ? ficha : rev(ficha);
        return [ok, ...b];
      } else {
        const R = b.at(-1)[1];
        const ok = ficha[0] === R ? ficha : rev(ficha);
        return [...b, ok];
      }
    });
  };

  /* ---------- drag & drop ---------- */
  const dragStart = (i) => (e) => e.dataTransfer.setData("idx", i);
  const allow = (e) => e.preventDefault();
  const drop = (side) => (e) => {
    e.preventDefault();
    if (turn !== "user") return;
    const idx = +e.dataTransfer.getData("idx");
    const ficha = hand[idx];
    if (!ficha || !canPlay(ficha)) return;      // no encaja
    colocar(ficha, side);                       // coloca
    setHand((h) => h.filter((_, j) => j !== idx));
    setTurn("ia"); setMsg("IA juega…");
  };

  /* ---------- IA simple ---------- */
  useEffect(() => {
    if (turn !== "ia" || end) return;
    const { L, R } = ends();
    const play = ai.find((f) => f.includes(L) || f.includes(R));
    if (play) {
      setTimeout(() => {
        colocar(play, play.includes(L) ? "left" : "right");
        setAI((h) => h.filter((x) => x !== play));
        setTurn("user"); setMsg("Arrastra una ficha");
      }, 600);
    } else {
      setTimeout(() => {
        setTurn("user");
        setMsg("IA pasa • Tu turno");
      }, 600);
    }
  }, [turn]);

  /* ---------- cierre / puntos ---------- */
  useEffect(() => {
    if (end) return;

    const nadiePuede =
      hand.every(f => !canPlay(f)) && ai.every(f => !canPlay(f));
    const alguienVacio = !hand.length || !ai.length;

    if (!nadiePuede && !alguienVacio) return;

    const ptsU = suma(hand);
    const ptsA = suma(ai);
    let winner, add;
    if (!hand.length)   { winner = "user"; add = ptsA; }
    else if (!ai.length){ winner = "ai";   add = ptsU; }
    else if (ptsU < ptsA){winner="user"; add = ptsA - ptsU;}
    else                { winner="ai";   add = ptsU - ptsA;}

    setScore((s) => ({ ...s, [winner]: s[winner] + add }));
    const total = score[winner] + add;
    setEnd(true);
    setMsg(
      total >= 100
        ? winner === "user"
          ? "🏆 ¡Ganaste la partida!"
          : "La IA ganó la partida 😓"
        : winner === "user"
          ? `Ganaste la ronda (+${add})`
          : `IA gana la ronda (+${add})`
    );
  }, [hand, ai, turn]);

  /* ---------- render ---------- */
  return (
    <main style={st.bg}>
      <h2 style={st.msg}>{msg}</h2>
      <div style={st.score}>Tú {score.user} — IA {score.ai}</div>

      {/* ---- mesa ovalada ---- */}
      <div style={st.tableOuter}>
        {/* zonas drop */}
        <div style={st.drop} onDragOver={allow} onDrop={drop("left")} />
        <div style={st.tableInner}>
          {board.map((f, i) => (
            <Tile key={i} v={f} rotate={i % 2 ? 90 : 0} />
          ))}
        </div>
        <div style={st.drop} onDragOver={allow} onDrop={drop("right")} />
      </div>

      {/* mano usuario */}
      <div style={st.hand}>
        {hand.map((f, i) => (
          <Tile
            key={i}
            v={f}
            draggable
            onDragStart={dragStart(i)}
            rotate={0}
          />
        ))}
      </div>

      {/* fichas IA ocultas */}
      <div style={st.ai}>
        {ai.map((_, i) => (
          <Tile key={i} v={[0, 0]} oculta rotate={0} />
        ))}
      </div>

      {end ? (
        <button style={st.btn} onClick={nuevaRonda}>
          🔄 Nueva ronda
        </button>
      ) : (
        <Link to="/dashboard" style={st.link}>← Dashboard</Link>
      )}
    </main>
  );
}

/* ===== ESTILOS ===== */
const st = {
  /* layout */
  bg: { minHeight: "100vh", background: "#0b2e22", color: "#fff",
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: 12 },
  msg: { fontWeight: 700, marginBottom: 4, textAlign: "center" },
  score: { marginBottom: 10 },

  /* mesa */
  tableOuter: {
    position: "relative",
    width: "100%", maxWidth: 440,
    padding: "16px 30px",
    borderRadius: 220/2,
    background: "#8b5a2b",
    boxShadow: "inset 0 0 12px #0009, 0 6px 14px #0007",
    display: "flex", alignItems: "center",
    marginBottom: 14,
  },
  tableInner: {
    flex: 1, minHeight: 110,
    background: "#10683e",
    borderRadius: 180/2,
    boxShadow: "inset 0 0 8px #0008",
    display: "flex", flexWrap: "wrap",
    gap: 2, justifyContent: "center", alignItems: "center",
    padding: 6,
  },
  drop: {
    width: 26, height: 86,
    border: "2px dashed #fff5",
    borderRadius: 6,
    margin: "0 4px",
  },

  /* manos */
  hand: { display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 4 },
  ai:   { display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 4,
          opacity: 0.8, marginTop: 8 },

  /* ficha */
  tile: {
    width: 42, height: 70,
    border: "2px solid #000", borderRadius: 5,
    display: "flex", flexDirection: "column", justifyContent: "space-between",
    padding: 3,
    transition: "transform .2s",
    userSelect: "none",
  },
  div: { height: 1, background: "#000", width: "90%", margin: "1px auto" },
  face: { flex: 1, position: "relative" },
  dot:  { position: "absolute", width: 7, height: 7, background: "#000",
          borderRadius: "50%", transform: "translate(-50%,-50%)" },
  backLine: {
    width: "100%", height: "100%",
    background: "repeating-linear-gradient(45deg,#b3b3b3 0 6px,#c9c9c9 6px 12px)",
    borderRadius: 4,
  },

  /* botones / links */
  btn: { background: "#10683e", border: "none", color: "#fff",
         padding: "8px 20px", borderRadius: 18, fontWeight: 700, marginTop: 12 },
  link:{ color: "#facc15", textDecoration: "underline", marginTop: 12 },
};