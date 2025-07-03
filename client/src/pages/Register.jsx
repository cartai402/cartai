import { useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { ref, set, get, update, child } from "firebase/database";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { auth, db } from "../firebase";

const Register = () => {
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    telefono: "",
    password: "",
    invitacion: "",
  });

  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { search } = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const refCode = params.get("ref");
    if (refCode) {
      setForm((prev) => ({ ...prev, invitacion: refCode }));
    }
  }, [search]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const { nombre, email, telefono, password, invitacion } = form;

    if (!nombre || !email || !telefono || !password) {
      setError("Por favor completa todos los campos.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;
      const uid = user.uid;
      const now = new Date().toISOString();

      await updateProfile(user, {
        displayName: `${nombre}|${telefono}|${invitacion || "N/A"}`,
      });

      // Crear datos del nuevo usuario
      await set(ref(db, `usuarios/${uid}`), {
        nombre,
        email,
        telefono,
        referidoPor: invitacion || null,
        registrado: now,
        paqueteActivo: false,
        saldoInversion: 0,
        saldoJuego: 0,
        bonoIA: 0,
        bonoReferido: 0,
        retiradoTotal: 0,
        movimientos: [],
      });

      // Guardar UID como código de referido para compartir
      await set(ref(db, `referidos/${uid}`), uid);

      // Si tiene código de invitación y el UID existe en /referidos
      if (invitacion) {
        const refSnapshot = await get(child(ref(db), `referidos/${invitacion}`));
        if (refSnapshot.exists()) {
          const referidorUID = refSnapshot.val();
          const referidorSnap = await get(ref(db, `usuarios/${referidorUID}`));

          if (referidorSnap.exists()) {
            const referidor = referidorSnap.val();

            if (referidor.paqueteActivo) {
              // Bonos: 2000 COP al invitado, 6000 COP al referidor
              await update(ref(db, `usuarios/${uid}`), {
                bonoReferido: 2000,
              });

              await update(ref(db, `usuarios/${referidorUID}`), {
                bonoReferido: (referidor.bonoReferido || 0) + 6000,
              });
            }
          }
        }
      }

      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Ocurrió un error. Verifica los datos o intenta más tarde.");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-tr from-[#0f2027] via-[#203a43] to-[#2c5364] flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-10 shadow-xl text-white">
        <h2 className="text-3xl font-extrabold text-center mb-8">Crear cuenta</h2>

        {error && (
          <p className="bg-red-600 text-white text-sm text-center py-2 px-4 rounded mb-6 font-semibold">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm mb-1 block text-gray-300">Nombre completo</label>
            <input
              name="nombre"
              type="text"
              value={form.nombre}
              onChange={handleChange}
              className="w-full bg-white/20 px-4 py-3 rounded-lg text-white placeholder-gray-300 focus:ring-2 focus:ring-yellow-400"
              placeholder="Tu nombre"
            />
          </div>

          <div>
            <label className="text-sm mb-1 block text-gray-300">Correo electrónico</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className="w-full bg-white/20 px-4 py-3 rounded-lg text-white placeholder-gray-300 focus:ring-2 focus:ring-yellow-400"
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div>
            <label className="text-sm mb-1 block text-gray-300">Número de teléfono</label>
            <input
              name="telefono"
              type="tel"
              value={form.telefono}
              onChange={handleChange}
              className="w-full bg-white/20 px-4 py-3 rounded-lg text-white placeholder-gray-300 focus:ring-2 focus:ring-yellow-400"
              placeholder="300 123 4567"
            />
          </div>

          <div>
            <label className="text-sm mb-1 block text-gray-300">Contraseña</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              className="w-full bg-white/20 px-4 py-3 rounded-lg text-white placeholder-gray-300 focus:ring-2 focus:ring-yellow-400"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="text-sm mb-1 block text-gray-300">Código de invitación (opcional)</label>
            <input
              name="invitacion"
              type="text"
              value={form.invitacion}
              onChange={handleChange}
              className="w-full bg-white/20 px-4 py-3 rounded-lg text-white placeholder-gray-300 focus:ring-2 focus:ring-yellow-400"
              placeholder="Ej: 5KJFD2..."
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-lg rounded-xl transition"
          >
            Registrarse
          </button>
        </form>

        <p className="text-center mt-6 text-sm">
          ¿Ya tienes una cuenta?{" "}
          <Link to="/login" className="text-yellow-300 hover:underline font-medium">
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
};

export default Register;
