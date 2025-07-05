import React, { useEffect, useState } from "react";
import { getDatabase, ref, onValue, update, get } from "firebase/database";
import { getAuth } from "firebase/auth";

export default function Referrals() {
  const db   = getDatabase();
  const uid  = getAuth().currentUser?.uid;

  /* ---------------- estados ---------------- */
  const [miCodigo,       setMiCodigo]       = useState("");
  const [linkFull,       setLinkFull]       = useState("");
  const [referidos,      setReferidos]      = useState([]);
  const [copiado,        setCopiado]        = useState(false);

  const [redeemInput,    setRedeemInput]    = useState("");
  const [redeemMsg,      setRedeemMsg]      = useState("");
  const [yaTieneRef,     setYaTieneRef]     = useState(false);

  /* promo */
  const [promoInput,     setPromoInput]     = useState("");
  const [promoMsg,       setPromoMsg]       = useState("");

  /* ---------------- helpers ---------------- */
  const genCode = (id) => id.slice(0,3).toUpperCase() + Math.floor(100+Math.random()*900);
  const COP = (n)=>n?.toLocaleString("es-CO") ?? "0";

  /* ---------------- carga inicial ---------------- */
  useEffect(() => {
    if (!uid) return;
    const userRef = ref(db, `usuarios/${uid}`);

    /* mi código y si ya tengo referente */
    onValue(userRef, snap => {
      const d = snap.val() || {};
      if (!d.codigoReferido) {
        const nuevo = genCode(uid);
        update(userRef, { codigoReferido: nuevo });
        setMiCodigo(nuevo);
      } else setMiCodigo(d.codigoReferido);
      if (d.referido) setYaTieneRef(true);
      setLinkFull(`${window.location.origin}/register?ref=${d.codigoReferido ?? ""}`);
    });

    /* lista de mis referidos */
    const all = ref(db, "usuarios");
    onValue(all, snap=>{
      const users=snap.val()||{};
      const lista = Object.values(users).filter(u=>u.referido===miCodigo);
      setReferidos(lista.reverse());
    });
  }, [uid, miCodigo]);

  /* ---------------- acciones ---------------- */
  const copiar = ()=>{
    navigator.clipboard.writeText(linkFull);
    setCopiado(true);
    setTimeout(()=>setCopiado(false),2000);
  };

  const canjearReferido = async ()=>{
    if (yaTieneRef) return setRedeemMsg("❌ Ya registraste un código.");
    const code = redeemInput.trim().toUpperCase();
    if(code.length<4||code===miCodigo) return setRedeemMsg("❌ Código inválido.");

    const allSnap = await get(ref(db,"usuarios"));
    const users=allSnap.val()||{};
    const invitadorUID = Object.keys(users).find(k=>users[k].codigoReferido===code);
    if(!invitadorUID) return setRedeemMsg("❌ Código no encontrado.");

    /* bonos: 2 k invitado – 6 k invitador si tiene paquete activo */
    await update(ref(db,`usuarios/${uid}`),{
      referido:code,
      saldoBonos:(users[uid]?.saldoBonos||0)+2000
    });
    if(users[invitadorUID]?.paquetes)
      await update(ref(db,`usuarios/${invitadorUID}`),{
        saldoBonos:(users[invitadorUID].saldoBonos||0)+6000
      });
    setYaTieneRef(true);
    setRedeemMsg("✅ Código aplicado y bonos acreditados.");
  };

  const canjearPromo = async ()=>{
    const code = promoInput.trim().toUpperCase();
    if(code.length<4) return setPromoMsg("❌ Código inválido.");

    const snap = await get(ref(db,`promoCodes/${code}`));
    if(!snap.exists())  return setPromoMsg("❌ Código no existe.");
    const dato=snap.val();
    if(dato.usado)      return setPromoMsg("❌ Código ya utilizado.");
    if(dato.expira < Date.now()) return setPromoMsg("❌ Código expirado.");

    /* acreditar bono */
    const bonoAct = (await get(ref(db,`usuarios/${uid}/saldoBonos`))).val() || 0;
    await update(ref(db,`usuarios/${uid}`),{ saldoBonos: bonoAct + (dato.valor||0) });
    /* marcar usado */
    await update(ref(db,`promoCodes/${code}`),{ usado:true, uid });

    setPromoMsg(`✅ Bono de $${COP(dato.valor)} acreditado.`);
    setPromoInput("");
  };

  /* ---------------- UI ---------------- */
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#141e30] to-[#243b55] text-white p-6">
      <div className="max-w-3xl mx-auto space-y-10">

        {/* HEADER */}
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold">🎁 Bonos y Recompensas</h1>
          <p className="text-gray-300">Invita amigos y canjea códigos especiales.</p>
        </header>

        {/* MI CÓDIGO + COMPARTIR */}
        <section className="bg-white/10 p-6 rounded-xl border border-white/20 space-y-4 shadow-lg text-center">
          <p>Tu código:</p>
          <h2 className="text-2xl font-extrabold text-yellow-300">{miCodigo}</h2>

          <div className="flex flex-wrap justify-center gap-3">
            {/* copiar */}
            <button onClick={copiar} className="btn3d-gold">
              {copiado ? "✅ Copiado" : "📋 Copiar enlace"}
            </button>
            {/* whatsapp */}
            <a
              href={`https://wa.me/?text=${encodeURIComponent("Únete a CartAI y gana bonos diarios: " + linkFull)}`}
              target="_blank" rel="noreferrer"
              className="btn3d-green"
            >WhatsApp</a>
            {/* telegram */}
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(linkFull)}&text=${encodeURIComponent("¡Gana bonos diarios en CartAI! 🚀")}`}
              target="_blank" rel="noreferrer"
              className="btn3d-cyan"
            >Telegram</a>
            {/* facebook */}
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(linkFull)}`}
              target="_blank" rel="noreferrer"
              className="btn3d-blue"
            >Facebook</a>
          </div>
        </section>

        {/* CANJEAR CÓDIGO DE INVITADOR */}
        {!yaTieneRef && (
          <section className="glass-card space-y-4">
            <h3 className="text-xl font-semibold">Canjear código de invitador</h3>
            <input
              value={redeemInput}
              onChange={e=>setRedeemInput(e.target.value.toUpperCase())}
              placeholder="Código invitador"
              className="inputGlass uppercase"
            />
            {redeemMsg && <p className="text-sm">{redeemMsg}</p>}
            <button onClick={canjearReferido} className="btn3d-green w-full">
              Canjear invitación
            </button>
          </section>
        )}

        {/* CANJEAR CÓDIGO PROMO */}
        <section className="glass-card space-y-4">
          <h3 className="text-xl font-semibold">Canjear código promocional</h3>
          <input
            value={promoInput}
            onChange={e=>setPromoInput(e.target.value.toUpperCase())}
            placeholder="Código promo"
            className="inputGlass uppercase"
          />
          {promoMsg && <p className="text-sm">{promoMsg}</p>}
          <button onClick={canjearPromo} className="btn3d-purple w-full">
            Canjear bono
          </button>
        </section>

        {/* LISTA REFERIDOS */}
        <section>
          <h3 className="text-xl font-semibold mb-3">Tus referidos</h3>
          {referidos.length === 0 ? (
            <p className="text-gray-400">Aún sin referidos.</p>
          ) : (
            <ul className="space-y-3">
              {referidos.map((r,i)=>(
                <li key={i} className="glass-row flex justify-between">
                  <span className="font-bold">{r.nombre ?? "Sin nombre"}</span>
                  <span className="text-sm">
                    {r.paquetes ? "🟢 Activo" : r.iaActiva ? "🟡 Solo IA" : "🔴 Inactivo"}
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

/* ------------- clases utilitarias ------------- */
/* Puedes moverlas a tu CSS global si prefieres */
const css = `
.btn3d-gold   {@apply bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 px-4 rounded-lg shadow-lg active:scale-95 transition;}
.btn3d-green  {@apply bg-green-500  hover:bg-green-600  text-white font-bold py-2 px-4 rounded-lg shadow-lg active:scale-95 transition;}
.btn3d-cyan   {@apply bg-cyan-500   hover:bg-cyan-600   text-white font-bold py-2 px-4 rounded-lg shadow-lg active:scale-95 transition;}
.btn3d-blue   {@apply bg-blue-500   hover:bg-blue-600   text-white font-bold py-2 px-4 rounded-lg shadow-lg active:scale-95 transition;}
.btn3d-purple {@apply bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg active:scale-95 transition;}

.glass-card {@apply bg-white/10 p-6 rounded-xl border border-white/20 shadow-lg;}
.inputGlass {@apply w-full bg-white/20 p-3 rounded-lg;}
.glass-row  {@apply bg-white/10 border border-white/10 p-4 rounded-lg;}
`;

/* ------------- inyectamos estilos en línea ------------- */
if (typeof document !== "undefined" && !document.getElementById("referralCss")) {
  const style = document.createElement("style");
  style.id = "referralCss";
  style.innerHTML = css.replace(/@apply[^;]+;/g,""); // quita tailwind @apply si no usas TW
  document.head.appendChild(style);
}