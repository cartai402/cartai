import React, { useEffect, useState } from 'react';
import { getDatabase, ref, onValue, remove, update } from 'firebase/database';
import { getAuth } from 'firebase/auth';

/* Helpers */
const COP = n => n?.toLocaleString('es-CO') ?? '0';

export default function AdminPanel() {
  const auth = getAuth();
  const db = getDatabase();
  const [pagos, setPagos] = useState([]);
  const [retiros, setRetiros] = useState([]);
  const [stats, setStats] = useState({ totalUsuarios: 0, totalInvertido: 0 });

  // Cargar pagos pendientes
  useEffect(() => {
    const refPagos = ref(db, 'pagosPendientes');
    onValue(refPagos, snap => {
      const val = snap.val() || {};
      const lista = [];
      Object.entries(val).forEach(([uid, userPagos]) => {
        Object.values(userPagos).forEach(p => lista.push({ ...p, uid }));
      });
      setPagos(lista);
    });
  }, []);

  // Cargar retiros pendientes
  useEffect(() => {
    const refRetiros = ref(db, 'retirosPendientes');
    onValue(refRetiros, snap => {
      const val = snap.val() || {};
      const lista = [];
      Object.entries(val).forEach(([uid, userRetiros]) => {
        Object.values(userRetiros).forEach(r => lista.push({ ...r, uid }));
      });
      setRetiros(lista);
    });
  }, []);

  // Cargar estadísticas
  useEffect(() => {
    const refUsers = ref(db, 'usuarios');
    onValue(refUsers, snap => {
      const val = snap.val() || {};
      const totalUsuarios = Object.keys(val).length;
      let totalInvertido = 0;
      Object.values(val).forEach(u => {
        totalInvertido += u.invertido ?? 0;
      });
      setStats({ totalUsuarios, totalInvertido });
    });
  }, []);

  // Aprobar pago
  const aprobarPago = async (pago) => {
    const now = Date.now();
    const userRef = ref(db, `usuarios/${pago.uid}`);
    const userSnap = await onValueOnce(userRef);
    const userData = userSnap.val() || {};

    const nuevoPaquete = {
      paqueteId: pago.paqueteId,
      paqueteNom: pago.paqueteNom,
      invertido: pago.inversion,
      ganDia: pago.ganDia ?? null,
      pagoFinal: pago.pagoFinal ?? null,
      tipo: pago.tipo,
      durDias: pago.durDias,
      diasRestantes: pago.durDias,
      fechaAprob: now,
      estado: 'activo'
    };

    const nuevoId = generateId();

    // Actualizar datos del usuario
    await update(userRef, {
      [`paquetes/${nuevoId}`]: nuevoPaquete,
      invertido: (userData.invertido ?? 0) + pago.inversion,
      paqueteActivo: true,
      iaActiva: userData.iaActiva ?? true // activa IA si aún no tiene
    });

    // Eliminar el pago pendiente
    await remove(ref(db, `pagosPendientes/${pago.uid}/${pago.pagoId}`));
    alert('✅ Pago aprobado y paquete activado');
  };

  // Rechazar pago
  const rechazarPago = async (pago) => {
    await remove(ref(db, `pagosPendientes/${pago.uid}/${pago.pagoId}`));
    alert('❌ Pago rechazado');
  };

  // Aprobar retiro
  const aprobarRetiro = async (r) => {
    await update(ref(db, `usuarios/${r.uid}/retiros/${r.retiroId}`), {
      estado: 'aprobado',
      fechaAprob: Date.now()
    });
    await remove(ref(db, `retirosPendientes/${r.uid}/${r.retiroId}`));
    alert('✅ Retiro aprobado');
  };

  // Rechazar retiro
  const rechazarRetiro = async (r) => {
    await update(ref(db, `usuarios/${r.uid}/retiros/${r.retiroId}`), {
      estado: 'rechazado',
      fechaAprob: Date.now()
    });
    await remove(ref(db, `retirosPendientes/${r.uid}/${r.retiroId}`));
    alert('❌ Retiro rechazado');
  };

  return (
    <div style={styles.bg}>
      <h1 style={styles.title}>🛠 Panel de Administración</h1>

      {/* Estadísticas */}
      <section style={styles.section}>
        <h2>📊 Estadísticas</h2>
        <p>Usuarios registrados: <b>{stats.totalUsuarios}</b></p>
        <p>Total invertido: <b>${COP(stats.totalInvertido)}</b></p>
      </section>

      {/* Pagos pendientes */}
      <section style={styles.section}>
        <h2>💳 Pagos pendientes</h2>
        {pagos.length === 0 ? <p>No hay pagos pendientes.</p> :
          pagos.map(p => (
            <div key={p.pagoId} style={styles.card}>
              <p><b>{p.paqueteNom}</b> — ${COP(p.inversion)}</p>
              <p>UID: <code>{p.uid}</code></p>
              <p>Ref: {p.referencia ?? 'Sin referencia aún'}</p>
              <button onClick={() => aprobarPago(p)} style={styles.btnGreen}>✅ Aprobar</button>
              <button onClick={() => rechazarPago(p)} style={styles.btnRed}>❌ Rechazar</button>
            </div>
          ))}
      </section>

      {/* Retiros pendientes */}
      <section style={styles.section}>
        <h2>💸 Retiros pendientes</h2>
        {retiros.length === 0 ? <p>No hay retiros pendientes.</p> :
          retiros.map(r => (
            <div key={r.retiroId} style={styles.card}>
              <p>Monto: <b>${COP(r.monto)}</b></p>
              <p>UID: <code>{r.uid}</code></p>
              <p>Cuenta: <b>{r.tipoCuenta}</b> → <code>{r.numero}</code></p>
              <button onClick={() => aprobarRetiro(r)} style={styles.btnGreen}>✅ Aprobar</button>
              <button onClick={() => rechazarRetiro(r)} style={styles.btnRed}>❌ Rechazar</button>
            </div>
          ))}
      </section>
    </div>
  );
}

/* ==== helpers ==== */
const onValueOnce = (refPath) => new Promise(resolve => {
  onValue(refPath, snap => resolve(snap), { onlyOnce: true });
});

const generateId = () => '_' + Math.random().toString(36).slice(2, 10);

/* ==== estilos ==== */
const styles = {
  bg: { background: '#0a0f1e', color: 'white', padding: 20, minHeight: '100vh' },
  title: { fontSize: 28, marginBottom: 20 },
  section: { marginBottom: 40 },
  card: {
    background: '#1f2937',
    padding: 16,
    borderRadius: 14,
    marginBottom: 14,
    boxShadow: '0 4px 10px #0005'
  },
  btnGreen: {
    background: '#4caf50', color: 'white', border: 'none',
    padding: '8px 16px', borderRadius: 8, marginRight: 8, cursor: 'pointer'
  },
  btnRed: {
    background: '#e53935', color: 'white', border: 'none',
    padding: '8px 16px', borderRadius: 8, cursor: 'pointer'
  }
};