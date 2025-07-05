/* ──────────────────────────────────────
   Referrals.jsx – Bonos y Recompensas
   Fondo animado + estilo glass / 3-D
────────────────────────────────────── */
import React, { useEffect, useState } from "react";
import { getDatabase, ref, onValue, update, get, remove } from "firebase/database";
import { getAuth } from "firebase/auth";

export default function Referrals() {
  const db  = getDatabase();
  const uid = getAuth().currentUser?.uid;

  /* ─── estados ─── */
  const [miCodigo,   setMiCodigo]   = useState("");
  const [linkFull,   setLinkFull]   = useState("");
  const [referidos,  setReferidos]  = useState([]);
  const [copiado,    setCopiado]    = useState(false);

  const [yaTieneRef, setYaTieneRef] = useState(false);
  const [miInvitador,setMiInvitador]= useState(null);
  const [redeemInput,setRedeemInput]= useState("");
  const [redeemMsg,  setRedeemMsg]  = useState("");

  const [promoInput, setPromoInput] = useState("");
  const [promoMsg,   setPromoMsg]   = useState("");

  /* toast */
  const [toast, setToast] = useState("");

  /* helpers */
  const COP = n => n?.toLocaleString("es-CO") ?? "0";
  const genCode = id => id.slice(0,3).toUpperCase()+Math.floor(100+Math.random()*900);

  /* ╔══════════════╗
     ║  carga init  ║
     ╚══════════════╝ */
  useEffect(()=>{
    if(!uid) return;
    const uRef = ref(db,`usuarios/${uid}`);

    onValue(uRef, snap=>{
      const d=snap.val()||{};

      /* código propio */
      if(!d.codigoReferido){
        const nuevo=genCode(uid);
        update(uRef,{codigoReferido:nuevo});
        setMiCodigo(nuevo);
      }else setMiCodigo(d.codigoReferido);

      /* invitador */
      if(d.referido){
        setYaTieneRef(true);
        get(ref(db,"usuarios")).then(s=>{
          const all=s.val()||{};
          const invKey=Object.keys(all).find(k=>all[k].codigoReferido===d.referido);
          if(invKey) setMiInvitador(all[invKey].nombre ?? "(sin nombre)");
        });
      }

      /* notificación de bono recibido */
      if(d.notiBono){
        setToast(`🎉 ¡Recibiste $${COP(d.notiBono)} en bonos!`);
        remove(ref(db,`usuarios/${uid}/notiBono`));   // limpiamos flag
        setTimeout(()=>setToast(""),3500);
      }

      /* link */
      setLinkFull(`${window.location.origin}/register?ref=${d.codigoReferido ?? ""}`);
    });

    /* lista de referidos */
    const allRef = ref(db,"usuarios");
    onValue(allRef,snap=>{
      const users=snap.val()||{};
      const lista=Object.values(users).filter(u=>u.referido===miCodigo);
      setReferidos(lista.reverse());
    });
  },[uid,miCodigo]);

  /* ╔════════════════════╗
     ║  acciones botones  ║
     ╚════════════════════╝ */
  const copiar = ()=>{
    navigator.clipboard.writeText(linkFull);
    setCopiado(true);
    setTimeout(()=>setCopiado(false),2000);
  };

  /* canjear código invitador */
  const canjearInvitador = async ()=>{
    if(yaTieneRef) return;
    const code=redeemInput.trim().toUpperCase();
    if(code.length<4 || code===miCodigo) return setRedeemMsg("❌ Código inválido.");

    const allSnap=await get(ref(db,"usuarios"));
    const all=allSnap.val()||{};
    const inviter=Object.keys(all).find(k=>all[k].codigoReferido===code);
    if(!inviter) return setRedeemMsg("❌ No encontrado.");

    /* bonos: 2 000 invitado, 4 000 invitador */
    await update(ref(db,`usuarios/${uid}`),{
      referido:code,
      saldoBonos:(all[uid]?.saldoBonos||0)+2000
    });
    await update(ref(db,`usuarios/${inviter}`),{
      saldoBonos:(all[inviter]?.saldoBonos||0)+4000,
      notiBono:  4000   // flag para toast en su panel
    });

    setYaTieneRef(true);
    setMiInvitador(all[inviter].nombre ?? "(sin nombre)");
    setRedeemMsg("🎉 ¡Felicidades! Canjeaste $2 000 COP de bono.");
    setToast("🎉 ¡Felicidades! Canjeaste $2 000 COP de bono.");
    setTimeout(()=>setToast(""),3500);
  };

  /* canjear código promo */
  const canjearPromo = async ()=>{
    const code=promoInput.trim().toUpperCase();
    if(code.length<4) return setPromoMsg("❌ Código inválido.");
    const snap=await get(ref(db,`promoCodes/${code}`));
    if(!snap.exists()) return setPromoMsg("❌ No existe.");
    const d=snap.val();
    if(d.usado)  return setPromoMsg("❌ Ya usado.");
    if(d.expira<Date.now()) return setPromoMsg("❌ Expirado.");

    const bonoAct=(await get(ref(db,`usuarios/${uid}/saldoBonos`))).val()||0;
    await update(ref(db,`usuarios/${uid}`),{ saldoBonos:bonoAct+(d.valor||0) });
    await update(ref(db,`promoCodes/${code}`),{ usado:true,uid });

    setPromoMsg(`🎉 ¡Felicidades! Canjeaste $${COP(d.valor)} a tus bonos.`);
    setToast(`🎉 ¡Felicidades! Canjeaste $${COP(d.valor)} a tus bonos.`);
    setPromoInput("");
    setTimeout(()=>setToast(""),3500);
  };

  /* ╔══════════╗
     ║   UI     ║
     ╚══════════╝ */
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#141e30] to-[#243b55] text-white p-6">
      {/* toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-600 px-6 py-3 rounded-xl shadow-xl animate-toast z-50">
          {toast}
        </div>
      )}

      <div className="max-w-3xl mx-auto space-y-10">
        {/* header */}
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold">🎁 Bonos y Recompensas</h1>
          <p className="text-gray-300">Comparte tu enlace, canjea códigos y gana más.</p>
        </header>

        {/* mi código */}
        <section className="glass-card text-center space-y-4">
          <p>Tu código:</p>
          <h2 className="text-2xl font-extrabold text-yellow-300">{miCodigo}</h2>

          <div className="flex flex-wrap justify-center gap-3">
            <button onClick={copiar} className="btn3d-gold">
              {copiado ? "✅ Copiado" : "📋 Copiar enlace"}
            </button>

            <a
              href={`https://wa.me/?text=${encodeURIComponent("Recibe $2.000 COP en CartAI al registrarte 👉 "+linkFull)}`}
              target="_blank" rel="noreferrer" className="btn3d-green"
            >🟢 WhatsApp</a>

            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(linkFull)}&text=${encodeURIComponent("Recibe $2.000 COP en CartAI al registrarte")}`}
              target="_blank" rel="noreferrer" className="btn3d-cyan"
            >🔵 Telegram</a>

            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(linkFull)}`}
              target="_blank" rel="noreferrer" className="btn3d-blue"
            >🔵 Facebook</a>

            <a
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(linkFull)}&text=${encodeURIComponent("Recibe $2.000 COP en CartAI al registrarte")}`}
              target="_blank" rel="noreferrer" className="btn3d-gray"
            >⚫ X</a>
          </div>
        </section>

        {/* invitador */}
        {yaTieneRef ? (
          <section className="glass-card text-center">
            <p>Te invitó:</p>
            <h3 className="text-xl font-bold text-green-400">{miInvitador}</h3>
          </section>
        ) : (
          <section className="glass-card space-y-4">
            <h3 className="text-xl font-semibold">Canjear código de invitador</h3>
            <input
              value={redeemInput}
              onChange={e=>setRedeemInput(e.target.value.toUpperCase())}
              placeholder="Código invitador"
              className="inputGlass uppercase"
            />
            {redeemMsg && <p className="text-sm">{redeemMsg}</p>}
            <button onClick={canjearInvitador} className="btn3d-green w-full">
              Canjear invitación
            </button>
          </section>
        )}

        {/* promo */}
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

        {/* lista referidos */}
        <section>
          <h3 className="text-xl font-semibold mb-3">Tus referidos</h3>
          {referidos.length===0
            ? <p className="text-gray-400">Aún sin referidos.</p>
            : (
              <ul className="space-y-3">
                {referidos.map((r,i)=>(
                  <li key={i} className="glass-row flex justify-between">
                    <span className="font-bold">{r.nombre ?? "Sin nombre"}</span>
                    <span className="text-sm">
                      {r.paquetes ? "🟢 Activo"
                        : r.iaActiva ? "🟡 Solo IA"
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

/* ╔══════════════════════════════╗
   ║  estilos utilitarios (CSS)   ║
   ╚══════════════════════════════╝ */
const css=`
@keyframes toastIn{0%{transform:scale(.85);opacity:0}100%{transform:scale(1);opacity:1}}
.animate-toast{animation:toastIn .25s ease-out;}
.glass-card{backdrop-filter:blur(10px);background:rgba(255,255,255,.05);border-radius:20px;padding:24px;box-shadow:0 8px 18px #000a;}
.glass-row{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);padding:16px;border-radius:14px;}
.inputGlass{width:100%;background:rgba(255,255,255,.15);padding:12px;border-radius:10px;}
.btn3d-gold{@apply text-black font-bold py-2 px-4 rounded-lg transition shadow-lg bg-yellow-400 hover:bg-yellow-500 active:scale-95;}
.btn3d-green{@apply text-white font-bold py-2 px-4 rounded-lg transition shadow-lg bg-green-500  hover:bg-green-600  active:scale-95;}
.btn3d-cyan{@apply  text-white font-bold py-2 px-4 rounded-lg transition shadow-lg bg-cyan-500   hover:bg-cyan-600   active:scale-95;}
.btn3d-blue{@apply  text-white font-bold py-2 px-4 rounded-lg transition shadow-lg bg-blue-500   hover:bg-blue-600   active:scale-95;}
.btn3d-purple{@apply text-white font-bold py-2 px-4 rounded-lg transition shadow-lg bg-purple-500 hover:bg-purple-600 active:scale-95;}
.btn3d-gray{@apply text-white font-bold py-2 px-4 rounded-lg transition shadow-lg bg-gray-700 hover:bg-gray-800 active:scale-95;}
`;
if(typeof document!=="undefined" && !document.getElementById("refCss")){
  const style=document.createElement("style");
  style.id="refCss";
  style.innerHTML=css.replace(/@apply[^;]+;/g,"");
  document.head.appendChild(style);
}