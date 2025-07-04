import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

/* ───── helpers ───── */
const nuevaBaraja = () => {
  const s = [];
  for (let i = 0; i <= 6; i++) for (let j = i; j <= 6; j++) s.push([i, j]);
  return s.sort(() => Math.random() - 0.5);
};
const mayorDoble = (h) =>
  h.filter(f => f[0] === f[1]).sort((a, b) => b[0] - a[0])[0];
const suma = (mano) => mano.reduce((t, [a, b]) => t + a + b, 0);

/* dots - visual */
const pips = [
  [], [[50,50]], [[25,25],[75,75]],
  [[25,25],[50,50],[75,75]],
  [[25,25],[25,75],[75,25],[75,75]],
  [[25,25],[25,75],[50,50],[75,25],[75,75]],
  [[25,25],[25,50],[25,75],[75,25],[75,50],[75,75]],
];
const Face = ({n})=>(
  <div style={st.face}>
    {pips[n].map(([x,y],i)=>(
      <div key={i} style={{...st.dot,left:`${x}%`,top:`${y}%`}}/>
    ))}
  </div>
);
const Tile = ({v,onClick,playable,rot})=>(
  <div
    onClick={playable?onClick:null}
    style={{
      ...st.tile,
      transform: rot?`rotate(${rot}deg)`:"none",
      opacity: playable?1:.4,
      cursor: playable?"pointer":"default",
    }}
  >
    <Face n={v[0]}/>
    <div style={st.div}/>
    <Face n={v[1]}/>
  </div>
);

/* ───── COMP ───── */
export default function Game(){
  /* estado */
  const [board,setBoard]=useState([]);
  const [hand,setHand]=useState([]);
  const [ai,setAI]=useState([]);
  const [turn,setTurn]=useState("user");
  const [msg,setMsg]=useState("Tu turno");
  const [passU,setPassU]=useState(false);
  const [passA,setPassA]=useState(false);
  const [score,setScore]=useState({user:0,ai:0});
  const [end,setEnd]=useState("");

  /* repartir ronda */
  const nuevaRonda=()=>{
    const deck=nuevaBaraja();
    const u=deck.slice(0,7);
    const a=deck.slice(7,14);
    const first=mayorDoble(u)||mayorDoble(a)||u[0];
    setBoard([first]);
    if(u.includes(first)){
      setHand(u.filter(f=>f!==first));
      setAI(a);
      setTurn("ia"); setMsg("IA juega…");
    }else{
      setHand(u);
      setAI(a.filter(f=>f!==first));
      setTurn("user"); setMsg("Tu turno");
    }
    setPassU(false); setPassA(false); setEnd("");
  };
  useEffect(nuevaRonda,[]);

  const ends=()=> board.length?{L:board[0][0],R:board.at(-1)[1]}:{L:null,R:null};
  const canPlay=t=>{const{L,R}=ends();return t.includes(L)||t.includes(R);};
  const place=(t,side)=>{
    const rev=([a,b])=>[b,a];
    setBoard(b=>{
      if(side==="left"){
        const L=b[0][0]; const ok=t[1]===L?t:rev(t); return [ok,...b];
      }else{
        const R=b.at(-1)[1]; const ok=t[0]===R?t:rev(t); return [...b,ok];
      }
    });
  };

  /* USER turn */
  useEffect(()=>{
    if(turn!=="user"||end) return;
    if(!hand.some(canPlay)){          // no jugada
      setPassU(true); setTurn("ia"); setMsg("Pasas • IA juega…");
      return;
    }
  },[turn,hand]);

  const playUser=t=>{
    if(turn!=="user"||!canPlay(t))return;
    const {L,R}=ends();
    const side=t.includes(L)&&!t.includes(R)?"left":
               t.includes(R)&&!t.includes(L)?"right":
               window.confirm("Aceptar=izq / Cancel=dcha")?"left":"right";
    place(t,side);
    setHand(h=>h.filter(f=>f!==t));
    setPassU(false);
    setTurn("ia"); setMsg("IA juega…");
  };

  /* AI turn */
  const aiMove=()=>{
    const {L,R}=ends();
    const move=ai.find(f=>f.includes(L)||f.includes(R));
    if(move){
      const side=move.includes(L)&&!move.includes(R)?"left":"right";
      place(move,side);
      setAI(h=>h.filter(f=>f!==move));
      setPassA(false);
    }else{
      setPassA(true);
    }
    setTurn("user"); setMsg("Tu turno");
  };
  useEffect(()=>{ if(turn==="ia"&&!end) setTimeout(aiMove,600); },[turn]);

  /* cierre / victoria ronda */
  useEffect(()=>{
    if(end) return;
    // victoria normal
    if(!hand.length||!ai.length){
      const winner=!hand.length?"user":"ai";
      const pts=suma(winner==="user"?ai:hand);
      finishRound(winner,pts,"gana vaciado");
    }
    // cierre
    if(passU&&passA){
      const pu=suma(hand), pa=suma(ai);
      const winner=pu<pa?"user":"ai";
      const pts=Math.abs(pu-pa);
      finishRound(winner,pts,"cierre");
    }
  },[hand,ai,passU,passA]);

  const finishRound=(winner,pts,mode)=>{
    setScore(s=>({...s,[winner]:s[winner]+pts}));
    const total=score[winner]+pts;
    if(total>=100){
      setEnd(`🏆 ${winner==="user"?"Ganaste":"La IA ganó"} el juego (${total} pts)`);
      setMsg("FIN DE JUEGO");
    }else{
      setEnd(`${winner==="user"?"Ganaste":"La IA ganó"} la ronda (+${pts})`);
      setMsg("Toca 'Seguir' para nueva ronda");
    }
  };

  /* RENDER */
  return(
    <main style={st.bg}>
      <h2 style={st.msg}>{msg}</h2>
      <div style={st.score}>Tú&nbsp;{score.user} pts • IA&nbsp;{score.ai} pts</div>

      {/* mano IA */}
      <div style={st.aiHand}>
        {ai.map((t,i)=><Tile key={i} v={t} playable={false}/>)}
      </div>

      {/* mesa con zig-zag */}
      <div style={st.board}>
        {board.map((t,i)=>(
          <Tile key={i} v={t} playable={false} rot={i%2?90:0}/>
        ))}
      </div>

      {/* mano user */}
      {!end&&(
        <div style={st.hand}>
          {hand.map((t,i)=>(
            <Tile key={i} v={t} playable={canPlay(t)} onClick={()=>playUser(t)}/>
          ))}
        </div>
      )}

      <div style={{marginTop:18,textAlign:"center"}}>
        {end?
          <button onClick={nuevaRonda} style={st.btn}>▶️ Seguir</button>:
          <Link to="/dashboard" style={st.link}>← Dashboard</Link>}
      </div>
    </main>
  );
}

