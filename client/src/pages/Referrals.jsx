import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { ref, onValue, update, get } from "firebase/database";

export default function Referrals() {
  const uid = auth.currentUser?.uid;

  /* ───────── estados ───────── */
  const [miCodigo, setMiCodigo] = useState("");
  const [referidos, setReferidos] = useState([]);
  const [copiado, setCopiado] = useState(false);

  const [redeemInput, setRedeemInput] = useState("");
  const [redeemMsg, setRedeemMsg]   = useState("");
  const [yaTieneReferido, setYaTieneReferido] = useState(false);

  // códigos promo
  const [promoInput, setPromoInput] = useState("");
  const [promoMsg, setPromoMsg] = useState("");

  /* ───────── carga inicial ───────── */
  useEffect(() => {
    if (!uid) return;

    const thisUserRef = ref(db, `usuarios/${uid}`);

    // Obtener/generar mi código y sabersi ya tengo referente
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

    // cargar mis referidos
    const allRef = ref(db, "usuarios");
    onValue(allRef, snap => {
      const users = snap.val() || {};
      const lista = Object.values(users).filter(
        u => u.referido === miCodigo
      );
      setReferidos(lista.reverse());
    });
  }, [uid, miCodigo]);

  /* ───────── helpers ───────── */
  const generarCodigo = (uid) =>
    uid.slice(0, 3).toUpperCase() + Math.floor(100 + Math.random() * 900);

  const copiarLink = () => {
    navigator.clipboard.writeText(
      `${window.location.origin}/register?ref=${miCodigo}`
    );
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  /* ───────── redimir código de invitador ───────── */
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

    // dar bonos: 2 000 al invitado, 6 000 al invitador (si paquete activo)
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
    setRedeemMsg("✅ Código redimido y bonos acreditados.");
  };

  /* ───────── redimir código PROMO ───────── */
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
      setPromoMsg("❌ Código ya fue utilizado.");
      return;
    }

    // acreditar bono
    await update(ref(db, `usuarios/${uid}`), {
      saldoBonos: (datos.valor || 0) + (await (await get(ref(db, `usuarios/${uid}`))).val()).saldoBonos || 0,
    });
    // marcar usado
    await update(ref(db, `codigos/${code}`), {
      usado: true,
      uid,
    });

    setPromoMsg(`✅ Bono de $${datos.valor.toLocaleString()} acreditado.`);
    setPromoInput("");
  };

  /* ────────── UI ────────── */
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#141e30] to-[#243b55] text-white p-6">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* ENCABEZADO */}
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Programa de Referidos 📨</h1>
          <p className="text-gray-300">
            Comparte tu enlace, gana comisiones y canjea códigos promocionales.
          </p>
        </header>

        {/* MI CÓDIGO */}
        <section className="bg-white/10 p-6 rounded-xl border border-white/20 text-center space-y-4 shadow-lg">
          <p>Tu código de referido:</p>
          <h2 className="text-2xl font-bold text-yellow-300">{miCodigo}</h2>
          <button
            onClick={copiarLink}
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 px-6 rounded-md"
          >
            {copiado ? "✅ Copiado" : "📎 Copiar enlace"}
          </button>
        </section>

        {/* REDIMIR CÓDIGO DE INVITACIÓN */}
        {!yaTieneReferido && (
          <section className="bg-white/10 p-6 rounded-xl border border-white/20 space-y-4 shadow-lg">
            <h3 className="text-xl font-semibold">Redimir código de invitación</h3>
            <input
              value={redeemInput}
              onChange={e => setRedeemInput(e.target.value.toUpperCase())}
              placeholder="Código de invitación"
              className="w-full bg-white/20 p-3 rounded-lg uppercase"
            />
            {redeemMsg && <p className="text-sm">{redeemMsg}</p>}
            <button
              onClick={canjearReferido}
              className="w-full bg-green-500 hover:bg-green-600 font-bold py-2 rounded-lg"
            >
              Redimir
            </button>
          </section>
        )}

        {/* REDIMIR CÓDIGO PROMOCIONAL */}
        <section className="bg-white/10 p-6 rounded-xl border border-white/20 space-y-4 shadow-lg">
          <h3 className="text-xl font-semibold">Canjear código promocional</h3>
          <input
            value={promoInput}
            onChange={e => setPromoInput(e.target.value.toUpperCase())}
            placeholder="Código promo"
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

        {/* LISTA DE REFERIDOS */}
        <section className="space-y-4">
          <h3 className="text-xl font-semibold">Tus referidos</h3>
          {referidos.length === 0 ? (
            <p className="text-gray-400">Aún sin referidos.</p>
          ) : (
            <ul className="space-y-3">
              {referidos.map((r, i) => (
                <li
                  key={i}
                  className="bg-white/10 border border-white/10 p-4 rounded-lg flex justify-between"
                >
                  <span className="font-bold">{r.nombre}</span>
                  <span className="text-sm text-gray-400">
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
    </main>
  );
}


