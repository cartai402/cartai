import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { ref, onValue, update, get } from "firebase/database";

export default function Referrals() {
  const uid = auth.currentUser?.uid;
  const [miCodigo, setMiCodigo] = useState("");
  const [referidos, setReferidos] = useState([]);
  const [copiado, setCopiado] = useState(false);

  const [redeemInput, setRedeemInput] = useState("");
  const [redeemMsg, setRedeemMsg] = useState("");
  const [yaTieneReferido, setYaTieneReferido] = useState(false);

  const [promoInput, setPromoInput] = useState("");
  const [promoMsg, setPromoMsg] = useState("");

  const urlRef = `${window.location.origin}/register?ref=${miCodigo}`;

  useEffect(() => {
    if (!uid) return;
    const thisUserRef = ref(db, `usuarios/${uid}`);

    // Obtener o generar código de referido
    onValue(thisUserRef, snap => {
      const data = snap.val() || {};
      if (!data.codigoReferido) {
        const nuevo = generarCodigo(uid);
        update(thisUserRef, { codigoReferido: nuevo });
        setMiCodigo(nuevo);
      } else {
        setMiCodigo(data.codigoReferido);
      }
      if (data.referido) setYaTieneReferido(true);
    });

    // Cargar referidos
    const allRef = ref(db, "usuarios");
    onValue(allRef, snap => {
      const users = snap.val() || {};
      const lista = Object.values(users).filter(u => u.referido === miCodigo);
      setReferidos(lista.reverse());
    });
  }, [uid, miCodigo]);

  const generarCodigo = (uid) =>
    uid.slice(0, 3).toUpperCase() + Math.floor(100 + Math.random() * 900);

  const copiarLink = () => {
    navigator.clipboard.writeText(urlRef);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const compartir = (plataforma) => {
    const mensaje = encodeURIComponent(
      `Regístrate con este enlace y gana un bono: ${urlRef}`
    );

    const urls = {
      whatsapp: `https://wa.me/?text=${mensaje}`,
      telegram: `https://t.me/share/url?url=${urlRef}&text=${mensaje}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${urlRef}`,
      twitter: `https://twitter.com/intent/tweet?text=${mensaje}`,
    };

    window.open(urls[plataforma], "_blank");
  };

  const canjearReferido = async () => {
    if (yaTieneReferido) {
      setRedeemMsg("❌ Ya tienes un código asociado.");
      return;
    }

    const code = redeemInput.trim().toUpperCase();
    if (code.length < 4 || code === miCodigo) {
      setRedeemMsg("❌ Código inválido.");
      return;
    }

    const allSnap = await get(ref(db, "usuarios"));
    const allUsers = allSnap.val() || {};
    const invitadorUID = Object.keys(allUsers).find(
      k => allUsers[k].codigoReferido === code
    );
    if (!invitadorUID) {
      setRedeemMsg("❌ Código no encontrado.");
      return;
    }

    // Dar bono
    await update(ref(db, `usuarios/${uid}`), {
      referido: code,
      saldoBonos: (allUsers[uid]?.saldoBonos || 0) + 2000,
    });

    if (allUsers[invitadorUID]?.paqueteActivo) {
      await update(ref(db, `usuarios/${invitadorUID}`), {
        saldoBonos: (allUsers[invitadorUID].saldoBonos || 0) + 6000,
      });
    }

    setYaTieneReferido(true);
    setRedeemMsg("✅ Código redimido y bono acreditado.");
  };

  const canjearPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (code.length < 4) {
      setPromoMsg("❌ Código inválido.");
      return;
    }

    const codeSnap = await get(ref(db, `codigos/${code}`));
    if (!codeSnap.exists()) {
      setPromoMsg("❌ Código no existe.");
      return;
    }

    const datos = codeSnap.val();
    if (datos.usado) {
      setPromoMsg("❌ Código ya fue usado.");
      return;
    }

    const userSnap = await get(ref(db, `usuarios/${uid}`));
    const userData = userSnap.val();
    const bonoActual = userData?.saldoBonos || 0;

    await update(ref(db, `usuarios/${uid}`), {
      saldoBonos: bonoActual + (datos.valor || 0),
    });

    await update(ref(db, `codigos/${code}`), {
      usado: true,
      uid,
      fecha: Date.now(),
    });

    setPromoMsg(`✅ Bono de $${datos.valor.toLocaleString()} acreditado.`);
    setPromoInput("");
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white p-6">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Encabezado */}
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold">📨 Programa de Referidos</h1>
          <p className="text-gray-300">
            Comparte tu código, gana comisiones y canjea códigos promocionales.
          </p>
        </header>

        {/* Código propio */}
        <section className="bg-white/10 p-6 rounded-xl border border-white/20 text-center space-y-4 shadow-xl">
          <p>Tu código de referido:</p>
          <h2 className="text-3xl font-bold text-yellow-300 tracking-widest">{miCodigo}</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={copiarLink}
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 px-4 rounded-md"
            >
              {copiado ? "✅ Copiado" : "📎 Copiar link"}
            </button>
            <button onClick={() => compartir("whatsapp")} className="btnSocial">WhatsApp</button>
            <button onClick={() => compartir("telegram")} className="btnSocial">Telegram</button>
            <button onClick={() => compartir("facebook")} className="btnSocial">Facebook</button>
            <button onClick={() => compartir("twitter")} className="btnSocial">X (Twitter)</button>
          </div>
        </section>

        {/* Redimir referido */}
        {!yaTieneReferido && (
          <section className="bg-white/10 p-6 rounded-xl border border-white/20 space-y-4 shadow-lg">
            <h3 className="text-xl font-semibold">Redimir código de invitación</h3>
            <input
              value={redeemInput}
              onChange={(e) => setRedeemInput(e.target.value.toUpperCase())}
              placeholder="Código de otro usuario"
              className="w-full bg-white/20 p-3 rounded-lg uppercase"
            />
            {redeemMsg && <p className="text-sm">{redeemMsg}</p>}
            <button
              onClick={canjearReferido}
              className="w-full bg-green-500 hover:bg-green-600 font-bold py-2 rounded-lg"
            >
              Canjear código
            </button>
          </section>
        )}

        {/* Redimir código promocional */}
        <section className="bg-white/10 p-6 rounded-xl border border-white/20 space-y-4 shadow-lg">
          <h3 className="text-xl font-semibold">Canjear código promocional</h3>
          <input
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
            placeholder="Código promocional"
            className="w-full bg-white/20 p-3 rounded-lg uppercase"
          />
          {promoMsg && <p className="text-sm">{promoMsg}</p>}
          <button
            onClick={canjearPromo}
            className="w-full bg-purple-500 hover:bg-purple-600 font-bold py-2 rounded-lg"
          >
            Canjear
          </button>
        </section>

        {/* Lista de referidos */}
        <section>
          <h3 className="text-xl font-semibold mb-3">👥 Tus referidos</h3>
          {referidos.length === 0 ? (
            <p className="text-gray-400">Aún no tienes referidos.</p>
          ) : (
            <ul className="grid gap-3">
              {referidos.map((r, i) => (
                <li
                  key={i}
                  className="bg-white/10 border border-white/10 p-4 rounded-lg flex justify-between items-center"
                >
                  <span className="font-bold">{r.nombre}</span>
                  <span className="text-sm text-gray-300">
                    {r.paqueteActivo
                      ? "🟢 Paquete activo"
                      : r.iaActiva
                      ? "🟡 Solo IA"
                      : "🔴 Inactivo"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Estilos adicionales para botones sociales */}
      <style>{`
        .btnSocial {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.3);
          padding: 8px 14px;
          border-radius: 12px;
          font-weight: 600;
          color: #fff;
          transition: background 0.2s;
        }
        .btnSocial:hover {
          background: rgba(255,255,255,0.2);
        }
      `}</style>
    </main>
  );
}