/* ───── estilos inline ───── */
const st={
  bg:{minHeight:"100vh",background:"#073b4c",padding:12,color:"#fff",
      display:"flex",flexDirection:"column",alignItems:"center"},
  msg:{fontWeight:700,fontSize:18,marginBottom:6},
  score:{marginBottom:8,fontWeight:600},
  board:{flex:1,background:"#2a9d8f",border:"6px solid #264653",
         padding:10,borderRadius:12,display:"flex",flexWrap:"wrap",
         justifyContent:"center",alignItems:"center",minHeight:170,
         maxWidth:"100%"},
  hand:{marginTop:12,display:"flex",flexWrap:"wrap",justifyContent:"center",gap:6},
  aiHand:{marginBottom:10,display:"flex",flexWrap:"wrap",justifyContent:"center",gap:4,opacity:.8},
  tile:{width:60,height:100,background:"#fff",border:"2px solid #000",
        borderRadius:8,margin:4,display:"flex",flexDirection:"column",
        justifyContent:"space-between",padding:4,transition:"transform .2s"},
  div:{height:2,background:"#000",width:"90%",margin:"0 auto"},
  face:{flex:1,position:"relative"},
  dot:{position:"absolute",width:10,height:10,background:"#000",
       borderRadius:"50%",transform:"translate(-50%,-50%)"},
  btn:{padding:"10px 24px",background:"#2a9d8f",border:"none",
       borderRadius:18,fontWeight:700,color:"#fff"},
  link:{color:"#facc15",textDecoration:"underline",fontWeight:600}
};