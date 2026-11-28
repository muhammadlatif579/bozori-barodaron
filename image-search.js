// image-search.js v16 - ИСЛОҲИ АСОСӢ: Молҳо imgs[] доранд, на img!
// Фақат ҳамин файлро иваз кун, индексро даст назан!
let _embCache = null, _extractor = null, _origProducts = null;
async function getExt(){
  if(_extractor) return _extractor;
  const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
  _extractor = await pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch32');
  return _extractor;
}
function cosSim(a,b){ let dot=0,na=0,nb=0; for(let i=0;i<a.length;i++){ dot+=a[i]*b[i]; na+=a[i]*a[i]; nb+=b[i]*b[i]; } return dot/(Math.sqrt(na)*Math.sqrt(nb)+0.000001); }
// Расми асосии мол - ҳамин аст!
function getMainImg(p){
  if(p.imgs && p.imgs.length>0) return p.imgs[0];
  if(p.img) return p.img;
  if(p.image) return p.image;
  return '';
}
function restoreAll(){ if(_origProducts && typeof products!=='undefined'){ try{ if(typeof renderProducts==='function') renderProducts(_origProducts); else if(typeof showProducts==='function') showProducts(_origProducts); else if(typeof displayProducts==='function') displayProducts(_origProducts); else location.reload(); }catch(e){ location.reload(); } } else location.reload(); }
window.restoreAllProducts = restoreAll;
async function searchByImage(input){
  try{
    let file = input?.files?.[0]; if(!file) return;
    let syncEl = document.getElementById("sync"); if(syncEl) syncEl.innerText = "⏳ Ҷустуҷӯ...";
    if(!_origProducts){ try{ if(typeof products!=='undefined' && products.length>0) _origProducts=[...products]; }catch(e){} }
    let list = _origProducts || [];
    if(list.length==0){ let r=await fetch('https://raw.githubusercontent.com/muhammadlatif579/bozori-barodaron/main/products_1.json?t='+Date.now()); list=await r.json(); _origProducts=[...list]; }
    if(!_embCache){ let r=await fetch('https://raw.githubusercontent.com/muhammadlatif579/bozori-barodaron/main/embeddings.json?t='+Date.now()); _embCache=r.ok?await r.json():{}; }
    const extractor = await getExt();
    const qOut = await extractor(URL.createObjectURL(file));
    const qEmb = Array.from(qOut.data);
    let results=[];
    for(let p of list){
      // Калиди embeddings - imgCode ё id - ҳардуро месанҷем!
      let emb = _embCache[p.imgCode] || _embCache[p.id] || _embCache[p.imgCode+'_0'] || null;
      if(!emb) continue;
      results.push({p, score: cosSim(qEmb, emb)});
    }
    results.sort((a,b)=>b.score-a.score);
    let MIN_SCORE = 0.82; // Пойафзол 76% дигар намебарояд!
    let good = results.filter(r=>r.score>=MIN_SCORE);
    let top = good.slice(0,8);
    let listEl=document.getElementById("list"); let pagEl=document.getElementById("pagination");
    if(top.length==0){
      let bestScore=results.length?Math.round(results[0].score*100):0;
      if(listEl) listEl.innerHTML=`<div style="text-align:center;padding:30px 15px"><div style="font-size:50px">😕</div><h3>Моли монанд ёфт нашуд!</h3><p style="color:#666;font-size:14px">Монандии наздиктарин фақат ${bestScore}% буд.</p><button onclick="window.restoreAllProducts()" style="padding:12px 25px;background:#7c3aed;color:#fff;border:none;border-radius:12px;font-weight:bold;margin-top:10px">↩️ Ҳамаи молҳо</button></div>`;
      if(pagEl) pagEl.innerHTML="";
      if(syncEl) syncEl.innerText="😕 Моли монанд нест";
    } else {
      let topProducts=top.map(r=>r.p);
      let done=false;
      try{
        if(typeof renderProducts==='function'){ renderProducts(topProducts); done=true; }
        else if(typeof showProducts==='function'){ showProducts(topProducts); done=true; }
        else if(typeof displayProducts==='function'){ displayProducts(topProducts); done=true; }
      }catch(e){}
      if(!done && listEl){
        // Агар индекс функсия надошт - худамон бо imgs[0] карт месозем!
        listEl.innerHTML=top.map(r=>{
          let p=r.p; let pct=Math.round(r.score*100); let img=getMainImg(p);
          return `<div style="background:#fff;border-radius:15px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1);position:relative"><span style="position:absolute;top:8px;left:8px;background:#22c55e;color:#fff;font-size:11px;padding:3px 8px;border-radius:10px;font-weight:bold;z-index:5">✅ ${pct}% монанд</span><img src="${img}" style="width:100%;height:280px;object-fit:cover"><div style="padding:12px"><b>${p.name||''}</b><div style="color:#7c3aed;font-weight:bold">${p.price||''} сомонӣ</div></div></div>`;
        }).join("");
      } else {
        setTimeout(()=>{ let cards=listEl.querySelectorAll(':scope > div'); cards.forEach((c,i)=>{ if(top[i]){ let s=document.createElement('span'); s.innerText='✅ '+Math.round(top[i].score*100)+'% монанд'; s.style.cssText='position:absolute;top:35px;left:10px;background:#22c55e;color:#fff;font-size:11px;padding:3px 8px;border-radius:10px;font-weight:bold;z-index:5'; c.style.position='relative'; c.appendChild(s); } }); },200);
      }
      if(pagEl) pagEl.innerHTML=`<div style="text-align:center;padding:10px"><p style="font-size:13px;color:#666">${top.length} моли монанд ёфт шуд!</p><button onclick="window.restoreAllProducts()" style="padding:10px 20px;background:#7c3aed;color:#fff;border:none;border-radius:12px;font-weight:bold">↩️ Ҳамаи молҳо</button></div>`;
      if(syncEl) syncEl.innerText="✅ "+top.length+" моли монанд ёфт шуд!";
    }
    window.scrollTo(0,400);
  }catch(e){ alert('Хатогӣ: '+e.message); }
}
window.searchByImage=searchByImage;
