/************************************************************
 *  Dominó CartAI v3                                         *
 *  • Modo práctica sin apuesta (?practica=true)             *
 *  • Modo online 1-v-1 o vs IA con apuesta                  *
 *  • Comisión 10 %                                          *
 ***********************************************************/
import { useEffect, useState, useRef } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
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

/* ╔═══════════════════════════════╗
   ║  UTILIDADES DE DOMINÓ         ║
   ╚═══════════════════════════════╝ */
const fullSet = () => {
  const s = [];
  for (let i = 0; i <= 6; i++) for (let j = i; j <= 6; j++) s.push([i, j]);
  return s;
};
const shuffle = (a) => a.sort(() => Math.random() - 0.5);
const highestDouble = (h) =>
  h.filter((x) => x[0] === x[1]).sort((a, b) => b[0] - a[0])[0];
const sumHand = (h) => h.reduce((t, [a, b]) => t + a + b, 0);

/* ╔═══════════════════════════════╗
   ║  COMPONENTE FICHA (3-D)       ║
   ╚═══════════════════════════════╝ */
const Tile = ({ v, onClick, highlight, small }) => (
  <div
    className={clsx(
      "select-none cursor-pointer drop-shadow-lg",
      small ? "w-8 sm:w-10" : "w-12 sm:w-16",
      "transition-transform duration-200",
      highlight && "scale-105"
    )}
    style={{ perspective: 500 }}
    onClick={onClick}
  >
    <svg
      viewBox="0 0 80 140"
      className={clsx(
        "w-full h-full",
        highlight && "ring-4 ring-yellow-400 rounded-md"
      )}
      style={{
        transform: "rotateX(20deg) rotateY(-15deg)",
        transformStyle: "preserve-3d",
      }}
    >
      <rect width="80" height="140" rx="10" fill="#fff" />
      <line x1="5" y1="70" x2="75" y2="70" stroke="#888" strokeDasharray="4 4" />
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
  </div>
);

/* ╔═══════════════╗
   ║  IA BÁSICA    ║
   ╚═══════════════╝ */
const pickAI = (hand, left, right) => {
  let best = null,
    bestScore = Infinity;
  hand.forEach((t) => {
    const fitsL = left === null || t[0] === left || t[1] === left;
    const fitsR = right === null || t[0] === right || t[1] === right;
    if (fitsL || fitsR) {
      const score = sumHand(hand.filter((x) => x !== t));
      if (score < bestScore) {
        bestScore = score;
        best = { tile: t, side: fitsL ? "left" : "right" };
      }
    }
  });
  return best;
};

