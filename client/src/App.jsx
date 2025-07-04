import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth } from "./firebase";

/* ── Páginas ───────────────────────────────────── */
import Home       from "./pages/Home";
import Login      from "./pages/Login";
import Register   from "./pages/Register";
import Dashboard  from "./pages/Dashboard";
import Invest     from "./pages/Invest";
import Withdraw   from "./pages/Withdraw";
import Referrals  from "./pages/Referrals";
import Game       from "./pages/Game";
import PaymentQR  from "./pages/PaymentQR";
import NotFound   from "./pages/NotFound";
import Admin      from "./pages/Admin";

function App() {
  /* ───────── auth state ───────── */
  const [user, setUser]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const isAdmin = user?.email === "admincartai@cartai.com";

  /* ───────── Helpers de ruta ───────── */
  const PrivateRoute = ({ children }) =>
    user ? children : <Navigate to="/" replace />;

  const PublicRoute = ({ children }) =>
    user ? <Navigate to="/dashboard" replace /> : children;

  /* ───────── loader simple ───────── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-black">
        Cargando…
      </div>
    );
  }

  /* ───────── Rutas ───────── */
  return (
    <BrowserRouter>
      <Routes>
        {/* PÚBLICAS (solo si NO está logueado) */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <Home />
            </PublicRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        {/* ADMIN exclusiva */}
        <Route
          path="/admin"
          element={user && isAdmin ? <Admin /> : <Navigate to="/login" replace />}
        />

        {/* PRIVADAS (cualquier usuario logueado NO admin) */}
        {!isAdmin && (
          <>
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/invest"
              element={
                <PrivateRoute>
                  <Invest />
                </PrivateRoute>
              }
            />
            <Route
              path="/withdraw"
              element={
                <PrivateRoute>
                  <Withdraw />
                </PrivateRoute>
              }
            />
            <Route
              path="/referrals"
              element={
                <PrivateRoute>
                  <Referrals />
                </PrivateRoute>
              }
            />
            <Route
              path="/game"
              element={
                <PrivateRoute>
                  <Game />
                </PrivateRoute>
              }
            />
            <Route
              path="/payment"
              element={
                <PrivateRoute>
                  <PaymentQR />
                </PrivateRoute>
              }
            />
          </>
        )}

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;