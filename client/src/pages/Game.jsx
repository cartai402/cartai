/************************************************************
 *  Dominó CartAI v3                                         *
 *  • Modo práctica sin apuesta (?practica=true)             *
 *  • Modo online 1-v-1 o vs IA con apuesta                  *
 *  • Comisión 10 %                                          *
 ***********************************************************/
import { useEffect, useState, useRef } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { v4 as uuid } from "uuid";
import clsx from "clsx";
import {
  ref,
  onValue,
  set,
  update,
  push,
  runTransaction,
} from "firebase/database";
import { auth, db } from "../firebase";

/* ---------- utilidades de dominó ---------- */
const fullSet = () => {
  const s = [];
  for (let i = 0; i <= 6; i++)
    for (let j = i; j <= 6; j++) s.push([i, j]);
  return s;
};
const shuffle = (a) => a.sort(() => Math.random() - 0.5);
const highestDouble = (h) =>
  h.filter((x) => x[0] === x[1]).sort((a, b) => b[0] - a[0])[0];
const sumHand = (h) => h.reduce((t, [a, b]) => t + a + b, 0);

/* ---------- Ficha SVG ---------- */
const Tile = ({ v, onClick, highlight, small }) => (
  <svg
    viewBox="0 0 80 140"
    onClick={onClick}
    className={clsx(
      "select-none cursor-pointer drop-shadow-lg",
      small ? "w-8 sm:w-10" : "w-12 sm:w-16",
      highlight && "ring-4 ring-yellow-400 rounded-md"
    )}
  >
    <rect width="80" height="140" rx="10" fill="white" />
    <line
      x1="5"
      y1="70"
      x2="75"
      y2="70"
      stroke="#888"
      strokeDasharray="4 4"
    />
    <text
      x="40"
      y="50"
      textAnchor="middle"
      fontSize="42"
      fontFamily="monospace"
      fill="#222"
    >
      {v[0]}
    </text>
    <text
      x="40"
      y="120"
      textAnchor="middle"
      fontSize="42"
      fontFamily="monospace"
      fill="#222"
    >
      {v[1]}
    </text>
  </svg>
);

/* ---------- IA “mejor jugada” ---------- */
const pickAI = (hand, left, right) => {
  let best = null,
    bestScore = Infinity;
  hand.forEach((t) => {
    const isLeft = left === null || t[0] === left || t[1] === left;
    const isRight = right === null || t[0] === right || t[1] === right;
    if (isLeft || isRight) {
      const rem = hand.filter((x) => x !== t);
      const score = sumHand(rem);
      if (score < bestScore) {
        bestScore = score;
        best = { tile: t, side: isLeft ? "left" : "right" };
      }
    }
  });
  return best;
};

/* ╔══════════════════════╗
   ║  MODO 1 ─ PRÁCTICA   ║
   ╚══════════════════════╝ */
function PracticeDomino() {
  const [mesa, setMesa] = useState([]);
  const [mano, setMano] = useState([]);
  const [aiHand, setAI] = useState([]);
  const [turno, setTurno] = useState("user");
  const [msg, setMsg] = useState("Tu turno");

  useEffect(() => {
    const pool = shuffle(fullSet());
    const user = pool.slice(0, 7);
    const ia = pool.slice(7, 14);
    setMano(user);
    setAI(ia);
    const doble = highestDouble(user) || highestDouble(ia) || user[0];
    setMesa([doble]);
    if (ia.includes(doble)) {
      setAI(ia.filter((t) => t !== doble));
      setTurno("user");
    } else {
      setMano(user.filter((t) => t !== doble));
      setTurno("ai");
      setMsg("IA juega primero");
    }
  }, []);

  const puede = (tile) => {
    if (!mesa.length) return true;
    const l = mesa[0][0],
      r = mesa.at(-1)[1];
    return tile[0] === l || tile[1] === l || tile[0] === r || tile[1] === r;
  };
  const playUser = (t, side = "right") => {
    if (turno !== "user" || !puede(t)) return;
    setMesa((m) =>
      side === "left" ? [t, ...m] : [...m, t[0] === m.at(-1)[1] ? t : [t[1], t[0]]]
    );
    setMano((h) => h.filter((x) => x !== t));
    setTurno("ai");
    setMsg("Turno IA");
  };

  useEffect(() => {
    if (turno !== "ai") return;
    const l = mesa[0][0],
      r = mesa.at(-1)[1];
    const p = pickAI(aiHand, l, r);
    if (p) {
      setTimeout(() => {
        setMesa((m) =>
          p.side === "left"
            ? [p.tile, ...m]
            : [...m, p.tile[0] === r ? p.tile : [p.tile[1], p.tile[0]]]
        );
        setAI(aiHand.filter((x) => x !== p.tile));
        setTurno("user");
        setMsg("Tu turno");
      }, 700);
    } else {
      setMsg("IA pasa • Tu turno");
      setTurno("user");
    }
  }, [turno]);

  return (
    <Board
      mesa={mesa}
      mano={mano}
      msg={msg}
      turno={turno}
      puedeJugar={puede}
      onPlay={playUser}
      hideOpponent={false}
      opponentCount={aiHand.length}
    />
  );
}

