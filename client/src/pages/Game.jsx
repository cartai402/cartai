import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const generarFichas = () => {
  const fichas = [];
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      fichas.push([i, j]);
    }
  }
  return fichas.sort(() => Math.random() - 0.5);
};

const Ficha = ({ valor, onClick, seleccionable }) => (
  <div
    className={`w-12 h-20 sm:w-14 sm:h-24 bg-white border border-gray-800 rounded-md flex flex-col items-center justify-between p-1 text-black text-lg font-bold cursor-pointer transform transition-transform duration-200 ${
      seleccionable ? "hover:scale-105" : "opacity-60 cursor-not-allowed"
    }`}
    onClick={seleccionable ? onClick : null}
  >
    <div>{valor[0]}</div>
    <div className="w-full border-t border-gray-500 my-1"></div>
    <div>{valor[1]}</div>
  </div>
);

export default function Game() {
  const [mesa, setMesa] = useState([]);
  const [mano, setMano] = useState([]);
  const [ia, setIa] = useState([]);
  const [turno, setTurno] = useState("jugador");
  const [msg, setMsg] = useState("Tu turno");

  useEffect(() => {
    const fichas = generarFichas();
    const jugador = fichas.slice(0, 7);
    const iaFichas = fichas.slice(7, 14);
    const primera = fichas[14];
    setMano(jugador);
    setIa(iaFichas);
    setMesa([primera]);
    setMsg("Empieza con: " + primera.join("-"));
  }, []);

  const puedeJugar = (ficha) => {
    if (!mesa.length) return true;
    const izquierda = mesa[0][0];
    const derecha = mesa.at(-1)[1];
    return ficha.includes(izquierda) || ficha.includes(derecha);
  };

  const colocarFicha = (ficha) => {
    if (turno !== "jugador" || !puedeJugar(ficha)) return;

    const izquierda = mesa[0][0];
    const derecha = mesa.at(-1)[1];
    const invertir = ([a, b]) => [b, a];

    if (ficha.includes(izquierda)) {
      const f = ficha[1] === izquierda ? ficha : invertir(ficha);
      setMesa((m) => [f, ...m]);
    } else {
      const f = ficha[0] === derecha ? ficha : invertir(ficha);
      setMesa((m) => [...m, f]);
    }

    setMano((m) => m.filter((x) => x !== ficha));
    setTurno("ia");
    setMsg("Turno IA");
  };

  useEffect(() => {
    if (turno !== "ia") return;

    const izquierda = mesa[0][0];
    const derecha = mesa.at(-1)[1];
    const jugada = ia.find((f) => f.includes(izquierda) || f.includes(derecha));

    if (jugada) {
      const invertir = ([a, b]) => [b, a];
      const ladoIzq = jugada.includes(izquierda);
      const f = ladoIzq
        ? jugada[1] === izquierda
          ? jugada
          : invertir(jugada)
        : jugada[0] === derecha
        ? jugada
        : invertir(jugada);

      setTimeout(() => {
        setMesa((m) => (ladoIzq ? [f, ...m] : [...m, f]));
        setIa((h) => h.filter((x) => x !== jugada));
        setTurno("jugador");
        setMsg("Tu turno");
      }, 800);
    } else {
      setTimeout(() => {
        setTurno("jugador");
        setMsg("IA pasa turno");
      }, 600);
    }
  }, [turno]);

  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-br from-green-900 to-green-700 text-white">
      <header className="text-center p-2 bg-black/60 text-sm">{msg}</header>

      <section className="flex-1 flex flex-wrap items-center justify-center gap-1 p-3 bg-[url('/fondoDomino.png')] bg-cover">
        {mesa.map((f, i) => (
          <Ficha key={i} valor={f} />
        ))}
      </section>

      <footer className="bg-black/70 p-2 flex flex-wrap justify-center gap-2">
        {mano.map((f, i) => (
          <Ficha key={i} valor={f} onClick={() => colocarFicha(f)} seleccionable={puedeJugar(f)} />
        ))}
      </footer>

      <div className="text-center text-xs py-2 bg-black/50">
        <Link to="/dashboard" className="text-yellow-300 underline">← Volver al Dashboard</Link>
      </div>
    </main>
  );
}