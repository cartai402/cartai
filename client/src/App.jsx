import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { auth } from './firebase';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Invest from './pages/Invest';
import Withdraw from './pages/Withdraw';
import Referrals from './pages/Referrals';
import Game from './pages/Game';
import PaymentQR from './pages/PaymentQR';
import NotFound from './pages/NotFound';
import Admin from './pages/Admin';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const isAdmin = user?.email === "admincartai@cartai.com";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-black">
        Cargando...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Siempre disponibles */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Admin exclusivo */}
        <Route
          path="/admin"
          element={
            user && isAdmin ? <Admin /> : <Navigate to="/login" replace />
          }
        />

        {/* Rutas normales solo para usuarios no admin */}
        {!isAdmin && user && (
          <>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/invest" element={<Invest />} />
            <Route path="/withdraw" element={<Withdraw />} />
            <Route path="/referrals" element={<Referrals />} />
            <Route path="/game" element={<Game />} />
            <Route path="/payment" element={<PaymentQR />} />
          </>
        )}

        {/* Página 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
