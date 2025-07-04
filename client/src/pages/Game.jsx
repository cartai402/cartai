import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

/* ── utilidades ─────────────────────────────── */
const baraja = () => {
  const s = [];
  for (let i = 0; i <= 6; i++) for (let j = i; j <= 6; j++) s.push([i, j]);
  return s.sort(() => Math.random() - 0.5);
};
const dobleMayor = (h) =>
  h.filter(f => f[0] === f[1]).sort((a, b) => b[0] - a[0])[0];
const suma = (arr) => arr.reduce((t,[a,b]) => t + a + b, 0);

/* ── dibujo ficha ───────────────────────────── */
const dots = [
  [], [[50,50]], [[25,25],[75,75]],
  [[25,25],[50,50],[75,75]],
  [[25,25],[25,75],[75,25],[75,75]],
  [[25,25],[25,75],[50,50],[75,25],[75,75]],
  [[25,25],[25,50],[25,75],[75,25],[75,50],[75,75]]
];
const Face = ({ n }) => (
  <div style={st.face}>
    {dots[n].map(([x,y],i)=>(
      <div key={i} style={{...st.dot,left:`${x}%`,top:`${y}%`}}/>
    ))}
  </div>
);
const Tile = ({ v, oculta, draggable, onDragStart, rot=0 }) => (
  <div
    draggable={draggable}
    onDragStart={onDragStart}
    style={{
      ...st.tile,
      transform:`rotate(${rot}deg)`,
      background: oculta ? "#c6c6c6" : "#fff",
      boxShadow: oculta? "inset 0 0 6px #888" : "2px 2px 6px #0004",
      cursor: draggable ? "grab" : "default"
    }}
  >
    {oculta ? (
      <div style={st.back}/>
    ) : (
      <>
        <Face n={v[0]}/>
        <div style={st.mid}/>
        <Face n={v[1]}/>
      </>
    )}
  </div>
);

/* ── componente principal ───────────────────── */
export default function Game() {
  const [board,setBoard] = useState([]);
  const [hand,setHand]   = useState([]);
  const [ai,setAI]       = useState([]);
  const [turn,setTurn]   = useState("user");
  const [msg,setMsg]     = useState("Arrastra una ficha");
  const [score,setScore] = useState({ user:0, ia:0 });
  const [end,setEnd]     = useState(false);

  /* nueva ronda */
  const nueva = () => {
    const d = baraja();
    const you = d.slice(0,7);
    const bot = d.slice(7,14);
    const first = dobleMayor(you) || dobleMayor(bot) || you[0];

    setBoard([first]);
    if (you.includes(first)) {
      setHand(you.filter(f=>f!==first));
      setAI(bot);
      setTurn("ia"); setMsg("IA juega…");
    } else {
      setHand(you);
      setAI(bot.filter(f=>f!==first));
      setTurn("user"); setMsg("Arrastra una ficha");
    }
    setEnd(false);
  };
  useEffect(nueva,[]);

  /* helpers */
  const ends = () => board.length?{L:board[0][0],R:board.at(-1)[1]}:{L:null,R:null};
  const canPlay = (t)=> t.includes(ends().L)||t.includes(ends().R);
  const place = (tile, side) => {
    const rev=([a,b])=>[b,a];
    setBoard(b=>{
      if(!b.length) return [tile];
      if(side==="left"){
        const L=b[0][0]; const ok=tile[1]===L?tile:rev(tile);
        return [ok,...b];
      }else{
        const R=b.at(-1)[1]; const ok=tile[0]===R?tile:rev(tile);
        return [...b,ok];
      }
    });
  };

  /* drag - drop */
  const dragStart=i=>e=>e.dataTransfer.setData("idx",i);
  const allow=e=>e.preventDefault();
  const drop=side=>e=>{
    e.preventDefault();
    if(turn!=="user")return;
    const idx=+e.dataTransfer.getData("idx");
    const tile=hand[idx];
    if(!tile||!canPlay(tile))return;
    if(side==="left" && !tile.includes(ends().L))return;
    if(side==="right"&& !tile.includes(ends().R))return;
    place(tile,side);
    setHand(h=>h.filter((_,j)=>j!==idx));
    setTurn("ia"); setMsg("IA juega…");
  };

  /* IA */
  useEffect(()=>{
    if(turn!=="ia"||end) return;
    const play = ai.find(canPlay);
    if(play){
      setTimeout(()=>{
        place(play, play.includes(ends().L)?"left":"right");
        setAI(h=>h.filter(x=>x!==play));
        setTurn("user"); setMsg("Arrastra una ficha");
      },600);
    }else{
      setTimeout(()=>{
        if(!hand.some(canPlay)) cerrarRonda(); // bloqueda
        else{ setTurn("user"); setMsg("IA pasa • Tu turno"); }
      },500);
    }
  },[turn,board]);

  /* cierre */
  const cerrarRonda=()=>{
    const u=suma(hand), a=suma(ai);
    let win = u<a?"user":"ia";
    let pts = Math.abs(a-u)||suma(win==="user"?ai:hand);
    setScore(s=>({...s,[win]:s[win]+pts}));
    setEnd(true);
    setMsg(win==="user"?`Ganaste la ronda (+${pts})`:`IA gana la ronda (+${pts})`);
  };
  useEffect(()=>{
    if(end) return;
    if(!hand.length||!ai.length) cerrarRonda();
  },[hand,ai]);

  /* render */
  return(
    <main style={st.bg}>
      {/* cabecera iconos + contador */}
      <div style={st.head}>
        <div style={st.iconBox}><div style={st.circle}>👤</div> Tú ({hand.length})</div>
        <div style={st.msg}>{msg}</div>
        <div style={st.iconBox}>IA ({ai.length}) <div style={st.circle}>🤖</div></div>
      </div>
      <div style={st.score}>Tú {score.user} — IA {score.ia}</div>

      {/* mesa horizontal */}
      <div style={st.tableOuter}>
        <div style={st.drop} onDragOver={allow} onDrop={drop("left")}/>
        <div style={st.tableInner}>
          {board.map((f,i)=><Tile key={i} v={f} rot={i%2?90:0}/>)}
        </div>
        <div style={st.drop} onDragOver={allow} onDrop={drop("right")}/>
      </div>

      {/* mano usuario */}
      <div style={st.hand}>
        {hand.map((f,i)=>(
          <Tile key={i} v={f} draggable onDragStart={dragStart(i)}/>
        ))}
      </div>

      {/* mano IA (oculta) */}
      <div style={st.ai}>
        {ai.map((_,i)=><Tile key={i} v={[0,0]} oculta/>)}
      </div>

      {end
        ?<button style={st.btn} onClick={nueva}>🔄 Nueva ronda</button>
        :<Link to="/dashboard" style={st.link}>← Dashboard</Link>}
    </main>
  );
}

