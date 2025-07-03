import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { auth } from "../firebase";
import logo from "../assets/logor.png";

export default function Login() {
  const [userInput, setUserInput] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    const phoneRegex = /^[0-9]{10,}$/;
    const email = phoneRegex.test(userInput)
      ? `${userInput}@cartai.com`
      : userInput;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate(email === "admincartai@cartai.com" ? "/admin" : "/dashboard");
    } catch (err) {
      setErrorMsg("❌ Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#111827] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 shadow-2xl hover:scale-[1.02] transition-transform duration-300">

        {/* Logo */}
        <div className="flex justify-center mb-6 animate-fade-in">
          <img src={logo} alt="CartAI Logo" className="h-16 drop-shadow-xl" />
        </div>

        <h2 className="text-3xl font-extrabold text-center text-white mb-6 animate-fade-in">
          Iniciar sesión
        </h2>

        {errorMsg && (
          <p className="text-red-400 text-center mb-4 text-sm animate-pulse">{errorMsg}</p>
        )}

        <form onSubmit={handleLogin} className="space-y-5 animate-fade-in">
          <input
            type="text"
            placeholder="Correo o número de teléfono"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/20 placeholder-gray-300 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            required
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/20 placeholder-gray-300 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold text-lg hover:from-yellow-300 hover:to-yellow-500 transition duration-300 shadow-lg"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-300 animate-fade-in">
          ¿No tienes cuenta?{" "}
          <Link to="/register" className="text-yellow-300 hover:underline font-semibold">
            Regístrate aquí
          </Link>
        </p>
      </div>
    </main>
  );
}