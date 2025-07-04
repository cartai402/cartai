/************************************************************
 *  Dominó CartAI – clásico responsivo                      *
 *  · 7 fichas por jugador + banca                          *
 *  · IA sencilla + robo automático                         *
 *  · Mesa horizontal, fichas compactas                     *
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
        bestSide =
          fitsL && !fitsR ? "left" : fitsR && !fitsL ? "right" : "either";
      }
    }
  });
  return { tile: best, side: bestSide };
};

/* ---------- ficha SVG ---------- */
const Tile = ({ v, onClick, small = false, highlight = false, rotated = false }) => (
  <svg
    onClick={onClick}
    viewBox="0 0 80 140"
    className={clsx(
      rotated ? "h-8 sm:h-10 w-auto" : small ? "h-10 sm:h-12 w-auto" : "h-16 sm:h-20 w-auto",
      highlight && "ring-2 ring-yellow-400 rounded"
    )}
    style={rotated ? { transform: "rotate(90deg)" } : undefined}
  >
    <rect width="80" height="140" rx="10" fill="#fff" />
    <line x1="5" y1="70" x2="75" y2="70" stroke="#777" strokeDasharray="4 4" />
    <text x="40" y="50" textAnchor="middle" fontSize="42" fontFamily="monospace" fill="#222">
      {v[0]}
    </text>
    <text x="40" y="120" textAnchor="middle" fontSize="42" fontFamily="monospace" fill="#222">
      {v[1]}
    </text>
  </svg>
);

/* ---------- tablero ---------- */
const Board = ({
  mesa,
  mano,
  stock,
  msg,
  onPlay,
  canPlay,
  oppCount,
}) => (
  <main className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 to-slate-800 text-white">
    <header className="py-2 text-center bg-black/40 text-sm">{msg}</header>

    {/* mesa horizontal con scroll */}
    <section className="flex-1 overflow-x-auto flex items-center px-4 py-3">
      <div className="flex gap-1 items-center">
        {mesa.length === 0 && <p className="text-gray-300">Empieza…</p>}
        {mesa.map((t, i) => (
          <Tile key={i} v={t} rotated />
        ))}
      </div>
    </section>

    {/* info rival + banca */}
    <div className="flex justify-between text-xs bg-black/50 px-4 py-1">
      <span>IA: {oppCount}</span>
      <span>Banca: {stock.length}</span>
    </div>

    {/* mano */}
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

    <div className="text-center text-xs py-2 bg-black/60">
      <Link to="/dashboard" className="underline text-yellow-300">
        ← Dashboard
      </Link>
    </div>
  </main>
);

/* ---------- juego completo ---------- */
export default function Game() {
  const [mesa, setMesa] = useState([]);
  const [mano, setMano] = useState([]);
  const [ia, setIA] = useState([]);
  const [stock, setStock] = useState([]);
  const [turn, setTurn] = useState("user"); // 'user' | 'ai'
  const [msg, setMsg] = useState("");

  /* repartir */
  useEffect(() => {
    const pool = shuffle(fullSet());
    setMano(pool.slice(0, 7));
    setIA(pool.slice(7, 14));
    setStock(pool.slice(14));
  }, []);

  /* decidir primera ficha */
  useEffect(() => {
    if (!mano.length || !ia.length || mesa.length) return;
    const first = highestDouble(mano) || highestDouble(ia) || mano[0];
    setMesa([first]);

    if (mano.includes(first)) {
      setMano((h) => h.filter((x) => x !== first));
      setMsg("Tu turno");
      setTurn("user");
    } else {
      setIA((h) => h.filter((x) => x !== first));
      setMsg("IA jugó primero");
      setTurn("user");
    }
  }, [mano, ia]);

  const ends = mesa.length
    ? { left: mesa[0][0], right: mesa.at(-1)[1] }
    : { left: null, right: null };

  const canPlay = (t) =>
    ends.left === null ||
    t.includes(ends.left) ||
    t.includes(ends.right);

  /* colocar ficha en mesa */
  const placeTile = (tile, side, who) => {
    const rotate = (v, ref) => (v[0] === ref ? v : [v[1], v[0]]);
    setMesa((m) =>
      side === "left"
        ? [rotate(tile, ends.left), ...m]
        : [...m, rotate(tile, ends.right)]
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

  /* acción jugador */
  const onPlay = (tile) => {
    if (turn !== "user" || !canPlay(tile)) return;
    const fitsL = tile.includes(ends.left);
    const fitsR = tile.includes(ends.right);
    let side = "right";
    if (fitsL && fitsR) {
      side = window.confirm("¿Izquierda? (Aceptar = izq · Cancelar = der)")
        ? "left"
        : "right";
    } else side = fitsL ? "left" : "right";
    placeTile(tile, side, "user");
  };

  /* IA */
  useEffect(() => {
    if (turn !== "ai") return;
    const { tile, side } = pickAI(ia, ends.left, ends.right);
    if (tile) {
      setTimeout(() => placeTile(tile, side === "either" ? "right" : side, "ia"), 600);
    } else if (stock.length) {
      // roba
      setIA((h) => [...h, stock[0]]);
      setStock((s) => s.slice(1));
      setTurn("user");
      setMsg("IA robó • Tu turno");
    } else {
      setTurn("user");
      setMsg("IA pasa • Tu turno");
    }
  }, [turn, ia, stock, ends]);

  /* robo automático jugador si no puede */
  useEffect(() => {
    if (turn !== "user") return;
    if (mano.some(canPlay)) return;
    if (stock.length) {
      setMano((h) => [...h, stock[0]]);
      setStock((s) => s.slice(1));
      setMsg("Robaste 1 ficha");
    } else {
      setMsg("No puedes jugar • pasas turno");
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
      oppCount={ia.length}
    />
  );
}