/* ╔══════════════════════╗
   ║  UI Compartida       ║
   ╚══════════════════════╝ */
function Board({ mesa, mano, msg, turno, puedeJugar, onPlay, hideOpponent, opponentCount = 0 }) {
  return (
    <main className="min-h-screen flex flex-col text-white bg-gradient-to-br from-[#141e30] to-[#243b55]">
      <header className="p-3 text-center bg-black/40">{msg || (turno === "user" ? "Tu turno" : "Turno rival")}</header>
      <section className="flex-1 flex flex-wrap items-center justify-center gap-1 p-2">
        {mesa.map((t, i) => <Tile key={i} v={t} />)}
        {mesa.length === 0 && <p className="text-gray-400">Empieza…</p>}
      </section>
      <footer className="bg-black/60 p-2 flex flex-wrap justify-center gap-1">
        {mano.map((t, i) => (
          <Tile key={i} v={t} highlight={puedeJugar(t)} onClick={() => onPlay(t)} small />
        ))}
      </footer>
      {hideOpponent && (
        <div className="text-center text-xs py-1 bg-black/50">Fichas rival: {opponentCount}</div>
      )}
      <div className="text-center text-sm bg-black/60 py-1">
        <Link to="/dashboard" className="text-yellow-300 underline">← Volver al Dashboard</Link>
      </div>
    </main>
  );
}

/* ╔══════════════════════════════════╗
   ║  Pantalla de bienvenida moderna ║
   ╚══════════════════════════════════╝ */
export default function Game() {
  const [modo, setModo] = useState(null);
  const [search] = useSearchParams();
  const apuesta = Number(search.get("apuesta") || 10000);

  if (modo === "practica") return <PracticeDomino />;
  if (modo === "vsIA") return <OnlineDomino apuesta={apuesta} vsIA={true} />;
  if (modo === "online") return <OnlineDomino apuesta={apuesta} vsIA={false} />;

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0f2027] via-[#203a43] to-[#2c5364] text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl sm:text-5xl font-bold mb-4 drop-shadow-lg">🎲 Dominó CartAI</h1>
      <p className="text-center max-w-md mb-10 text-gray-300 text-sm">
        Bienvenido a Dominó CartAI. Elige un modo para comenzar a jugar. Puedes practicar, jugar con IA o con otro jugador. 
      </p>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button onClick={() => setModo("practica")} className="bg-yellow-500 hover:bg-yellow-600 py-3 rounded-md font-semibold shadow-md transition">🧠 Modo Práctica</button>
        <button onClick={() => setModo("vsIA")} className="bg-green-500 hover:bg-green-600 py-3 rounded-md font-semibold shadow-md transition">🤖 Jugar contra IA</button>
        <button onClick={() => setModo("online")} className="bg-blue-500 hover:bg-blue-600 py-3 rounded-md font-semibold shadow-md transition">🌐 Jugar contra otro jugador</button>
        <Link to="/dashboard" className="text-sm text-gray-300 underline text-center mt-2">← Volver al Dashboard</Link>
      </div>
    </main>
  );
}