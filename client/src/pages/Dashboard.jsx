import React, { useEffect, useState } from 'react';
import { getDatabase, ref, onValue, update } from 'firebase/database';
import { getAuth, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logor.png'; // ← Logo de la empresa

const COP = n => n?.toLocaleString('es-CO') ?? '0';

export default function Dashboard() {
  const auth = getAuth();
  const navigate = useNavigate();
  const db = getDatabase();
  const usr = auth.currentUser;

  const [data, setData] = useState(null);
  const [showIA, setShowIA] = useState(false);
  const [showFelicidades, setShowFelicidades] = useState(null);

  useEffect(() => {
    if (!usr) return;
    const userRef = ref(db, 'usuarios/' + usr.uid);
    onValue(userRef, snap => {
      const d = snap.val();
      setData(d);
      if (!d?.iaActiva) setShowIA(true);

      if (d?.paquetes) {
        Object.entries(d.paquetes).forEach(([id, p]) => {
          if (!p.iniciado) {
            const nuevaGanancia = (d.ganancias ?? 0) + (p.ganDia ?? 0);
            update(ref(db, 'usuarios/' + usr.uid), {
              ganancias: nuevaGanancia,
              [`paquetes/${id}/iniciado`]: true,
              [`paquetes/${id}/reclamado`]: true,
              [`paquetes/${id}/ultimoReclamo`]: Date.now(),
              [`paquetes/${id}/diasRestantes`]: p.dur - 1,
            });
            setShowFelicidades(p.nombre);
          }
        });
      }
    });
  }, [usr]);

  const activarIA = () => {
    update(ref(db, 'usuarios/' + usr.uid), {
      iaActiva: true,
      iaSaldo: 0,
      iaDiasRestantes: 60,
      iaReclamado: false,
      iaUltimoReclamo: 0
    });
    setShowIA(false);
    setShowFelicidades({ tipo: 'ia' });
  };

  const reclamar = () => {
    const hoy = new Date();
    const ultima = new Date(data.iaUltimoReclamo ?? 0);
    if (!data || data.iaDiasRestantes <= 0 || ultima.toDateString() === hoy.toDateString()) return;

    const nuevoSaldo = (data.iaSaldo ?? 0) + 1000;
    update(ref(db, 'usuarios/' + usr.uid), {
      iaSaldo: nuevoSaldo,
      iaDiasRestantes: data.iaDiasRestantes - 1,
      iaUltimoReclamo: Date.now(),
    });
  };

  const reclamarPaquete = (id, p) => {
    const hoy = new Date();
    const ultima = new Date(p.ultimoReclamo ?? 0);
    if (!data?.paquetes?.[id] || p.diasRestantes <= 0 || ultima.toDateString() === hoy.toDateString()) return;

    const nuevaGanancia = (data.ganancias ?? 0) + (p.ganDia ?? 0);
    update(ref(db, 'usuarios/' + usr.uid), {
      ganancias: nuevaGanancia,
      [`paquetes/${id}/reclamado`]: true,
      [`paquetes/${id}/ultimoReclamo`]: Date.now(),
      [`paquetes/${id}/diasRestantes`]: p.diasRestantes - 1,
    });
  };

  const logout = () => {
    signOut(auth);
    navigate('/');
  };

  if (!data) return <Loader />;

  return (
    <div style={styles.bg}>
      {/* 🟡 Barra de navegación con logo */}
      <div style={styles.navWrap}>
        <img src={logo} alt="CartAI Logo" style={styles.logoNav} />
        <NavBtn emoji="🏠" text="Dashboard" to="/dashboard" />
        <NavBtn emoji="💼" text="Invertir" to="/invest" />
        <NavBtn emoji="💸" text="Retirar" to="/withdraw" />
        <NavBtn emoji="🎁" text="Bonos y Recompensas" to="/referrals" />
        <NavBtn emoji="🎮" text="Jugar" to="/game" />
        <button onClick={logout} style={styles.logout}>Cerrar sesión</button>
      </div>

      <h1 style={styles.h1}>Bienvenido, {usr.displayName?.split('|')[0] ?? 'Usuario'} 👋</h1>
      <p style={styles.subtitle}>Resumen de tu inversión</p>

      {data.iaActiva && (
        <Card>
          <h2 style={styles.cardTitle}>🤖 IA gratuita</h2>
          <p>Bono acumulado: <b>${COP(data.iaSaldo)}</b></p>
          <p><small>{data.iaDiasRestantes} días restantes</small></p>
          <Progress pct={100 - (data.iaDiasRestantes / 60) * 100} />
          <button
            onClick={reclamar}
            disabled={new Date(data.iaUltimoReclamo ?? 0).toDateString() === new Date().toDateString()}
            style={{
              ...styles.cta,
              backgroundColor: new Date(data.iaUltimoReclamo ?? 0).toDateString() === new Date().toDateString() ? '#555' : '#00c853'
            }}
          >
            {new Date(data.iaUltimoReclamo ?? 0).toDateString() === new Date().toDateString()
              ? 'Reclamado hoy'
              : 'Reclamar $1.000 bono'}
          </button>
        </Card>
      )}

      <div style={styles.metricsWrap}>
        <Metric label="Invertido" val={data.invertido ?? 0} />
        <Metric label="Ganancias" val={data.ganancias ?? 0} />
        <Metric label="Bonos" val={data.iaSaldo ?? 0} />
      </div>

      <h3 style={styles.section}>📦 Paquetes activos</h3>
      {data.paquetes
        ? Object.entries(data.paquetes).map(([id, p]) => (
          <Card key={id}>
            <h3>{p.nombre}</h3>
            <p><b>Inversión:</b> ${COP(p.valor)}</p>
            <p><b>Ganancia diaria:</b> ${COP(p.ganDia)}</p>
            <p><b>Días restantes:</b> {p.diasRestantes}</p>
            <Progress pct={100 - (p.diasRestantes / p.dur) * 100} />
            <button
              onClick={() => reclamarPaquete(id, p)}
              disabled={new Date(p.ultimoReclamo ?? 0).toDateString() === new Date().toDateString()}
              style={{
                ...styles.cta,
                backgroundColor: new Date(p.ultimoReclamo ?? 0).toDateString() === new Date().toDateString() ? '#555' : '#2196f3'
              }}
            >
              {new Date(p.ultimoReclamo ?? 0).toDateString() === new Date().toDateString()
                ? 'Reclamado hoy'
                : `Reclamar $${COP(p.ganDia)}`}
            </button>
          </Card>
        ))
        : <p style={{ color: '#9ca3af' }}>Aún no tienes paquetes.</p>
      }

      {showIA && <ModalIA onClose={() => setShowIA(false)} onOk={activarIA} />}
      {showFelicidades && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <h2>🎉 ¡Felicidades!</h2>
            <p style={{ marginTop: 10 }}>
              Has activado tu paquete <b>{showFelicidades.nombre ?? "o IA gratuita"}</b> correctamente.
            </p>
            <button style={{ ...styles.cta, width: '100%' }} onClick={() => setShowFelicidades(null)}>Entendido</button>
          </div>
        </div>
      )}
    </div>
  );
}

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

