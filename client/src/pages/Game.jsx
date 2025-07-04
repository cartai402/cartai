// Game.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// Generador de fichas
const fullSet = () => {
  const s = [];
  for (let i = 0; i <= 6; i++) for (let j = i; j <= 6; j++) s.push([i, j]);
  return s;
};
const shuffle = (a) => a.sort(() => Math.random() - 0.5);
const sumHand = (h) => h.reduce((t, [a, b]) => t + a + b, 0);
const highestDouble = (h) =>
  h.filter((x) => x[0] === x[1]).sort((a, b) => b[0] - a[0])[0];

// Componente de ficha
const Tile = ({ v, onClick, highlight, vertical }) => (
  <div
    className={`w-16 h-28 m-1 rounded-md shadow-lg cursor-pointer bg-white border-2 border-black flex flex-col items-center justify-center ${
      highlight ? "ring-4 ring-yellow-400" : ""
    } ${vertical ? "" : "rotate-90"}`}
    onClick={onClick}
  >
    <div className="text-2xl font-bold">{v[0]}</div>
    <hr className="border-t-2 border-black w-full my-1" />
    <div className="text-2xl font-bold">{v[1]}</div>
  </div>
);

// Componente principal
export default function Game() {
  const [mesa, setMesa] = useState([]);
  const [mano, setMano] = useState([]);
  const [aiHand, setAI] = useState([]);
  const [turno, setTurno] = useState("user");
  const [msg, setMsg] = useState("Tu turno");
  const [fin, setFin] = useState(false);

  // Al iniciar partida
  useEffect(() => {
    const pool = shuffle(fullSet());
    const uHand = pool.slice(0, 7);
    const iaH = pool.slice(7, 14);
    const start = highestDouble(uHand) || highestDouble(iaH) || uHand[0];
    setMesa([start]);

    if (iaH.includes(start)) {
      setAI(iaH.filter((t) => t !== start));
    } else {
      setMano(uHand.filter((t) => t !== start));
      setAI(iaH);
      setTurno("ai");
      setMsg("IA juega primero");
    }
  }, []);

  const puedeJugar = (tile) => {
    if (!mesa.length) return true;
    const [l, r] = [mesa[0][0], mesa.at(-1)[1]];
    return tile[0] === l || tile[1] === l || tile[0] === r || tile[1] === r;
  };

  const jugarUsuario = (tile) => {
    if (turno !== "user" || !puedeJugar(tile)) return;
    const [l, r] = [mesa[0][0], mesa.at(-1)[1]];
    if (tile[1] === l || tile[0] === l) {
      setMesa([[...tile].reverse(), ...mesa]);
    } else {
      setMesa([...mesa, tile]);
    }
    setMano(mano.filter((x) => x !== tile));
    setTurno("ai");
    setMsg("Turno de la IA");
  };

  const jugarIA = () => {
    if (turno !== "ai") return;
    setTimeout(() => {
      const [l, r] = [mesa[0][0], mesa.at(-1)[1]];
      const jugada = aiHand.find((t) =>
        t[0] === l || t[1] === l || t[0] === r || t[1] === r
      );
      if (jugada) {
        if (jugada[1] === l || jugada[0] === l) {
          setMesa([[...jugada].reverse(), ...mesa]);
        } else {
          setMesa([...mesa, jugada]);
        }
        setAI(aiHand.filter((x) => x !== jugada));
        setTurno("user");
        setMsg("Tu turno");
      } else {
        setMsg("IA pasa, tu turno");
        setTurno("user");
      }
    }, 800);
  };

  useEffect(() => {
    if (turno === "ai") jugarIA();
  }, [turno]);

  useEffect(() => {
    if (!mano.length) {
      setMsg("🎉 ¡Ganaste!");
      setFin(true);
    } else if (!aiHand.length) {
      setMsg("😓 La IA ganó.");
      setFin(true);
    }
  }, [mano, aiHand]);

  return (
    <main className="min-h-screen flex flex-col items-center bg-green-900 text-white p-4">
      <header className="text-lg font-bold py-2">{msg}</header>

      {/* Mesa de juego */}
      <div className="bg-green-800 border-4 border-yellow-700 rounded-xl w-full max-w-3xl min-h-[200px] p-3 flex flex-wrap justify-center">
        {mesa.map((t, i) => (
          <Tile key={i} v={t} vertical />
        ))}
      </div>

      {/* Mano del usuario */}
      {!fin && (
        <div className="mt-4 flex flex-wrap justify-center">
          {mano.map((t, i) => (
            <Tile
              key={i}
              v={t}
              onClick={() => jugarUsuario(t)}
              highlight={puedeJugar(t)}
            />
          ))}
        </div>
      )}

      <footer className="mt-6 text-center">
        <Link to="/dashboard" className="text-yellow-300 underline">
          ← Volver al Dashboard
        </Link>
      </footer>
    </main>
  );
}