import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logor.png';

const Home = () => {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#065f46] text-white flex flex-col items-center justify-center px-6 py-12">

      {/* Logo */}
      <img
        src={logo}
        alt="CartAI Logo"
        className="w-24 sm:w-28 md:w-32 mb-6 drop-shadow-lg animate-fade-in"
      />

      {/* Eslógan */}
      <h1 className="text-4xl sm:text-5xl font-extrabold text-center mb-10 animate-fade-in leading-tight">
        Juega, invierte y gana con inteligencia
      </h1>

      {/* Botones en horizontal y separados */}
      <div className="flex flex-col sm:flex-row gap-8 mb-14 animate-fade-in">
        <Link
          to="/register"
          className="px-10 py-5 text-xl sm:text-2xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 text-black rounded-xl shadow-lg hover:from-yellow-300 hover:to-yellow-500 transition duration-300"
        >
          Crear cuenta
        </Link>
        <Link
          to="/login"
          className="px-10 py-5 text-xl sm:text-2xl font-bold bg-gradient-to-r from-sky-400 to-sky-600 text-white rounded-xl shadow-lg hover:from-sky-300 hover:to-sky-500 transition duration-300"
        >
          Iniciar sesión
        </Link>
      </div>

      {/* Ventajas */}
      <section className="bg-white bg-opacity-10 backdrop-blur-md p-8 rounded-2xl max-w-3xl text-center shadow-xl animate-fade-in">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6">¿Por qué unirte a CartAI?</h2>
        <ul className="text-lg sm:text-xl space-y-4 leading-relaxed">
          <li>🎮 Juega minijuegos y domina el tablero</li>
          <li>💰 Invierte desde $10.000 y gana desde el primer día</li>
          <li>📈 Multiplica tus ganancias con referidos</li>
          <li>🏦 Retira a Nequi o Daviplata fácilmente</li>
          <li>🎖️ Sube de nivel y desbloquea beneficios exclusivos</li>
        </ul>
      </section>
    </main>
  );
};

export default Home;
