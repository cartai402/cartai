import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const crearBaraja = () => {
  const fichas = [];
  for (let i = 0; i <= 6; i++)
    for (let j = i; j <= 6; j++) fichas.push([i, j]);
  return fichas.sort(() => Math.random() - 0.5);
};

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
      opacity: activa ? 1 : 0.5,
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
  const [msg, setMsg] = useState("Arrastra una ficha");
  const [fin, setFin] = useState("");
  const [pts, setPts] = useState({ user: 0, ia: 0 });

  const fichaMayorDoble = (mano) =>
    mano.filter(f => f[0] === f[1]).sort((a, b) => b[0] - a[0])[0];

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

  const puntos = (arr) => arr.reduce((acc, [a, b]) => acc + a + b, 0);

  const jugarIA = () => {
    const jugada = ia.find(puedePoner);
    if (jugada) {
      setTimeout(() => {
        ponerFicha(jugada, "ia");
        setTurno("user");
        setMsg("Tu turno");
      }, 700);
    } else {
      setTimeout(() => {
        if (!mano.some(puedePoner)) cerrarRonda();
        else {
          setTurno("user");
          setMsg("IA pasa • Tu turno");
        }
      }, 600);
    }
  };

  const cerrarRonda = () => {
    const ptsUser = puntos(mano);
    const ptsIA = puntos(ia);
    if (ptsUser < ptsIA) {
      const ganancia = ptsIA;
      setPts(p => ({ ...p, user: p.user + ganancia }));
      setFin(`Ganaste la ronda (+${ganancia})`);
    } else {
      const ganancia = ptsUser;
      setPts(p => ({ ...p, ia: p.ia + ganancia }));
      setFin(`La IA ganó la ronda (+${ganancia})`);
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
      const ptsSum = puntos(ia);
      setPts(p => ({ ...p, user: p.user + ptsSum }));
      setFin(`🎉 ¡Ganaste la ronda (+${ptsSum})`);
    } else if (!fin && ia.length === 0) {
      const ptsSum = puntos(mano);
      setPts(p => ({ ...p, ia: p.ia + ptsSum }));
      setFin(`La IA ganó la ronda (+${ptsSum})`);
    }
  }, [mano, ia]);

  return (
    <main style={styles.bg}>
      <div style={styles.top}>
        <div style={styles.iconBox}><div style={styles.circle}>👤</div><span>Tú ({mano.length})</span></div>
        <h2 style={styles.turno}>{msg}</h2>
        <div style={styles.iconBox}><div style={styles.circle}>🤖</div><span>IA ({ia.length})</span></div>
      </div>

      <div style={styles.puntaje}>Tú {pts.user} — IA {pts.ia}</div>

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

      <div style={{ marginTop: 20, textAlign: "center" }}>
        {fin ? (
          <button onClick={nuevoJuego} style={styles.boton}>Nueva ronda</button>
        ) : (
          <Link to="/dashboard" style={styles.volver}>← Dashboard</Link>
        )}
      </div>
    </main>
  );
}

const styles = {
  bg: {
    minHeight: "100vh",
    background: "#052e16",
    padding: 12,
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  top: {
    display: "flex",
    justifyContent: "space-between",
    width: "100%",
    alignItems: "center",
  },
  turno: {
    fontWeight: 600,
    fontSize: 18,
  },
  puntaje: {
    marginBottom: 6,
    fontWeight: 500,
    fontSize: 16,
  },
  iconBox: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  circle: {
    background: "#fff",
    borderRadius: "50%",
    width: 30,
    height: 30,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: "#000",
    fontSize: 18,
    fontWeight: "bold",
  },
  mesa: {
    background: "#2a9d8f",
    borderRadius: 20,
    padding: 8,
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    minHeight: 120,
    maxWidth: "100%",
  },
  mano: {
    marginTop: 20,
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 4,
  },
  ficha: {
    width: 50,
    height: 80,
    background: "#fff",
    border: "2px solid #000",
    borderRadius: 6,
    margin: 2,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: 3,
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
    width: 8,
    height: 8,
    background: "#000",
    borderRadius: "50%",
    transform: "translate(-50%, -50%)",
  },
  boton: {
    padding: "8px 20px",
    background: "#2a9d8f",
    border: "none",
    borderRadius: 16,
    fontWeight: 700,
    color: "#fff",
  },
  volver: {
    color: "#facc15",
    textDecoration: "underline",
    fontWeight: 600,
  },
};