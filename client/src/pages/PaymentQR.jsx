import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { ref, update } from "firebase/database";

export default function PaymentQR() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [refPago, setRefPago] = useState("");
  const [paquete, setPaquete] = useState(null);
  const [pagoId, setPagoId] = useState(null);

  useEffect(() => {
    if (!state?.paquete || !state?.pagoId) {
      navigate("/invest");
    } else {
      setPaquete(state.paquete);
      setPagoId(state.pagoId);
    }
  }, [state, navigate]);

  if (!paquete || !pagoId) return null;

  const { nombre, inversion } = paquete;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const uid = auth.currentUser.uid;

    await update(ref(db, `pagosPendientes/${uid}/${pagoId}`), {
      referencia: refPago.trim(),
      estado: "enRevision",
    });

    alert("✅ Recibimos tu referencia. La confirmación tarda unos 5 minutos.");
    navigate("/dashboard");
  };

  const descargarQR = () => {
    const link = document.createElement("a");
    link.href = "/qr.png"; // Asegúrate de tener /public/qr.png
    link.download = "cartai_qr.png";
    link.click();
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "linear-gradient(135deg,#A200FF 0%,#FF0066 100%)" }}
    >
      <div className="w-full max-w-md bg-white/10 backdrop-blur-lg text-white p-8 rounded-2xl shadow-2xl space-y-6 border border-white/20">
        <h1 className="text-3xl font-bold text-center">Pago del Paquete</h1>

        <section className="bg-black/30 p-4 rounded-lg space-y-1 text-sm">
          <p>
            <span className="font-semibold">🧾 Paquete:</span> {nombre}
          </p>
          <p>
            <span className="font-semibold">💰 Monto:</span> ${inversion.toLocaleString()} COP
          </p>
          <p className="text-gray-300">⏳ Procesamos tu activación en unos 5 minutos.</p>
        </section>

        <div className="text-center">
          <img
            src="/qr.png"
            alt="QR Nequi CartAI"
            className="w-64 h-64 mx-auto border-4 border-white/20 rounded-lg"
          />
          <button
            onClick={descargarQR}
            className="mt-3 bg-white text-fuchsia-700 font-bold py-2 px-6 rounded-full hover:bg-fuchsia-100 transition"
          >
            📥 Descargar QR
          </button>
        </div>

        <div className="bg-black/30 p-4 rounded-lg space-y-2 text-sm">
          <h2 className="font-semibold text-fuchsia-300 mb-2">Pasos para pagar con Nequi</h2>
          <ol className="list-decimal list-inside space-y-1">
            <li>Abre la app Nequi y selecciona <strong>“Escanear”</strong>.</li>
            <li>Elige <em>“Desde galería”</em> y selecciona el QR descargado.</li>
            <li>Paga exactamente <strong>${inversion.toLocaleString()}</strong>.</li>
            <li>Copia la <strong>referencia</strong> que te da Nequi al completar el pago.</li>
            <li>Ingresa la referencia aquí y presiona enviar.</li>
          </ol>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={refPago}
            onChange={(e) => setRefPago(e.target.value)}
            required
            placeholder="Referencia Nequi (ej: M123456)"
            className="w-full bg-white/20 p-3 rounded-lg placeholder-gray-300 text-white focus:ring-2 focus:ring-fuchsia-400 outline-none"
          />
          <button
            type="submit"
            className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold py-3 rounded-lg transition"
          >
            Enviar referencia
          </button>
        </form>

        <button
          onClick={() => navigate("/dashboard")}
          className="block mx-auto text-xs text-fuchsia-200 hover:underline"
        >
          ← Volver al Dashboard
        </button>
      </div>
    </main>
  );
}
