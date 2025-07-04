/************************************************************
 *  Dominó CartAI – mesa clásica                            *
 *  · 7 fichas por lado + banca                             *
 *  · Robar automático si no puedes jugar                   *
 *  · IA simple                                             *
 ***********************************************************/
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";

/* ---------- utilidades ---------- */
const fullSet = () => {
  const s = [];
  for (let i = 0; i <= 6; i++) for (let j = i; j <= 6; j++) s.push([i, j]);
  return s;
};
const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);
const highestDouble = (h) =>
  h.filter((t) => t[0] === t[1]).sort((a, b) => b[0] - a[0])[0];
const sumHand = (h) => h.reduce((t, [a, b]) => t + a + b, 0);
const pickAI = (hand, l, r) => {
  let best = null,
    bestScore = Infinity,
    bestSide = "";
  hand.forEach((t) => {
    const fitsL = l === null || t[0] === l || t[1] === l;
    const fitsR = r === null || t[0] === r || t[1] === r;
    if (fitsL || fitsR) {
      const score = sumHand(hand.filter((x) => x !== t));
      if (score < bestScore) {
        bestScore = score;
        best = t;
        bestSide = fitsL && !fitsR ? "left" : fitsR && !fitsL ? "right" : "either";
      }
    }
  });
  return { tile: best, side: bestSide };
};

/* ---------- ficha SVG ---------- */
const Tile = ({ v, onClick, small, highlight }) => (
  <svg
    onClick={onClick}
    viewBox="0 0 80 140"
    className={clsx(
      small ? "w-8 sm:w-10" : "w-12 sm:w-16",
      "cursor-pointer",
      highlight && "ring-2 ring-yellow-400 rounded-md"
    )}
  >
    <rect width="80" height="140" rx="10" fill="#fff" />
    <line x1="5" y1="70" x2="75" y2="70" stroke="#888" strokeDasharray="4 4" />
    <text x="40" y="50" textAnchor="middle" fontSize="42" fontFamily="monospace">
      {v[0]}
    </text>
    <text x="40" y="120" textAnchor="middle" fontSize="42" fontFamily="monospace">
      {v[1]}
    </text>
  </svg>
);

/* ---------- mesa / tablero ---------- */
const Board = ({
  mesa,
  mano,
  stock,
  msg,
  onPlay,
  canPlay,
  turn,
  oppCount,
}) => (
  <main className="min-h-screen flex flex-col bg-slate-800 text-white">
    <header className="p-2 text-center bg-black/40">{msg}</header>

    {/* mesa */}
    <section className="flex-1 flex flex-wrap items-center justify-center gap-1 p-2">
      {mesa.length === 0 && <p className="text-gray-300">Empieza…</p>}
      {mesa.map((t, i) => (
        <Tile key={i} v={t} />
      ))}
    </section>

    {/* estado rival + banca */}
    <div className="flex justify-between text-xs bg-black/50 px-3 py-1">
      <span>Fichas IA: {oppCount}</span>
      <span>Banca: {stock.length}</span>
    </div>

    {/* mano del jugador */}
    <footer className="bg-black/60 p-2 flex flex-wrap justify-center gap-1">
      {mano.map((t, i) => (
        <Tile
          key={i}
          v={t}
          small
          highlight={canPlay(t)}
          onClick={() => onPlay(t)}
        />
      ))}
    </footer>

    <div className="text-center text-sm bg-black/60 py-1">
      <Link to="/dashboard" className="underline">
        ← Dashboard
      </Link>
    </div>
  </main>
);

