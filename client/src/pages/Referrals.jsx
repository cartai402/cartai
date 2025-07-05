/* ──────────────────────────────────────
   Referrals.jsx – Bonos y Recompensas
   Mantiene estilo glass / 3-D
────────────────────────────────────── */
import React, { useEffect, useState } from "react";
import { getDatabase, ref, onValue, update, get } from "firebase/database";
import { getAuth } from "firebase/auth";

export default function Referrals() {
  const db   = getDatabase();
  const uid  = getAuth().currentUser?.uid;

  const [miCodigo,   setMiCodigo]   = useState("");
  const [linkFull,   setLinkFull]   = useState("");
  const [referidos,  setReferidos]  = useState([]);
  const [copiado,    setCopiado]    = useState(false);

  /* Invitador */
  const [yaTieneRef,     setYaTieneRef] = useState(false);
  const [miInvitador,    setMiInvitador]= useState(null);
  const [redeemInput,    setRedeemInput]= useState("");
  const [redeemMsg,      setRedeemMsg]  = useState("");

  /* Promo */
  const [promoInput, setPromoInput] = useState("");
  const [promoMsg,   setPromoMsg]   = useState("");

  const COP = n=>n?.toLocaleString("es-CO") ?? "0";
  const genCode = id => id.slice(0,3).toUpperCase()+Math.floor(100+Math.random()*900);

  /* ============ carga inicial ============ */
  useEffect(()=>{
    if(!uid) return;
    const uRef = ref(db,`usuarios/${uid}`);

    // info del usuario
    onValue(uRef, snap=>{
      const d=snap.val()||{};
      if(!d.codigoReferido){
        const nuevo=genCode(uid);
        update(uRef,{codigoReferido:nuevo});
        setMiCodigo(nuevo);
      }else setMiCodigo(d.codigoReferido);

      if(d.referido){
        setYaTieneRef(true);
        // buscamos quién es el invitador
        get(ref(db,"usuarios")).then(s=>{
          const all=s.val()||{};
          const invKey = Object.keys(all).find(k=>all[k].codigoReferido===d.referido);
          if(invKey) setMiInvitador(all[invKey].nombre ?? "(sin nombre)");
        });
      }
      setLinkFull(`${window.location.origin}/register?ref=${d.codigoReferido ?? ""}`);
    });

    // listado referidos (gente que YO invité)
    const allRef = ref(db,"usuarios");
    onValue(allRef, snap=>{
      const users=snap.val()||{};
      const lista = Object.values(users).filter(u=>u.referido===miCodigo);
      setReferidos(lista.reverse());
    });
  },[uid, miCodigo]);

  /* ============ acciones ============ */
  const copiar = ()=>{
    navigator.clipboard.writeText(linkFull);
    setCopiado(true);
    setTimeout(()=>setCopiado(false),2000);
  };

  // canjear código de invitador (solo si aún no tiene)
  const canjearInvitador = async ()=>{
    if(yaTieneRef) return;
    const code = redeemInput.trim().toUpperCase();
    if(code.length<4 || code===miCodigo) return setRedeemMsg("❌ Código inválido.");

    const allSnap = await get(ref(db,"usuarios"));
    const all     = allSnap.val()||{};
    const inviter = Object.keys(all).find(k=>all[k].codigoReferido===code);
    if(!inviter)  return setRedeemMsg("❌ No encontrado.");

    // bonos: 2 k al invitado, 6 k al invitador (si tiene paquetes)
    await update(ref(db,`usuarios/${uid}`),{
      referido: code,
      saldoBonos: (all[uid]?.saldoBonos||0)+2000
    });
    if(all[inviter]?.paquetes)
      await update(ref(db,`usuarios/${inviter}`),{
        saldoBonos:(all[inviter].saldoBonos||0)+6000
      });

    setYaTieneRef(true);
    setMiInvitador(all[inviter].nombre ?? "(sin nombre)");
    setRedeemMsg("✅ Bonos acreditados.");
  };

  // canjear código PROMO
  const canjearPromo = async ()=>{
    const code=promoInput.trim().toUpperCase();
    if(code.length<4) return setPromoMsg("❌ Código inválido.");
    const snap = await get(ref(db,`promoCodes/${code}`));
    if(!snap.exists()) return setPromoMsg("❌ No existe.");
    const d = snap.val();
    if(d.usado)  return setPromoMsg("❌ Ya usado.");
    if(d.expira < Date.now()) return setPromoMsg("❌ Expirado.");

    const bonoAct = (await get(ref(db,`usuarios/${uid}/saldoBonos`))).val()||0;
    await update(ref(db,`usuarios/${uid}`),{ saldoBonos: bonoAct + (d.valor||0)});
    await update(ref(db,`promoCodes/${code}`),{ usado:true, uid });

    setPromoMsg(`✅ Bono de $${COP(d.valor)} acreditado`);
    setPromoInput("");
  };

  /* ============ UI ============ */
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#141e30] to-[#243b55] text-white p-6">
      <div className="max-w-3xl mx-auto space-y-10">

        {/* HEAD */}
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold">🎁 Bonos y Recompensas</h1>
          <p className="text-gray-300">Comparte tu enlace, canjea códigos y gana más.</p>
        </header>

        {/* MI CODIGO */}
        <section className="glass-card text-center space-y-4">
          <p>Tu código:</p>
          <h2 className="text-2xl font-extrabold text-yellow-300">{miCodigo}</h2>

          <div className="flex flex-wrap justify-center gap-3">
            <button onClick={copiar} className="btn3d-gold">
              {copiado ? "✅ Copiado" : "📋 Copiar enlace"}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent("Únete a CartAI 👉 "+linkFull)}`}
              target="_blank" rel="noreferrer" className="btn3d-green"
            >WhatsApp</a>
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(linkFull)}&text=${encodeURIComponent("¡Gana con CartAI! 🚀")}`}
              target="_blank" rel="noreferrer" className="btn3d-cyan"
            >Telegram</a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(linkFull)}`}
              target="_blank" rel="noreferrer" className="btn3d-blue"
            >Facebook</a>
          </div>
        </section>

        {/* INVITADOR */}
        {yaTieneRef
          ? (
            <section className="glass-card text-center">
              <p>Te invitó:</p>
              <h3 className="text-xl font-bold text-green-400">{miInvitador}</h3>
            </section>
          )
          : (
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
          )
        }

        {/* PROMO */}
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

/* ------------ Estilos utilitarios (Glass & 3-D) ------------ */
const css=`
.glass-card{backdrop-filter:blur(10px);background:rgba(255,255,255,.05);border-radius:20px;padding:24px;box-shadow:0 8px 18px #000a;}
.glass-row{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);padding:16px;border-radius:14px;}
.inputGlass{width:100%;background:rgba(255,255,255,.15);padding:12px;border-radius:10px;}
.btn3d-gold{@apply text-black font-bold py-2 px-4 rounded-lg transition shadow-lg bg-yellow-400 hover:bg-yellow-500 active:scale-95;}
.btn3d-green{@apply text-white font-bold py-2 px-4 rounded-lg transition shadow-lg bg-green-500  hover:bg-green-600  active:scale-95;}
.btn3d-cyan{@apply  text-white font-bold py-2 px-4 rounded-lg transition shadow-lg bg-cyan-500   hover:bg-cyan-600   active:scale-95;}
.btn3d-blue{@apply  text-white font-bold py-2 px-4 rounded-lg transition shadow-lg bg-blue-500   hover:bg-blue-600   active:scale-95;}
.btn3d-purple{@apply text-white font-bold py-2 px-4 rounded-lg transition shadow-lg bg-purple-500 hover:bg-purple-600 active:scale-95;}
`;
if(typeof document!=="undefined" && !document.getElementById("refCss")){
  const style=document.createElement("style");
  style.id="refCss";style.innerHTML=css.replace(/@apply[^;]+;/g,"");
  document.head.appendChild(style);
}