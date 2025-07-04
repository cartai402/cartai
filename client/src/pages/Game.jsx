import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

/* — Helpers dominó — */
const baraja = () => {
  const s = [];
  for (let i = 0; i <= 6; i++) for (let j = i; j <= 6; j++) s.push([i, j]);
  return s.sort(() => Math.random() - 0.5);
};
const dobleMayor = (h) =>
  h.filter((f) => f[0] === f[1]).sort((a, b) => b[0] - a[0])[0];
const suma = (m) => m.reduce((t, [a, b]) => t + a + b, 0);

/* — puntos visuales — */
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
const Tile = ({ v, oculta, draggable, onDragStart, rot = 0 }) => (
  <div
    draggable={draggable}
    onDragStart={onDragStart}
    style={{
      ...st.tile,
      transform: `rotate(${rot}deg)`,
      background: oculta ? "#c7c7c7" : "#fff",
      boxShadow: oculta ? "inset 0 0 8px #888" : "2px 2px 6px #0005",
      cursor: draggable ? "grab" : "default",
    }}
  >
    {oculta ? (
      <div style={st.back}></div>
    ) : (
      <>
        <Face n={v[0]} />
        <div style={st.div} />
        <Face n={v[1]} />
      </>
    )}
  </div>
);

export default function Game() {
  const [board, setBoard] = useState([]);
  const [hand, setHand]   = useState([]);
  const [ai, setAI]       = useState([]);
  const [turn, setTurn]   = useState("user");
  const [msg, setMsg]     = useState("Arrastra una ficha");
  const [score, setScore] = useState({ user: 0, ai: 0 });
  const [end, setEnd]     = useState(false);

  /* — Nueva ronda — */
  const nuevaRonda = () => {
    const d = baraja();
    const you = d.slice(0, 7);
    const bot = d.slice(7, 14);
    const first = dobleMayor(you) || dobleMayor(bot) || you[0];

    setBoard([first]);
    if (you.includes(first)) {
      setHand(you.filter(f => f !== first));
      setAI(bot);
      setTurn("ia"); setMsg("IA juega…");
    } else {
      setHand(you);
      setAI(bot.filter(f => f !== first));
      setTurn("user"); setMsg("Arrastra una ficha");
    }
    setEnd(false);
  };
  useEffect(nuevaRonda, []);

  /* extremos y helpers */
  const ends = () =>
    board.length ? { L: board[0][0], R: board.at(-1)[1] } : { L: null, R: null };
  const canPlay = (f) => {
    const { L, R } = ends();
    return f.includes(L) || f.includes(R);
  };
  const place = (ficha, side) => {
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

  /* drag-and-drop */
  const dragStart = (i) => (e) => e.dataTransfer.setData("idx", i);
  const allow = (e) => e.preventDefault();
  const drop = (side) => (e) => {
    e.preventDefault();
    if (turn !== "user") return;
    const idx = +e.dataTransfer.getData("idx");
    const tile = hand[idx];
    if (!tile || !canPlay(tile)) return;
    if (side === "left" && !tile.includes(ends().L)) return;
    if (side === "right" && !tile.includes(ends().R)) return;

    place(tile, side);
    setHand((h) => h.filter((_, j) => j !== idx));
    setTurn("ia"); setMsg("IA juega…");
  };

  /* IA (re-render al cambiar mesa o turn) */
  useEffect(() => {
    if (turn !== "ia" || end) return;
    const { L, R } = ends();
    const play = ai.find(f => f.includes(L) || f.includes(R));
    if (play) {
      setTimeout(() => {
        place(play, play.includes(L) ? "left" : "right");
        setAI(h => h.filter(x => x !== play));
        setTurn("user"); setMsg("Arrastra una ficha");
      }, 600);
    } else {
      setTimeout(() => {
        setTurn("user"); setMsg("IA pasa • Tu turno");
      }, 600);
    }
  }, [turn, board]);     // <- escucha board también

  /* cierre / puntaje */
  useEffect(() => {
    if (end) return;
    const bloqueados =
      hand.every(f => !canPlay(f)) && ai.every(f => !canPlay(f));
    const alguienVacío = !hand.length || !ai.length;
    if (!bloqueados && !alguienVacío) return;

    const ptsU = suma(hand), ptsA = suma(ai);
    let win, add;
    if (!hand.length)          { win="user"; add=ptsA; }
    else if (!ai.length)       { win="ai";   add=ptsU; }
    else if (ptsU < ptsA)      { win="user"; add=ptsA - ptsU; }
    else                       { win="ai";   add=ptsU - ptsA; }

    setScore(s => ({ ...s, [win]: s[win] + add }));
    const total = score[win] + add;
    setEnd(true);
    setMsg(
      total >= 100
        ? win==="user" ? "🏆 ¡Ganaste la partida!" : "La IA ganó la partida 😓"
        : win==="user" ? `Ganaste la ronda (+${add})` : `IA gana la ronda (+${add})`
    );
  }, [hand, ai, turn]);

  /* render */
  return (
    <main style={st.bg}>
      <h2 style={st.msg}>{msg}</h2>
      <div style={st.score}>Tú {score.user} — IA {score.ai}</div>

      {/* mesa vertical completa */}
      <div style={st.tableWrap}>
        <div style={st.drop} onDragOver={allow} onDrop={drop("left")} />
        <div style={st.inner}>
          {board.map((f, i) => (
            <Tile key={i} v={f} rot={i%2?90:0}/>
          ))}
        </div>
        <div style={st.drop} onDragOver={allow} onDrop={drop("right")} />
      </div>

      {/* manos */}
      <div style={st.hand}>
        {hand.map((f,i)=>(
          <Tile key={i} v={f} draggable onDragStart={dragStart(i)} />
        ))}
      </div>
      <div style={st.ai}>
        {ai.map((_,i)=><Tile key={i} v={[0,0]} oculta />)}
      </div>

      {end
        ? <button style={st.btn} onClick={nuevaRonda}>🔄 Nueva ronda</button>
        : <Link to="/dashboard" style={st.link}>← Dashboard</Link>}
    </main>
  );
}

/* estilos */
const st = {
  bg:{minHeight:"100vh",background:"#062117",color:"#fff",
      display:"flex",flexDirection:"column",alignItems:"center",padding:12},
  msg:{fontWeight:700,marginBottom:4,textAlign:"center"},
  score:{marginBottom:10},

  /* mesa ocupa todo el ancho */
  tableWrap:{
    width:"100%",maxWidth:580,height:"45vh",minHeight:180,
    display:"flex",alignItems:"center",padding:"20px 36px",
    background:"#8b5a2b",borderRadius:300,boxShadow:"inset 0 0 14px #0009,0 6px 14px #0007",
    marginBottom:16,
  },
  inner:{
    flex:1,height:"100%",background:"#0f7a44",borderRadius:240,
    boxShadow:"inset 0 0 10px #0008",
    display:"flex",flexWrap:"wrap",justifyContent:"center",alignItems:"center",
    padding:6,gap:2,
  },
  drop:{
    width:32,height:"60%",minHeight:90,border:"2px dashed #fff5",borderRadius:8,
    margin:"0 6px",
  },
  hand:{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:4},
  ai:{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:4,opacity:.8,marginTop:8},

  tile:{width:40,height:66,border:"2px solid #000",borderRadius:5,
        display:"flex",flexDirection:"column",justifyContent:"space-between",padding:3},
  face:{flex:1,position:"relative"},
  dot:{position:"absolute",width:6,height:6,borderRadius:"50%",background:"#000",
       transform:"translate(-50%,-50%)"},
  div:{height:1,background:"#000",width:"90%",margin:"1px auto"},
  back:{width:"100%",height:"100%",
        background:"repeating-linear-gradient(45deg,#b4b4b4 0 6px,#cacaca 6px 12px)",
        borderRadius:4},

  btn:{background:"#0f7a44",border:"none",color:"#fff",padding:"8px 22px",
       borderRadius:18,fontWeight:700,marginTop:12},
  link:{color:"#facc15",textDecoration:"underline",marginTop:12}
};