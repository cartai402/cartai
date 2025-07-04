import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const crearBaraja = () => {
  const fichas = [];
  for (let i = 0; i <= 6; i++) for (let j = i; j <= 6; j++) fichas.push([i, j]);
  return fichas.sort(() => Math.random() - 0.5);
};

const fichaMayorDoble = (mano) =>
  mano.filter(f => f[0] === f[1]).sort((a, b) => b[0] - a[0])[0];

const puntosFicha = [
  [],
  [[50, 50]],
  [[25, 25], [75, 75]],
  [[25, 25], [50, 50], [75, 75]],
  [[25, 25], [25, 75], [75, 25], [75, 75]],
  [[25, 25], [25, 75], [50, 50], [75, 25], [75, 75]],
  [[25, 25], [25, 50], [25, 75], [75, 25], [75, 50], [75, 75]],
];

const Cara = ({ num }) => (
  <div style={styles.cara}>
    {puntosFicha[num].map(([x, y], i) => (
      <div key={i} style={{ ...styles.punto, left: `${x}%`, top: `${y}%` }} />
    ))}
  </div>
);

const Ficha = ({ v, onClick, activa, oculta }) => (
  <div
    onClick={activa ? onClick : null}
    style={{
      ...styles.ficha,
      cursor: activa ? "pointer" : "default",
      opacity: activa ? 1 : 0.7,
      background: oculta ? "#ddd" : "#fff",
      boxShadow: oculta ? "inset 0 0 10px #aaa" : "2px 2px 6px #0006",
    }}
  >
    {oculta ? (
      <div style={styles.oculta}></div>
    ) : (
      <>
        <Cara num={v[0]} />
        <div style={styles.divisor} />
        <Cara num={v[1]} />
      </>
    )}
  </div>
);