/* ── estilos inline ─────────────────────────── */
const st={
  bg:{minHeight:"100vh",background:"#062117",color:"#fff",
      display:"flex",flexDirection:"column",alignItems:"center",padding:12},
  head:{display:"flex",justifyContent:"space-between",width:"100%",alignItems:"center"},
  iconBox:{display:"flex",alignItems:"center",gap:6,fontSize:15},
  circle:{width:28,height:28,borderRadius:"50%",background:"#fff",
          display:"flex",justifyContent:"center",alignItems:"center",fontSize:18,color:"#000"},
  msg:{fontWeight:700,fontSize:17,textAlign:"center"},
  score:{marginTop:2,marginBottom:8,fontSize:15},

  tableOuter:{
    width:"100%",maxWidth:700,aspectRatio:"2.7/1",
    background:"#8b5a2b",borderRadius:"150px/55px",
    boxShadow:"inset 0 0 12px #0009,0 6px 12px #0006",
    display:"flex",alignItems:"center",padding:"0 40px",gap:6,marginBottom:14
  },
  tableInner:{
    flex:1,height:"90%",
    background:"#0e7b44",borderRadius:"120px/45px",
    boxShadow:"inset 0 0 10px #0008",
    display:"flex",flexWrap:"wrap",justifyContent:"center",alignItems:"center",gap:2,padding:6
  },
  drop:{width:32,height:"80%",border:"2px dashed #fff5",borderRadius:8},
  hand:{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:4},
  ai:{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:4,opacity:.8,marginTop:6},

  tile:{width:40,height:66,border:"2px solid #000",borderRadius:5,
        display:"flex",flexDirection:"column",justifyContent:"space-between",padding:3},
  face:{flex:1,position:"relative"},
  dot :{position:"absolute",width:6,height:6,borderRadius:"50%",background:"#000",
        transform:"translate(-50%,-50%)"},
  mid :{height:1,background:"#000",width:"90%",margin:"1px auto"},
  back:{width:"100%",height:"100%",
        background:"repeating-linear-gradient(45deg,#b4b4b4 0 6px,#cacaca 6px 12px)",
        borderRadius:4},

  btn :{background:"#0e7b44",border:"none",color:"#fff",padding:"8px 22px",
        borderRadius:18,fontWeight:700,marginTop:14},
  link:{color:"#facc15",textDecoration:"underline",marginTop:14}
};