import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

/* utilidades */
const baraja = () => {
  const s = [];
  for (let i = 0; i <= 6; i++) for (let j = i; j <= 6; j++) s.push([i, j]);
  return s.sort(() => Math.random() - 0.5);
};
const dobleMayor = (h) =>
  h.filter(f => f[0] === f[1]).sort((a, b) => b[0] - a[0])[0];
const suma = (m) => m.reduce((t, [a, b]) => t + a + b, 0);

/* puntos visuales */
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
const Tile = ({ v, oculta, draggable, onDragStart }) => (
  <div
    draggable={draggable}
    onDragStart={onDragStart}
    style={{
      ...st.tile,
      background: oculta ? "#c7c7c7" : "#fff",
      boxShadow: oculta ? "inset 0 0 8px #888" : "2px 2px 6px #0005",
      cursor: draggable ? "grab" : "default",
    }}
  >
    {oculta ? <div style={st.backLine} /> : (
      <>
        <Face n={v[0]} />
        <div style={st.div} />
        <Face n={v[1]} />
      </>
    )}
  </div>
);

export default function Game() {
  /* estado */
  const [board, setBoard] = useState([]);
  const [hand, setHand] = useState([]);
  const [ai, setAI]     = useState([]);
  const [turn, setTurn] = useState("user");
  const [msg, setMsg]   = useState("Arrastra una ficha");
  const [score, setScore] = useState({ user: 0, ai: 0 });
  const [end, setEnd] = useState(false);

  /* --- nueva ronda --- */
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

  /* extremos y validaciones */
  const ends = () => board.length ? { L: board[0][0], R: board.at(-1)[1] } : { L: null, R: null };
  const canPlay = (f) => {
    const { L, R } = ends();
    return f.includes(L) || f.includes(R);
  };
  const colocar = (ficha, side) => {
    const rev = ([a, b]) => [b, a];
    setBoard(b => {
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

  /* drag handlers */
  const onDragStart = (idx) => (e) => e.dataTransfer.setData("idx", idx);
  const allow = (e) => e.preventDefault();
  const drop = (side) => (e) => {
    e.preventDefault();
    if (turn !== "user") return;
    const idx = +e.dataTransfer.getData("idx");
    const ficha = hand[idx];
    if (!ficha || !canPlay(ficha)) return;
    if (side === "left" && !ficha.includes(ends().L)) return;
    if (side === "right" && !ficha.includes(ends().R)) return;

    colocar(ficha, side);
    setHand(h => h.filter((_, i) => i !== idx));
    setTurn("ia"); setMsg("IA juega…");
  };

  /* IA básica */
  useEffect(() => {
    if (turn !== "ia" || end) return;
    const { L, R } = ends();
    const play = ai.find(f => f.includes(L) || f.includes(R));
    if (play) {
      setTimeout(() => {
        colocar(play, play.includes(L) ? "left" : "right");
        setAI(h => h.filter(x => x !== play));
        setTurn("user"); setMsg("Arrastra una ficha");
      }, 600);
    } else {
      setTimeout(() => {
        setTurn("user");
        setMsg("IA pasa • Tu turno");
      }, 600);
    }
  }, [turn]);

  /* fin ronda / partida */
  useEffect(() => {
    if (end) return;

    const checkFin = () => {
      if (!hand.length || !ai.length) return true;
      if (turn === "user" && hand.every(f => !canPlay(f)) &&
          ai.every(f => !canPlay(f))) return true;
      return false;
    };
    if (!checkFin()) return;

    const puntosU = suma(hand);
    const puntosA = suma(ai);
    let winner, pts;
    if (!hand.length)      { winner = "user"; pts = puntosA; }
    else if (!ai.length)   { winner = "ai";   pts = puntosU; }
    else if (puntosU < puntosA) { winner = "user"; pts = puntosA - puntosU; }
    else                        { winner = "ai";   pts = puntosU - puntosA; }

    setScore(s => ({ ...s, [winner]: s[winner] + pts }));
    const total = score[winner] + pts;
    if (total >= 100) {
      setEnd(true);
      setMsg(winner === "user" ? "🏆 ¡Ganaste la partida!" : "La IA ganó la partida 😓");
    } else {
      setEnd(true);
      setMsg(winner === "user" ? `Ganaste la ronda (+${pts})` : `IA gana la ronda (+${pts})`);
    }
  }, [hand, ai, turn]);

  /* render */
  return (
    <main style={st.bg}>
      <h2 style={st.title}>{msg}</h2>
      <div style={st.score}>
        Tú&nbsp;{score.user} — IA&nbsp;{score.ai}
      </div>

      {/* mesa ovalada */}
      <div style={st.tableOuter}>
        {/* drop zonas (izq / der) */}
        <div style={st.dropLeft}  onDragOver={allow} onDrop={drop("left")} />
        <div style={st.tableInner}>
          {board.map((f, i) => (
            <Tile key={i} v={f} />
          ))}
        </div>
        <div style={st.dropRight} onDragOver={allow} onDrop={drop("right")} />
      </div>

      {/* mano del usuario */}
      <div style={st.hand}>
        {hand.map((f, i) => (
          <Tile
            key={i}
            v={f}
            draggable
            onDragStart={onDragStart(i)}
          />
        ))}
      </div>

      {/* IA boca abajo */}
      <div style={st.ai}>
        {ai.map((_, i) => (
          <Tile key={i} v={[0, 0]} oculta />
        ))}
      </div>

      {end ? (
        <button onClick={nuevaRonda} style={st.btn}>🔄 Nueva ronda</button>
      ) : (
        <Link to="/dashboard" style={st.link}>← Dashboard</Link>
      )}
    </main>
  );
}

/* estilos inline */
const st = {
  bg: { minHeight:"100vh",background:"#10241a",color:"#fff",padding:12,
        display:"flex",flexDirection:"column",alignItems:"center" },
  title:{ fontWeight:700, marginBottom:6 },
  score:{ marginBottom:10 },

  /* mesa física */
  tableOuter:{
    position:"relative",
    width:"100%",maxWidth:480,
    padding:"18px 34px",
    borderRadius:220/2,
    background:"#8b5a2b",                       /* madera */
    boxShadow:"inset 0 0 12px #000a, 0 4px 12px #0007",
    display:"flex",alignItems:"center",
    marginBottom:14,
  },
  tableInner:{
    flex:1,
    minHeight:110,
    background:"#0E7B47",                       /* tapete verde */
    borderRadius:180/2,
    boxShadow:"inset 0 0 8px #0009",
    display:"flex",flexWrap:"wrap",
    justifyContent:"center",alignItems:"center",
    gap:2,
    padding:6,
  },
  dropLeft:{
    width:28,height:90,border:"2px dashed #fff5",
    borderRadius:6,marginRight:6,
  },
  dropRight:{
    width:28,height:90,border:"2px dashed #fff5",
    borderRadius:6,marginLeft:6,
  },

  hand:{ display:"flex",flexWrap:"wrap",justifyContent:"center",gap:4,marginBottom:8 },
  ai  :{ display:"flex",flexWrap:"wrap",justifyContent:"center",gap:4,opacity:.8 },

  tile:{
    width:46,height:78,border:"2px solid #000",borderRadius:6,
    display:"flex",flexDirection:"column",justifyContent:"space-between",
    padding:3,background:"#fff",
  },
  face:{ flex:1,position:"relative" },
  dot :{ position:"absolute",width:7,height:7,borderRadius:"50%",background:"#000",
         transform:"translate(-50%,-50%)" },
  div :{ height:1,background:"#000",width:"90%",margin:"1px auto" },
  backLine:{ width:"100%",height:"100%",background:
             "repeating-linear-gradient(45deg,#bbb 0 6px,#ccc 6px 12px)" },

  btn :{ background:"#0E7B47",border:"none",color:"#fff",padding:"8px 20px",
         borderRadius:18,fontWeight:700,marginTop:10 },
  link:{ color:"#facc15",textDecoration:"underline",marginTop:10 }
};