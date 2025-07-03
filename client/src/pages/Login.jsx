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
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-[#0f2027] via-[#203a43] to-[#2c5364]">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 shadow-2xl text-white">

        {/* Logo centrado */}
        <div className="flex justify-center mb-6">
          <img src={logo} alt="CartAI logo" className="h-16 drop-shadow-md" />
        </div>

        <h2 className="text-3xl font-extrabold text-center mb-6">Iniciar sesión</h2>

        {errorMsg && (
          <p className="text-red-400 text-center mb-4 text-sm">{errorMsg}</p>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <input
            type="text"
            placeholder="Correo o número de teléfono"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white/20 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            required
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white/20 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            required
          />

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold text-lg hover:from-yellow-300 hover:to-yellow-500 transition"
          >
            Ingresar
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-300">
          ¿No tienes cuenta?{" "}
          <Link to="/register" className="text-yellow-300 hover:underline font-medium">
            Regístrate aquí
          </Link>
        </p>
      </div>
    </main>
  );
}
