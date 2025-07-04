import React, { useEffect, useState } from 'react';
import { getDatabase, ref, onValue, update } from 'firebase/database';
import { getAuth, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const COP = n => n?.toLocaleString('es-CO') ?? '0';

export default function Dashboard() {
  const auth = getAuth();
  const navigate = useNavigate();
  const db = getDatabase();
  const usr = auth.currentUser;

  const [data, setData] = useState(null);
  const [showIA, setShowIA] = useState(false);
  const [hoy, setHoy] = useState(new Date().toDateString());

  useEffect(() => {
    if (!usr) return;
    const userRef = ref(db, 'usuarios/' + usr.uid);
    onValue(userRef, snap => {
      const d = snap.val();
      setData(d);
      if (!d?.iaActiva) setShowIA(true);
    });
  }, [usr]);

  const activarIA = () => {
    update(ref(db, 'usuarios/' + usr.uid), {
      iaActiva: true,
      iaSaldo: 1000,
      iaDiasRestantes: 60,
      iaReclamado: false,
      ganado: (data?.ganado ?? 0) + 1000,
      bonos: (data?.bonos ?? 0) + 1000
    });
    setShowIA(false);
  };

  const reclamarIA = () => {
    if (!data || data.iaReclamado || data.iaDiasRestantes <= 0) return;
    update(ref(db, 'usuarios/' + usr.uid), {
      iaSaldo: data.iaSaldo + 1000,
      iaDiasRestantes: data.iaDiasRestantes - 1,
      iaReclamado: true,
      ganado: (data.ganado ?? 0) + 1000,
      bonos: (data.bonos ?? 0) + 1000
    });
  };

  const reclamarGanancia = (packId, pack) => {
    const hoyStr = new Date().toDateString();
    const ultimo = pack.ultimoReclamo ?? '';
    if (hoyStr === ultimo || pack.diasReclamados >= pack.duracion) return;

    const ganancia = pack.gananciaDiaria ?? 0;
    const nuevoReclamos = (pack.diasReclamados ?? 0) + 1;

    // actualizar ganancia y último reclamo
    update(ref(db, `usuarios/${usr.uid}`), {
      [`paquetes/${packId}/ultimoReclamo`]: hoyStr,
      [`paquetes/${packId}/diasReclamados`]: nuevoReclamos,
      ganado: (data.ganado ?? 0) + ganancia
    });
  };

  const logout = () => { signOut(auth); navigate('/'); };

  if (!data) return <Loader />;

  return (
    <div style={styles.bg}>
      <div style={styles.navWrap}>
        <NavBtn emoji="🏠" text="Dashboard" to="/dashboard" />
        <NavBtn emoji="💼" text="Invertir" to="/invest" />
        <NavBtn emoji="💸" text="Retirar" to="/withdraw" />
        <NavBtn emoji="📨" text="Invitar" to="/referrals" />
        <NavBtn emoji="🎮" text="Jugar" to="/game" />
        <button onClick={logout} style={styles.logout}>Cerrar sesión</button>
      </div>

      <h1 style={styles.h1}>
        Bienvenido, {usr.displayName?.split('|')[0] ?? 'Usuario'} 👋
      </h1>
      <p style={styles.subtitle}>Resumen de tu inversión</p>

      {data.iaActiva && (
        <Card>
          <h2 style={styles.cardTitle}>🤖 IA gratuita</h2>
          <p>Saldo acumulado: <b>${COP(data.iaSaldo)}</b></p>
          <p><small>{data.iaDiasRestantes} días restantes</small></p>
          <Progress pct={100 - (data.iaDiasRestantes / 60) * 100} />
          <button
            onClick={reclamarIA}
            disabled={data.iaReclamado}
            style={{
              ...styles.cta,
              backgroundColor: data.iaReclamado ? '#555' : '#00c853',
              cursor: data.iaReclamado ? 'default' : 'pointer'
            }}
          >
            {data.iaReclamado ? 'Reclamado hoy' : 'Reclamar $1.000'}
          </button>
        </Card>
      )}

      <div style={styles.metricsWrap}>
        <Metric label="Invertido" val={data.invertido ?? 0} />
        <Metric label="Ganancias" val={data.ganado ?? 0} />
        <Metric label="Bonos" val={data.bonos ?? 0} />
      </div>

      <h3 style={styles.section}>📦 Paquetes activos</h3>
      {data.paquetes
        ? Object.entries(data.paquetes).map(([id, p]) => {
          const diasTranscurridos = Math.floor((Date.now() - p.fecha) / (1000 * 60 * 60 * 24));
          const pct = Math.min((diasTranscurridos / p.duracion) * 100, 100);
          const reclamadoHoy = p.ultimoReclamo === hoy;

          return (
            <Card key={id}>
              <h3>{p.nombre}</h3>
              <p>💰 Inversión: <b>${COP(p.valor)}</b></p>
              {p.gananciaDiaria && (
                <p>📈 Ganas diario: <b>${COP(p.gananciaDiaria)}</b></p>
              )}
              <p>⏳ Duración: <b>{p.duracion} días</b></p>
              <p>📅 Días transcurridos: <b>{diasTranscurridos}</b></p>
              <p>🎁 Días reclamados: <b>{p.diasReclamados ?? 0}</b></p>
              <Progress pct={pct} />
              {p.gananciaDiaria && (
                <button
                  onClick={() => reclamarGanancia(id, p)}
                  disabled={reclamadoHoy}
                  style={{
                    ...styles.cta,
                    backgroundColor: reclamadoHoy ? '#555' : '#00c853',
                    cursor: reclamadoHoy ? 'default' : 'pointer',
                    marginTop: 10
                  }}
                >
                  {reclamadoHoy ? 'Reclamado hoy' : `Reclamar ${COP(p.gananciaDiaria)}`}
                </button>
              )}
            </Card>
          );
        })
        : <p style={{ color: '#9ca3af' }}>Aún no tienes paquetes.</p>
      }

      {showIA && <Modal onClose={() => setShowIA(false)} onOk={activarIA} />}
    </div>
  );
}

/* AUX COMPONENTS */
const Loader = () => (
  <div style={{ ...styles.bg, justifyContent: 'center', alignItems: 'center' }}>
    Cargando…
  </div>
);

const NavBtn = ({ emoji, text, to }) => (
  <a href={to} style={styles.navBtn}>
    <span style={{ fontSize: 20 }}>{emoji}</span> {text}
  </a>
);

const Card = ({ children }) => (
  <div style={styles.card}>{children}</div>
);

const Metric = ({ label, val }) => (
  <Card>
    <p style={{ opacity: .7, fontSize: 14 }}>{label}</p>
    <h2>${COP(val)}</h2>
  </Card>
);

const Progress = ({ pct }) => (
  <div style={{ background: '#333', borderRadius: 8, overflow: 'hidden', height: 14, margin: '10px 0' }}>
    <div style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#ffe259,#ffa751)', height: '100%' }} />
  </div>
);

const Modal = ({ onClose, onOk }) => (
  <div style={styles.modalOverlay}>
    <div style={styles.modalBox}>
      <h2 style={{ marginBottom: 10 }}>🎉 ¡Felicidades!</h2>
      <p style={{ marginBottom: 20, fontSize: 14, lineHeight: 1.4 }}>
        Tienes acceso a la IA gratuita de CartAI.<br />
        Recibe <b>$1.000 COP</b> diarios por 60 días.
      </p>
      <button onClick={onOk} style={{ ...styles.cta, width: '100%' }}>Activar IA gratuita</button>
      <button onClick={onClose} style={{ ...styles.linkBtn, marginTop: 10 }}>Ahora no</button>
    </div>
  </div>
);

/* ESTILOS */
const styles = {
  bg: { background: '#0a0f1e', minHeight: '100vh', color: 'white', padding: 15 },
  navWrap: { display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 25 },
  navBtn: {
    background: '#1d273b', padding: '10px 18px',
    borderRadius: 12, color: 'white', textDecoration: 'none',
    display: 'flex', alignItems: 'center', gap: 6,
    boxShadow: '3px 3px 6px #0007'
  },
  logout: {
    background: '#ff1744', border: 'none', borderRadius: 12,
    color: 'white', padding: '10px 18px', fontWeight: 'bold',
    boxShadow: '3px 3px 6px #0007'
  },
  h1: { fontSize: 28, fontWeight: 600, margin: 0 },
  subtitle: { opacity: .8, marginBottom: 25 },
  card: {
    background: '#152037',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    boxShadow: '4px 4px 12px #000a'
  },
  cardTitle: { marginTop: 0 },
  cta: {
    border: 'none',
    padding: '10px 18px',
    borderRadius: 12,
    fontWeight: 'bold',
    color: 'white',
    boxShadow: '2px 2px 6px #0007'
  },
  metricsWrap: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))',
    gap: 15
  },
  section: { margin: '25px 0 10px' },
  modalOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)',
    display: 'flex', justifyContent: 'center', alignItems: 'center'
  },
  modalBox: {
    background: '#1d273b',
    padding: 30, borderRadius: 20, maxWidth: 320, textAlign: 'center',
    boxShadow: '4px 4px 12px #000c'
  },
  linkBtn: {
    background: 'none', border: 'none', color: '#9ca3af',
    textDecoration: 'underline', cursor: 'pointer'
  }
};