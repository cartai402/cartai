// src/pages/Game.jsx
import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";

const fullSet = () => {
  const s = [];
  for (let i = 0; i <= 6; i++) for (let j = i; j <= 6; j++) s.push([i, j]);
  return s;
};
const shuffle = (a) => a.sort(() => Math.random() - 0.5);
const highestDouble = (h) => h.filter(([a, b]) => a === b).sort((a, b) => b[0] - a[0])[0];

const Tile = ({ v, onClick, highlight }) => (
  <div
    className={`domino w-14 h-7 sm:w-16 sm:h-8 relative transform-gpu transition-transform 
                ${highlight ? "scale-105 ring-4 ring-yellow-400" : ""}`}
    onClick={onClick}
    style={{ '--val-top': `"${v[0]}"`, '--val-bot': `"${v[1]}"` }}
  >
    <div className="face front">
      <span className="top">{v[0]}</span>
      <span className="bot">{v[1]}</span>
    </div>
  </div>
);

function PracticeDomino() {
  const [mesa, setMesa] = useState([]);
  const [mano, setMano] = useState([]);
  const [aiHand, setAI] = useState([]);
  const [turno, setTurno] = useState("user");
  const [msg, setMsg] = useState("Tu turno");

  useEffect(() => {
    const pool = shuffle(fullSet());
    const uHand = pool.slice(0, 7);
    const iaH = pool.slice(7, 14);
    setMano(uHand);
    setAI(iaH);
    const start = highestDouble(uHand) || highestDouble(iaH) || uHand[0];
    setMesa([start]);
    if (iaH.includes(start)) {
      setAI(iaH.filter((t) => t !== start));
    } else {
      setMano(uHand.filter((t) => t !== start));
      setTurno("ai");
      setMsg("IA juega primero");
    }
  }, []);

  const puedeJugar = (ficha) => {
    if (!mesa.length) return true;
    const [l, r] = [mesa[0][0], mesa.at(-1)[1]];
    return ficha.includes(l) || ficha.includes(r);
  };

  const colocarFicha = (ficha) => {
    if (turno !== "user" || !puedeJugar(ficha)) return;
    const [l, r] = [mesa[0][0], mesa.at(-1)[1]];
    const invertir = (a) => [a[1], a[0]];
    const sePuedeIzq = ficha[0] === l || ficha[1] === l;
    const sePuedeDer = ficha[0] === r || ficha[1] === r;

    if (sePuedeIzq) {
      setMesa((m) => [ficha[1] === l ? ficha : invertir(ficha), ...m]);
    } else {
      setMesa((m) => [...m, ficha[0] === r ? ficha : invertir(ficha)]);
    }

    setMano((h) => h.filter((x) => x !== ficha));
    setTurno("ia");
    setMsg("Turno IA");
  };

  useEffect(() => {
    if (turno !== "ia") return;
    const [l, r] = [mesa[0][0], mesa.at(-1)[1]];
    const jugada = aiHand.find((f) => f.includes(l) || f.includes(r));

    if (jugada) {
      setTimeout(() => {
        const invertir = (a) => [a[1], a[0]];
        const nueva = jugada[0] === r || jugada[1] === r ? jugada : invertir(jugada);
        setMesa((m) => [...m, nueva]);
        setAI((h) => h.filter((x) => x !== jugada));
        setTurno("user");
        setMsg("Tu turno");
      }, 700);
    } else {
      setMsg("IA pasa turno");
      setTurno("user");
    }
  }, [turno]);

  return (
    <main className="min-h-screen flex flex-col bg-green-900 text-white">
      <header className="text-center p-2 bg-black/50">{msg}</header>
      <section className="flex-1 flex flex-wrap justify-center items-center gap-1 p-4 bg-[url('/fondoDomino.png')] bg-cover">
        {mesa.map((f, i) => (
          <Tile key={i} v={f} />
        ))}
      </section>
      <footer className="bg-black/60 p-2 flex flex-wrap justify-center gap-2">
        {mano.map((f, i) => (
          <Tile key={i} v={f} highlight={puedeJugar(f)} onClick={() => colocarFicha(f)} />
        ))}
      </footer>
    </main>
  );
}

export default function Game() {
  const [modo, setModo] = useState(null);
  const [params] = useSearchParams();

  if (modo === "practica") return <PracticeDomino />;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0f2027] via-[#203a43] to-[#2c5364] text-white px-6">
      <h1 className="text-4xl sm:text-5xl font-bold mb-4 drop-shadow-xl animate-pulse">
        🎲 Dominó CartAI
      </h1>
      <p className="text-center text-gray-300 mb-6">
        Elige un modo: práctica sin riesgo, IA o partida online. Móvil optimizado.
      </p>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button
          onClick={() => setModo("practica")}
          className="py-3 bg-yellow-500 hover:bg-yellow-600 rounded-lg font-semibold shadow-lg transition active:scale-95"
        >
          🧠 Modo práctica
        </button>
        <Link to="/dashboard" className="mt-3 text-sm text-gray-200 underline text-center">
          ← Volver al Dashboard
        </Link>
      </div>
    </main>
  );
}