const ModalIA = ({ onClose, onOk }) => (
  <div style={styles.modalOverlay}>
    <div style={styles.modalBox}>
      <h2 style={{ marginBottom: 10 }}>🎁 Bienvenido</h2>
      <p style={{ fontSize: 14, lineHeight: 1.4 }}>
        ¡Gracias por unirte a CartAI!<br />
        Tienes acceso a la <b>IA gratuita</b> por 60 días.<br />
        Recibirás <b>$1.000 COP diarios</b> como bono de bienvenida.
      </p>
      <button onClick={onOk} style={{ ...styles.cta, width: '100%', marginTop: 15 }}>Activar IA gratuita</button>
      <button onClick={onClose} style={styles.linkBtn}>Ahora no</button>
    </div>
  </div>
);

const styles = {
  bg: { background: '#0a0f1e', minHeight: '100vh', color: 'white', padding: 15 },
  navWrap: { display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 25, alignItems: 'center' },
  logoNav: {
    width: 42,
    marginRight: 10,
    filter: 'drop-shadow(0 2px 6px #0008)',
    borderRadius: 8
  },
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
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: 9999
  },
  modalBox: {
    background: '#1d273b',
    padding: 30, borderRadius: 20, maxWidth: 320, textAlign: 'center',
    boxShadow: '4px 4px 12px #000c'
  },
  linkBtn: {
    background: 'none', border: 'none', color: '#9ca3af',
    textDecoration: 'underline', cursor: 'pointer', marginTop: 10
  }
};