/* ---------- Juego completo ---------- */
export default function Game() {
  const [mesa, setMesa] = useState([]);
  const [mano, setMano] = useState([]);
  const [ia, setIA] = useState([]);
  const [stock, setStock] = useState([]);
  const [turn, setTurn] = useState("user"); // 'user' | 'ai'
  const [msg, setMsg] = useState("");

  /* repartir inicial */
  useEffect(() => {
    const pool = shuffle(fullSet());
    setMano(pool.slice(0, 7));
    setIA(pool.slice(7, 14));
    setStock(pool.slice(14));
  }, []);

  /* al montar mano/ia, decide primera ficha */
  useEffect(() => {
    if (mano.length === 0 || ia.length === 0 || mesa.length) return;
    const first =
      highestDouble(mano) ||
      highestDouble(ia) ||
      mano[0]; /* siempre habrá algo */
    setMesa([first]);
    if (mano.includes(first)) {
      setMano((h) => h.filter((x) => x !== first));
      setMsg("Tu turno");
      setTurn("user");
    } else {
      setIA((h) => h.filter((x) => x !== first));
      setMsg("IA jugó primero");
      setTurn("user"); // después de primera jugada IA, te toca
    }
  }, [mano, ia]);

  /* helpers */
  const ends = mesa.length
    ? { left: mesa[0][0], right: mesa.at(-1)[1] }
    : { left: null, right: null };

  const canPlay = (t) =>
    ends.left === null ||
    t[0] === ends.left ||
    t[1] === ends.left ||
    t[0] === ends.right ||
    t[1] === ends.right;

  /* jugador hace clic */
  const onPlay = (tile) => {
    if (turn !== "user" || !canPlay(tile)) return;

    // ¿encaja en ambos lados?
    const fitsLeft =
      ends.left === null || tile[0] === ends.left || tile[1] === ends.left;
    const fitsRight =
      ends.right === null || tile[0] === ends.right || tile[1] === ends.right;

    let side = "right";
    if (fitsLeft && fitsRight) {
      side = window.confirm("¿Colocar a la izquierda? Aceptar = izquierda · Cancelar = derecha")
        ? "left"
        : "right";
    } else side = fitsLeft ? "left" : "right";

    placeTile(tile, side, "user");
  };

  /* colocar ficha en mesa */
  const placeTile = (tile, side, who) => {
    setMesa((m) =>
      side === "left"
        ? [[tile[0] === ends.left ? tile[0] : tile[1], tile[0] === ends.left ? tile[1] : tile[0]], ...m]
        : [...m, [tile[0] === ends.right ? tile[0] : tile[1], tile[0] === ends.right ? tile[1] : tile[0]]]
    );
    if (who === "user") {
      setMano((h) => h.filter((x) => x !== tile));
      setTurn("ai");
      setMsg("Turno IA");
    } else {
      setIA((h) => h.filter((x) => x !== tile));
      setTurn("user");
      setMsg("Tu turno");
    }
  };

  /* IA juega cuando es su turno */
  useEffect(() => {
    if (turn !== "ai") return;

    // intenta jugar
    const move = pickAI(ia, ends.left, ends.right);
    if (move.tile) {
      const side =
        move.side === "either"
          ? ends.right !== null
            ? "right"
            : "left"
          : move.side;
      setTimeout(() => placeTile(move.tile, side, "ia"), 700);
    } else if (stock.length) {
      // roba
      setIA((h) => [...h, stock[0]]);
      setStock((s) => s.slice(1));
      setMsg("IA robó • Tu turno");
      setTurn("user");
    } else {
      setMsg("IA pasa • Tu turno");
      setTurn("user");
    }
  }, [turn, ia, stock, ends]);

  /* si user no puede jugar => robo automático / paso */
  useEffect(() => {
    if (turn !== "user") return;
    if (mano.some(canPlay)) return; // sí puede

    if (stock.length) {
      // roba una
      setMano((h) => [...h, stock[0]]);
      setStock((s) => s.slice(1));
      setMsg("Robaste 1 ficha");
    } else {
      setMsg("No puedes jugar: pasas turno");
      setTurn("ai");
    }
  }, [turn, mano, stock]);

  return (
    <Board
      mesa={mesa}
      mano={mano}
      stock={stock}
      msg={msg}
      onPlay={onPlay}
      canPlay={canPlay}
      turn={turn}
      oppCount={ia.length}
    />
  );
}