/* ╔══════════════════════╗
   ║  MODO PRÁCTICA       ║
   ╚══════════════════════╝ */
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

  const canPlay = (tile) => {
    if (!mesa.length) return true;
    const [l, r] = [mesa[0][0], mesa.at(-1)[1]];
    return tile[0] === l || tile[1] === l || tile[0] === r || tile[1] === r;
  };

  const playUser = (tile, side = "right") => {
    if (turno !== "user" || !canPlay(tile)) return;
    setMesa((m) =>
      side === "left" ? [tile, ...m] : [...m, tile[0] === m.at(-1)[1] ? tile : [tile[1], tile[0]]]
    );
    setMano((h) => h.filter((x) => x !== tile));
    setTurno("ai");
    setMsg("Turno IA");
  };

  useEffect(() => {
    if (turno !== "ai") return;
    const [l, r] = [mesa[0][0], mesa.at(-1)[1]];
    const play = pickAI(aiHand, l, r);
    if (play) {
      setTimeout(() => {
        setMesa((m) =>
          play.side === "left"
            ? [play.tile, ...m]
            : [...m, play.tile[0] === r ? play.tile : [play.tile[1], play.tile[0]]]
        );
        setAI(aiHand.filter((x) => x !== play.tile));
        setTurno("user");
        setMsg("Tu turno");
      }, 600);
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
      puedeJugar={canPlay}
      onPlay={playUser}
      hideOpponent={false}
      opponentCount={aiHand.length}
    />
  );
}

/* ╔═══════════════════════════════╗
   ║  MODO ONLINE (lógica íntegra) ║
   ╚═══════════════════════════════╝ */
function OnlineDomino({ apuesta, vsIA }) {
  const navigate = useNavigate();
  const [mesa, setMesa] = useState([]);
  const [mano, setMano] = useState([]);
  const [opp, setOpp] = useState([]);
  const [turno, setTurno] = useState("");
  const [msg, setMsg] = useState("Buscando rival…");
  const salaRef = useRef(null);
  const uid = auth.currentUser?.uid;
  const hostSide = useRef("");

  /* emparejamiento */
  useEffect(() => {
    if (!uid) return navigate("/login");
    const lobby = ref(db, "partidas");
    onValue(lobby, (snap) => {
      if (salaRef.current) return;
      let joined = false;
      snap.forEach((s) => {
        const p = s.val();
        if (
          p.status === "waiting" &&
          p.apuesta === apuesta &&
          p.vsIA === vsIA &&
          p.host !== uid
        ) {
          salaRef.current = ref(db, `partidas/${s.key}`);
          joined = true;
          hostSide.current = "player2";
          update(salaRef.current, { player2: uid, status: "playing" });
        }
      });
      if (!joined) {
        const key = push(lobby).key;
        salaRef.current = ref(db, `partidas/${key}`);
        hostSide.current = "host";
        set(salaRef.current, {
          host: uid,
          player2: vsIA ? "IA" : "",
          status: vsIA ? "playing" : "waiting",
          vsIA,
          apuesta,
          mesa: [],
          turno: "host",
        });
        runTransaction(ref(db, `usuarios/${uid}/saldoJuego`), (v) => (v || 0) - apuesta);
      }
    });
  }, [uid]);

  /* listener sala */
  useEffect(() => {
    if (!salaRef.current) return;
    const unsub = onValue(salaRef.current, (snap) => {
      const p = snap.val();
      if (!p) return;
      setMesa(p.mesa || []);
      setTurno(p.turno);
      if (p.status === "waiting") setMsg("Esperando rival…");
      if (p.status === "finished") {
        setMsg(
          p.winner === uid
            ? "🎉 ¡Has ganado!"
            : p.winner === "IA"
            ? "La IA ha ganado."
            : "Perdiste…"
        );
      }

      const myKey = hostSide.current;
      const oppKey = myKey === "host" ? "player2" : "host";
      setMano(p[`hand_${myKey}_${uid}`] || []);
      setOpp(p[`hand_${oppKey}_${p[oppKey]}`] || []);

      if (p.status === "playing" && !p[`hand_${myKey}_${uid}`]) deal(p);
      if (p.status === "playing" && vsIA && p.turno === "IA") playIA(p);
    });
    return () => unsub();
  }, []);

  /* repartir */
  const deal = (p) => {
    const pool = shuffle(fullSet());
    const h1 = pool.slice(0, 7),
      h2 = pool.slice(7, 14),
      stock = pool.slice(14);
    const first = highestDouble(h1) || highestDouble(h2) || pool[0];
    const mesaI = [first];
    const turnoI = hostSide.current === "host" ? "player2" : "host";
    update(salaRef.current, {
      [`hand_host_${p.host}`]: h1,
      [`hand_player2_${p.player2 || "IA"}`]: h2,
      stock,
      mesa: mesaI,
      turno: turnoI,
    });
  };

  /* IA en online */
  const playIA = (p) => {
    const iaHand = p[`hand_player2_IA`];
    const [l, r] = p.mesa.length ? [p.mesa[0][0], p.mesa.at(-1)[1]] : [null, null];
    const play = pickAI(iaHand, l, r);
    if (play) {
      const newMesa =
        play.side === "left" ? [play.tile, ...p.mesa] : [...p.mesa, play.tile];
      const newHand = iaHand.filter((x) => x !== play.tile);
      update(salaRef.current, {
        mesa: newMesa,
        [`hand_player2_IA`]: newHand,
        turno: "host",
      });
      if (newHand.length === 0) finish("IA");
    } else {
      update(salaRef.current, { turno: "host" });
    }
  };

  /* helpers */
  const myTurn = () =>
    turno === hostSide.current ||
    (vsIA && hostSide.current === "host" && turno === "host");
  const canPlay = (t) => {
    if (!mesa.length) return true;
    const [l, r] = [mesa[0][0], mesa.at(-1)[1]];
    return t[0] === l || t[1] === l || t[0] === r || t[1] === r;
  };

  const playUser = (tile, side = "right") => {
    if (!myTurn() || !canPlay(tile)) return;
    const newMesa = side === "left" ? [tile, ...mesa] : [...mesa, tile];
    const newHand = mano.filter((x) => x !== tile);
    update(salaRef.current, {
      mesa: newMesa,
      [`hand_${hostSide.current}_${uid}`]: newHand,
      turno: vsIA
        ? "IA"
        : hostSide.current === "host"
        ? "player2"
        : "host",
    });
    if (newHand.length === 0) finish(uid);
  };

  const finish = (winner) => {
    update(salaRef.current, { status: "finished", winner });
    if (winner !== "IA") {
      const premio = apuesta * 1.9;
      runTransaction(ref(db, `usuarios/${winner}/saldoJuego`), (v) => (v || 0) + premio);
    }
  };

  return (
    <Board
      mesa={mesa}
      mano={mano}
      msg={msg}
      turno={myTurn() ? "user" : "opp"}
      puedeJugar={canPlay}
      onPlay={playUser}
      hideOpponent
      opponentCount={opp.length}
    />
  );
}

/* ╔══════════════════╗
   ║  TABLERO / UI    ║
   ╚══════════════════╝ */
function Board({ mesa, mano, msg, turno, puedeJugar, onPlay, hideOpponent, opponentCount = 0 }) {
  return (
    <main className="min-h-screen flex flex-col text-white bg-gradient-to-br from-[#141e30] to-[#243b55]">
      <header className="p-3 text-center bg-black/40 backdrop-blur">{msg || (turno === "user" ? "Tu turno" : "Turno rival")}</header>

      {/* mesa */}
      <section className="flex-1 flex flex-wrap items-center justify-center gap-1 p-2">
        {mesa.map((t, i) => <Tile key={i} v={t} />)}
        {mesa.length === 0 && <p className="text-gray-400">Empieza…</p>}
      </section>

      {/* mano */}
      <footer className="bg-black/60 p-2 flex flex-wrap justify-center gap-1">
        {mano.map((t, i) => (
          <Tile key={i} v={t} highlight={puedeJugar(t)} onClick={() => onPlay(t)} small />
        ))}
      </footer>

      {/* oponente */}
      {hideOpponent && (
        <div className="text-center text-xs py-1 bg-black/50">Fichas rival: {opponentCount}</div>
      )}

      <div className="text-center text-sm bg-black/60 py-1">
        <Link to="/dashboard" className="text-yellow-300 underline">← Volver al Dashboard</Link>
      </div>
    </main>
  );
}

/* ╔══════════════════════════╗
   ║  PANTALLA DE BIENVENIDA  ║
   ╚══════════════════════════╝ */
export default function Game() {
  const [modo, setModo] = useState(null);
  const [search] = useSearchParams();
  const apuestaQuery = Number(search.get("apuesta") || 10000);

  if (modo === "practica") return <PracticeDomino />;
  if (modo === "vsIA") return <OnlineDomino apuesta={apuestaQuery} vsIA />;
  if (modo === "online") return <OnlineDomino apuesta={apuestaQuery} vsIA={false} />;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0f2027] via-[#203a43] to-[#2c5364] text-white px-6">
      <h1 className="text-4xl sm:text-6xl font-extrabold mb-4 drop-shadow-xl animate-pulse">🎲 Dominó CartAI</h1>
      <p className="max-w-md text-center text-gray-300 mb-10 text-sm sm:text-base">
        ¡Bienvenido! Elige un modo para empezar: practica sin riesgo, desafía a
        nuestra IA o compite online con otro jugador. Las partidas con apuesta tienen
        una comisión del 10 %.
      </p>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button
          onClick={() => setModo("practica")}
          className="py-3 bg-yellow-500 hover:bg-yellow-600 rounded-lg font-semibold shadow-lg transition active:scale-95"
        >
          🧠 Modo práctica
        </button>
        <button
          onClick={() => setModo("vsIA")}
          className="py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold shadow-lg transition active:scale-95"
        >
          🤖 Jugar contra IA
        </button>
        <button
          onClick={() => setModo("online")}
          className="py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold shadow-lg transition active:scale-95"
        >
          🌐 Jugar online
        </button>
        <Link to="/dashboard" className="mt-3 text-sm text-gray-200 underline text-center">
          ← Volver al Dashboard
        </Link>
      </div>
    </main>
  );
}