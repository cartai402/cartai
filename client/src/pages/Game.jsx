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
    className={`w-14 h-24 bg-white border-2 border-black rounded-md flex flex-col items-center justify-between px-2 py-1 text-black font-bold text-lg cursor-pointer ${
      seleccionable ? "hover:scale-105 transition-transform" : "opacity-50"
    }`}
    onClick={seleccionable ? onClick : undefined}
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
  const [ganador, setGanador] = useState(null);

  const reiniciar = () => {
    const fichas = generarFichas();
    const jugador = fichas.slice(0, 7);
    const iaFichas = fichas.slice(7, 14);
    const primera = fichas[14];
    setMano(jugador);
    setIa(iaFichas);
    setMesa([primera]);
    setTurno("jugador");
    setMsg("Tu turno");
    setGanador(null);
  };

  useEffect(reiniciar, []);

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

    setMano((m) => {
      const nueva = m.filter((x) => x !== ficha);
      if (nueva.length === 0) {
        setGanador("jugador");
        setMsg("🎉 ¡Ganaste!");
      } else {
        setTurno("ia");
        setMsg("Turno de la IA");
      }
      return nueva;
    });
  };

  useEffect(() => {
    if (turno !== "ia" || ganador) return;

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
        setIa((h) => {
          const nueva = h.filter((x) => x !== jugada);
          if (nueva.length === 0) {
            setGanador("ia");
            setMsg("La IA ganó");
          } else {
            setTurno("jugador");
            setMsg("Tu turno");
          }
          return nueva;
        });
      }, 800);
    } else {
      setTimeout(() => {
        setTurno("jugador");
        setMsg("La IA pasó");
      }, 600);
    }
  }, [turno]);

  return (
    <main className="min-h-screen flex flex-col bg-[#0e1320] text-white">
      <header className="text-center p-3 text-lg font-medium bg-black/50 shadow-md">
        {msg}
      </header>

      <section className="flex-1 flex items-center justify-center flex-wrap gap-2 p-4 bg-gradient-to-br from-blue-900 to-black">
        {mesa.map((f, i) => (
          <Ficha key={i} valor={f} />
        ))}
        {mesa.length === 0 && (
          <p className="text-gray-400 text-sm">Coloca la primera ficha…</p>
        )}
      </section>

      <footer className="bg-gray-900 p-2 flex flex-wrap justify-center gap-2 sticky bottom-0 shadow-inner z-10">
        {mano.map((f, i) => (
          <Ficha key={i} valor={f} onClick={() => colocarFicha(f)} seleccionable={puedeJugar(f)} />
        ))}
      </footer>

      <div className="text-center text-sm py-2 bg-black/70">
        {ganador && (
          <button
            onClick={reiniciar}
            className="bg-green-500 px-4 py-2 rounded-md text-white font-semibold shadow hover:bg-green-600"
          >
            🔁 Jugar de nuevo
          </button>
        )}
        {!ganador && (
          <Link to="/dashboard" className="text-yellow-400 underline">
            ← Volver al Dashboard
          </Link>
        )}
      </div>
    </main>
  );
}