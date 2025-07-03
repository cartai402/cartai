// Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { getDatabase, ref, onValue, update } from 'firebase/database';
import { getAuth, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const auth = getAuth();
  const navigate = useNavigate();
  const user = auth.currentUser;
  const db = getDatabase();

  const [data, setData] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (user) {
      const userRef = ref(db, 'usuarios/' + user.uid);
      onValue(userRef, (snapshot) => {
        setData(snapshot.val());
        if (!snapshot.val()?.iaActiva) {
          setShowModal(true);
        }
      });
    }
  }, [user]);

  const activarIA = () => {
    update(ref(db, 'usuarios/' + user.uid), {
      iaActiva: true,
      iaSaldo: 1000,
      iaDiasRestantes: 60,
      iaReclamado: false,
    });
    setShowModal(false);
  };

  const reclamarIA = () => {
    if (!data.iaReclamado && data.iaDiasRestantes > 0) {
      update(ref(db, 'usuarios/' + user.uid), {
        iaSaldo: data.iaSaldo + 1000,
        iaDiasRestantes: data.iaDiasRestantes - 1,
        iaReclamado: true,
      });
    }
  };

  const cerrarSesion = () => {
    signOut(auth);
    navigate('/');
  };

  return (
    <div style={{ backgroundColor: '#0a0f1e', minHeight: '100vh', color: 'white', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
        {['Dashboard', 'Invertir', 'Retirar', 'Invitar', 'Jugar'].map((item, index) => (
          <a key={index} href={`/${item.toLowerCase()}`} style={{
            background: '#1d273b',
            color: 'white',
            padding: '10px 20px',
            borderRadius: 10,
            textDecoration: 'none',
            boxShadow: '2px 2px 5px black'
          }}>{item}</a>
        ))}
        <button onClick={cerrarSesion} style={{
          background: '#005eff',
          color: 'white',
          padding: '10px 20px',
          borderRadius: 10,
          border: 'none',
          boxShadow: '2px 2px 5px black',
          cursor: 'pointer'
        }}>Cerrar sesión</button>
      </div>

      <h1 style={{ fontSize: 32, marginBottom: 10 }}>Bienvenido, {user?.displayName || 'Usuario'} 👋</h1>
      <h3 style={{ marginBottom: 30 }}>Resumen de tu inversión</h3>

      {/* IA GRATUITA */}
      {data?.iaActiva && (
        <div style={{
          background: '#152037',
          padding: 20,
          borderRadius: 10,
          marginBottom: 20,
          boxShadow: '2px 2px 8px black'
        }}>
          <h2>🤖 IA gratuita</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Saldo acumulado: <b>${data.iaSaldo.toLocaleString()}</b></span>
            <span>{data.iaDiasRestantes} días restantes</span>
          </div>
          <div style={{ marginTop: 10, marginBottom: 10 }}>
            <div style={{
              backgroundColor: '#ddd',
              borderRadius: 20,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              color: '#555',
            }}>
              {data.iaReclamado ? 'Reclamado hoy' : (
                <button onClick={reclamarIA} style={{
                  backgroundColor: '#00c853',
                  color: 'white',
                  border: 'none',
                  borderRadius: 20,
                  padding: '5px 20px',
                  cursor: 'pointer'
                }}>
                  Reclamar $1.000
                </button>
              )}
            </div>
          </div>
          <p style={{ fontSize: 12, color: '#aaa' }}>0% de $60.000</p>
        </div>
      )}

      {/* ACTIVAR IA MODAL */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex',
          justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#1a2238',
            padding: 30,
            borderRadius: 15,
            maxWidth: 400,
            color: 'white',
            textAlign: 'center',
            boxShadow: '2px 2px 10px black'
          }}>
            <h2>🎉 ¡Felicidades!</h2>
            <p>Has sido seleccionado para usar la IA gratuita de CartAI.</p>
            <p>Obtendrás $1.000 diarios durante 60 días sin costo alguno.</p>
            <button onClick={activarIA} style={{
              marginTop: 20,
              backgroundColor: '#00c853',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              fontWeight: 'bold'
            }}>Activar IA gratuita</button>
          </div>
        </div>
      )}

      {/* SALDOS */}
      <div style={{ marginTop: 30 }}>
        <h3>Invertido</h3>
        <p><b>${data?.invertido?.toLocaleString() || 0}</b></p>

        <h3>Ganado</h3>
        <p><b>${data?.ganado?.toLocaleString() || 0}</b></p>

        <h3>Bonos</h3>
        <p><b>${data?.bonos?.toLocaleString() || 0}</b></p>
      </div>

      {/* PAQUETES ACTIVOS */}
      <div style={{ marginTop: 30 }}>
        <h3>📦 Paquetes activos</h3>
        {data?.paquetes ? (
          <ul>
            {Object.entries(data.paquetes).map(([id, p]) => (
              <li key={id}>{p.nombre} - ${p.valor}</li>
            ))}
          </ul>
        ) : (
          <p>Aún no tienes paquetes.</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;