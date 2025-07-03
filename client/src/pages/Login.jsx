import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { auth } from "../firebase";
import logo from "../assets/logor.png";

export default function Login() {
  const [userInput, setUserInput] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const phoneRegex = /^[0-9]{10,}$/;
    const email = phoneRegex.test(userInput)
      ? `${userInput}@cartai.com`
      : userInput;

    try {
      await signInWithEmailAndPassword(auth, email, password);

      if (email === "admincartai@cartai.com") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setErrorMsg("❌ Credenciales incorrectas");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#111827]">
      <div className="w-full max-w-md bg-[#1f2a3a] border border-white/20 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] p-8 text-white animate-fade-in">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src={logo}
            alt="CartAI logo"
            className="h-20 drop-shadow-xl animate-bounce"
          />
        </div>

        <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-8">
          Bienvenido de nuevo
        </h2>

        {errorMsg && (
          <p className="text-red-400 text-center mb-4 text-sm animate-pulse">{errorMsg}</p>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <input
            type="text"
            placeholder="Correo o número de teléfono"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            className="w-full px-5 py-3 rounded-xl bg-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition duration-200"
            required
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-5 py-3 rounded-xl bg-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition duration-200"
            required
          />

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold text-lg hover:from-yellow-300 hover:to-yellow-500 shadow-xl hover:scale-105 transition-transform duration-300"
          >
            Ingresar
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-300">
          ¿No tienes cuenta?{" "}
          <Link
            to="/register"
            className="text-yellow-300 hover:underline font-medium"
          >
            Regístrate aquí
          </Link>
        </p>
      </div>
    </main>
  );
}