export default function Game() {
  const [mesa, setMesa] = useState([]);
  const [mano, setMano] = useState([]);
  const [ia, setIA] = useState([]);
  const [turno, setTurno] = useState("user");
  const [msg, setMsg] = useState("Tu turno");
  const [fin, setFin] = useState("");
  const [ptsUser, setPtsUser] = useState(0);
  const [ptsIA, setPtsIA] = useState(0);

  const nuevoJuego = () => {
    const baraja = crearBaraja();
    const jugador = baraja.slice(0, 7);
    const maquina = baraja.slice(7, 14);
    const primera = fichaMayorDoble(jugador) || fichaMayorDoble(maquina) || jugador[0];

    setMesa([primera]);
    if (jugador.includes(primera)) {
      setMano(jugador.filter(f => f !== primera));
      setIA(maquina);
      setTurno("ia");
      setMsg("IA juega...");
    } else {
      setMano(jugador);
      setIA(maquina.filter(f => f !== primera));
      setTurno("user");
      setMsg("Tu turno");
    }
    setFin("");
  };

  useEffect(nuevoJuego, []);

  const extremos = () => {
    if (!mesa.length) return { L: null, R: null };
    return { L: mesa[0][0], R: mesa.at(-1)[1] };
  };

  const puedePoner = (f) => {
    const { L, R } = extremos();
    return f.includes(L) || f.includes(R);
  };

  const ponerFicha = (ficha, quien) => {
    const { L, R } = extremos();
    const invertir = ([a, b]) => [b, a];
    const ladoIzq = ficha.includes(L);
    const fichaOK = ladoIzq
      ? ficha[1] === L ? ficha : invertir(ficha)
      : ficha[0] === R ? ficha : invertir(ficha);

    setMesa(m => (ladoIzq ? [fichaOK, ...m] : [...m, fichaOK]));
    if (quien === "user") setMano(h => h.filter(f => f !== ficha));
    else setIA(h => h.filter(f => f !== ficha));
  };

  const jugarIA = () => {
    const { L, R } = extremos();
    const jugada = ia.find(f => f.includes(L) || f.includes(R));
    if (jugada) {
      setTimeout(() => {
        ponerFicha(jugada, "ia");
        setTurno("user");
        setMsg("Tu turno");
      }, 600);
    } else {
      setTimeout(() => {
        setTurno("user");
        setMsg("IA pasa • Tu turno");
      }, 500);
    }
  };

  const clickFicha = (f) => {
    if (turno !== "user" || !puedePoner(f)) return;
    ponerFicha(f, "user");
    setTurno("ia");
    setMsg("IA juega...");
  };

  useEffect(() => {
    if (turno === "ia" && !fin) jugarIA();
  }, [turno]);

  useEffect(() => {
    if (!fin && mano.length === 0) {
      const puntosIA = ia.flat().reduce((a, b) => a + b, 0);
      const nuevoPuntaje = ptsUser + puntosIA;
      setPtsUser(nuevoPuntaje);
      if (nuevoPuntaje >= 100) {
        setFin("🎉 ¡Ganaste la partida!");
        setMsg("🎉 ¡Ganaste la partida!");
      } else {
        setFin("🎉 ¡Ganaste la ronda!");
        setMsg("🎉 ¡Ganaste la ronda!");
      }
    } else if (!fin && ia.length === 0) {
      const puntosJugador = mano.flat().reduce((a, b) => a + b, 0);
      const nuevoPuntaje = ptsIA + puntosJugador;
      setPtsIA(nuevoPuntaje);
      if (nuevoPuntaje >= 100) {
        setFin("La IA ganó la partida 😓");
        setMsg("La IA ganó la partida 😓");
      } else {
        setFin("La IA ganó la ronda 😓");
        setMsg("La IA ganó la ronda 😓");
      }
    }

    if (
      turno === "user" &&
      mano.every(f => !puedePoner(f)) &&
      ia.every(f => !puedePoner(f))
    ) {
      const puntosJugador = mano.flat().reduce((a, b) => a + b, 0);
      const puntosIA = ia.flat().reduce((a, b) => a + b, 0);
      const ganador = puntosJugador < puntosIA ? "user" : "ia";
      const suma = (ganador === "user" ? puntosIA : puntosJugador);
      if (ganador === "user") {
        const nuevoPuntaje = ptsUser + suma;
        setPtsUser(nuevoPuntaje);
        if (nuevoPuntaje >= 100) {
          setFin("🎉 ¡Ganaste la partida!");
        } else {
          setFin("🎉 ¡Ganaste la ronda por bloqueo!");
        }
      } else {
        const nuevoPuntaje = ptsIA + suma;
        setPtsIA(nuevoPuntaje);
        if (nuevoPuntaje >= 100) {
          setFin("La IA ganó la partida 😓");
        } else {
          setFin("La IA ganó la ronda por bloqueo 😓");
        }
      }
    }
  }, [mano, ia]);

  return (
    <main style={styles.bg}>
      <h2 style={styles.turno}>{msg}</h2>

      <div style={styles.puntajes}>
        <span>👤 Tú: {ptsUser} pts ({mano.length} fichas)</span>
        <span>🤖 IA: {ptsIA} pts ({ia.length} fichas)</span>
      </div>

      <div style={styles.mesa}>
        {mesa.map((f, i) => (
          <Ficha key={i} v={f} activa={false} />
        ))}
      </div>

      <div style={styles.mano}>
        {mano.map((f, i) => (
          <Ficha key={i} v={f} activa={puedePoner(f)} onClick={() => clickFicha(f)} />
        ))}
      </div>

      <div style={styles.iaRow}>
        {ia.map((f, i) => (
          <Ficha key={i} v={f} oculta />
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        {fin ? (
          <button onClick={nuevoJuego} style={styles.boton}>
            🔄 Jugar otra ronda
          </button>
        ) : (
          <Link to="/dashboard" style={styles.volver}>
            ← Volver al Dashboard
          </Link>
        )}
      </div>
    </main>
  );
}

/* Estilos */
const styles = {
  bg: {
    minHeight: "100vh",
    background: "#073b4c",
    padding: 16,
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  turno: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 6,
  },
  puntajes: {
    fontSize: 14,
    marginBottom: 10,
    display: "flex",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 400,
  },
  mesa: {
    background: "#2a9d8f",
    border: "6px solid #264653",
    padding: 10,
    borderRadius: 12,
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    minHeight: 150,
    maxWidth: "100%",
  },
  mano: {
    marginTop: 14,
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 4,
  },
  iaRow: {
    marginTop: 10,
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  ficha: {
    width: 48,
    height: 80,
    border: "2px solid #000",
    borderRadius: 6,
    margin: 3,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: 3,
    background: "#fff",
    transform: "perspective(600px) rotateX(5deg)",
  },
  divisor: {
    height: 1,
    background: "#000",
    margin: "1px auto",
    width: "90%",
  },
  cara: {
    flex: 1,
    position: "relative",
  },
  punto: {
    position: "absolute",
    width: 8,
    height: 8,
    background: "#000",
    borderRadius: "50%",
    transform: "translate(-50%, -50%)",
  },
  oculta: {
    width: "100%",
    height: "100%",
    background: "repeating-linear-gradient(45deg, #aaa, #aaa 4px, #ddd 4px, #ddd 8px)",
    borderRadius: 6,
  },
  boton: {
    padding: "10px 22px",
    background: "#2a9d8f",
    border: "none",
    borderRadius: 20,
    fontWeight: 700,
    color: "#fff",
  },
  volver: {
    color: "#facc15",
    textDecoration: "underline",
    fontWeight: 600,
  },
};