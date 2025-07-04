import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

/* ==== Helpers dominó ==== */
const crearBaraja = () => {
  const fichas = [];
  for (let i = 0; i <= 6; i++) for (let j = i; j <= 6; j++) fichas.push([i, j]);
  return fichas.sort(() => Math.random() - 0.5);
};

const fichaMayorDoble = (mano) =>
  mano.filter(f => f[0] === f[1]).sort((a, b) => b[0] - a[0])[0];

const contarPuntos = (mano) =>
  mano.reduce((sum, [a, b]) => sum + a + b, 0);

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

const Ficha = ({ v, onClick, activa }) => (
  <div
    onClick={activa ? onClick : null}
    style={{
      ...styles.ficha,
      cursor: activa ? "pointer" : "default",
      opacity: activa ? 1 : 0.4,
    }}
  >
    <Cara num={v[0]} />
    <div style={styles.divisor} />
    <Cara num={v[1]} />
  </div>
);

export default function Game() {
  const [mesa, setMesa] = useState([]);
  const [mano, setMano] = useState([]);
  const [ia, setIA] = useState([]);
  const [turno, setTurno] = useState("user");
  const [msg, setMsg] = useState("Tu turno");
  const [fin, setFin] = useState("");
  const [pasaIA, setPasaIA] = useState(false);
  const [pasaUser, setPasaUser] = useState(false);
  const [puntaje, setPuntaje] = useState({ user: 0, ia: 0 });

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
    if (quien === "user") {
      setMano(h => h.filter(f => f !== ficha));
      setPasaUser(false);
    } else {
      setIA(h => h.filter(f => f !== ficha));
      setPasaIA(false);
    }
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
      setPasaIA(true);
      setTimeout(() => {
        setTurno("user");
        setMsg("IA pasa • Tu turno");
      }, 400);
    }
  };

  const clickFicha = (f) => {
    if (turno !== "user" || !puedePoner(f)) return;
    ponerFicha(f, "user");
    setTurno("ia");
    setMsg("IA juega...");
  };

  const finalizarRonda = (ganador, motivo) => {
    let puntos = 0;
    if (motivo === "cerrado") {
      const puntosUser = contarPuntos(mano);
      const puntosIA = contarPuntos(ia);
      puntos = Math.abs(puntosUser - puntosIA);
      ganador = puntosUser < puntosIA ? "user" : "ia";
    } else {
      puntos = contarPuntos(ganador === "user" ? ia : mano);
    }

    setPuntaje(p => {
      const nuevos = { ...p };
      nuevos[ganador] += puntos;
      return nuevos;
    });

    setTimeout(() => {
      const total = puntaje[ganador] + puntos;
      if (total >= 100) {
        setFin(`🏆 ${ganador === "user" ? "Ganaste el juego" : "La IA ganó el juego"} (${total} pts)`);
        setMsg("Fin del juego");
      } else {
        setFin(`${ganador === "user" ? "Ganaste" : "La IA ganó"} la ronda (+${puntos} pts)`);
        setMsg("Presiona para continuar");
      }
    }, 500);
  };

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
    setPasaIA(false);
    setPasaUser(false);
  };

  useEffect(() => {
    if (turno === "ia" && !fin) jugarIA();
  }, [turno]);

  useEffect(() => {
    if (!fin && mano.length === 0) finalizarRonda("user", "normal");
    else if (!fin && ia.length === 0) finalizarRonda("ia", "normal");
    else if (!fin && pasaIA && pasaUser) finalizarRonda(null, "cerrado");
  }, [mano, ia, pasaIA, pasaUser]);

  useEffect(nuevoJuego, []);

  return (
    <main style={styles.bg}>
      <h2 style={styles.turno}>{msg}</h2>
      <div style={styles.puntos}>Tú: {puntaje.user} • IA: {puntaje.ia}</div>

      <div style={styles.mesa}>
        {mesa.map((f, i) => (
          <Ficha key={i} v={f} activa={false} />
        ))}
      </div>

      {!fin && (
        <div style={styles.mano}>
          {mano.map((f, i) => (
            <Ficha key={i} v={f} activa={puedePoner(f)} onClick={() => clickFicha(f)} />
          ))}
        </div>
      )}

      <div style={{ marginTop: 20, textAlign: "center" }}>
        {fin ? (
          <button onClick={nuevoJuego} style={styles.boton}>
            🔄 Jugar otra vez
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

/* ==== Estilos ==== */
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
    marginBottom: 8,
    fontWeight: 700,
    fontSize: 18,
  },
  puntos: {
    marginBottom: 12,
    fontWeight: 500,
    fontSize: 16,
  },
  mesa: {
    flex: 1,
    background: "#2a9d8f",
    border: "6px solid #264653",
    padding: 10,
    borderRadius: 12,
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    minHeight: 160,
    maxWidth: "100%",
  },
  mano: {
    marginTop: 16,
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  ficha: {
    width: 60,
    height: 100,
    background: "#fff",
    border: "2px solid #000",
    borderRadius: 8,
    margin: 4,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: 4,
    position: "relative",
  },
  divisor: {
    height: 2,
    background: "#000",
    margin: "0 auto",
    width: "90%",
  },
  cara: {
    flex: 1,
    position: "relative",
  },
  punto: {
    position: "absolute",
    width: 10,
    height: 10,
    background: "#000",
    borderRadius: "50%",
    transform: "translate(-50%, -50%)",
  },
  boton: {
    padding: "10px 20px",
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