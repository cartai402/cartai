import { Link } from "react-router-dom";
import logo from "../assets/logor.png"; // Asegúrate de que este archivo exista

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-white px-6"
      style={{ background: "linear-gradient(135deg,#1e1e2f,#2e2e4e)" }}
    >
      <img src={logo} alt="Logo" className="w-16 h-16 mb-6" />

      <h1 className="text-6xl font-extrabold mb-4">404</h1>
      <p className="text-lg mb-6 text-gray-300">
        Lo sentimos, la página que estás buscando no existe.
      </p>

      <Link
        to="/"
        className="bg-yellow-400 text-black font-bold px-6 py-3 rounded-full hover:bg-yellow-500 transition"
      >
        ⬅ Volver al inicio
      </Link>
    </main>
  );
}