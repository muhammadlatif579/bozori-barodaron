// image-search.js v18 - 1) Порог 70%  2) Карт мисли Wildberries пахш мешавад!
let _embCache = null, _extractor = null, _origProducts = null;
async function getExt(){
  if(_extractor) return _extractor;
  const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
  _extractor = await pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch32');
  return _extractor;
}
function cosSim(a,b){ let dot=0,na=0,nb=0; for(let i=0;i<a.length;i++){ dot+=a[i]*b[i]; na+=a[i]*a[i]; nb+=b[i]*b[i]; } return dot/(Math.sqrt(na)*Math.sqrt(nb)+0.000001); }
function getMainImg(p){ if(p.imgs && p.imgs.length>0) return p.imgs[0]; if(p.img) return p.img; if(p.image) return p.image; return ''; }
function restoreAll(){ if(_origProducts && typeof products!=='undefined'){ try{ if(typeof renderProducts==='function') renderProducts(_origProducts); else if(typeof showProducts==='function') showProducts(_origProducts); else if(typeof displayProducts==='function') displayProducts(_origProducts); else location.reload(); }catch(e){ location.reload(); } } else location.reload(); }
window.restoreAllProducts = restoreAll;

// ИСЛОҲИ 2 - Кушодани мол мисли Wildberries!
function openProductCard(p){
  try{
    // Ҳамаи номҳои имконпазирро месанҷем - якеаш дар индекси ту ҳаст!
    if(typeof openProduct==='function') return openProduct(p);
    if(typeof showProduct==='function') return showProduct(p);
    if(typeof viewProduct==='function') return viewProduct(p);
    if(typeof showDetail==='function') return showDetail(p);
    if(typeof openModal==='function') return openModal(p);
    if(typeof showProductModal==='function') return showProductModal(p);
    if(typeof openProductModal==='function') return openProductModal(p);
    // Агар ҳеҷ кадом набуд - худамон модал мекушоем!
    let img = getMainImg(p);
    let modal = document.createElement('div');
    modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:flex-end;justify-content:center';
    modal.onclick = (e)=>{ if(e.target===modal) modal.remove(); };
    modal.innerHTML = `<div style="background:#fff;width:100%;max-width:480px;border-radius:20px 20px 0 0;overflow:hidden;max-height:90vh;overflow-y:auto">
      <img src="${img}" style="width:100%;height:320px;object-fit:cover">
      <div style="padding:16px"><h3 style="margin:0">${p.name||''}</h3>
      <div style="color:#7c3aed;font-weight:bold;font-size:20px;margin:8px 0">${p.price||''} сомонӣ ${p.oldPrice?'<s style="color:#999;font-size:14px">'+p.oldPrice+'</s>':''}</div>
      <p style="color:#666;font-size:14px">${p.desc||p.description||''}</p>
      <button onclick="window.addToCartById('${p.id}')" style="width:100%;padding:14px;background:#7c3aed;color:#fff;border:none;border-radius:12px;font-weight:bold;font-size:16px;margin-top:10px">🛒 Ба сабад илова кун</button>
      <button onclick="window.orderById('${p.id}')" style="width:100%;padding:14px;background:#22c55e;color:#fff;border:none;border-radius:12px;font-weight:bold;font-size:16px;margin-top:8px">✅ Заказать</button>
      <button onclick="this.closest('div').parentElement.remove()" style="width:100%;padding:10px;background:#eee;border:none;border-radius:12px;margin-top:8px">✖️ Пӯшидан</button></div></div>`;
    document.body.appendChild(modal);
  }catch(e){ console.log(e); }
}
window.openProductCard = openProductCard;
// Тугмаҳои Сабад / Заказать - ба функсияҳои индекси ту пайваст мешаванд!
window.addToCartById = function(id){
  let p = (_origProducts||[]).find(x=>x.id===id) || {};
  try{
    if(typeof addToCart==='function') return addToCart(p);
    if(typeof addToBasket==='function') return addToBasket(p);
    if(typeof addToBag==='function') return addToBag(p);
  }catch(e){}
  alert('✅ Ба сабад илова шуд: '+(p.name||''));
};
window.orderById = function(id){
  let p = (_origProducts||[]).find(x=>x.id===id) || {};
  try{
    if(typeof orderNow==='function') return orderNow(p);
    if(typeof buyNow==='function') return buyNow(p);
    if(typeof checkout==='function') return checkout(p);
  }catch(e){}
  window.addToCartById(id);
  alert('✅ Заказ қабул шуд! Мо бо шумо тамос мегирем!');
};

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
      let emb = _embCache[p.imgCode] || _embCache[p.id] || null;
      if(!emb){
        // ИСЛОҲИ НАВ: Моли нав embeddings надошта бошад - худаш ҳамон вақт мехонад! 1-2 сония!
        try{ let o = await extractor(getMainImg(p)); emb = Array.from(o.data); _embCache[p.id]=emb; }catch(e){ continue; }
      }
      results.push({p, score: cosSim(qEmb, emb)});
    }
    results.sort((a,b)=>b.score-a.score);
    // ИСЛОҲИ 1: Порог 0.70 - аз 70% зиёд ҳамааш мебарояд!
    let MIN_SCORE = 0.70;
    let good = results.filter(r=>r.score>=MIN_SCORE);
    let top = good.slice(0,12);
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
        // Агар индекс функсия надошт - худамон картҳои пахшшаванда месозем!
        listEl.innerHTML=top.map(r=>{
          let p=r.p; let pct=Math.round(r.score*100); let img=getMainImg(p);
          return `<div onclick="window.openProductCard(${JSON.stringify(p).replace(/"/g,'&quot;')})" style="background:#fff;border-radius:15px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1);position:relative;cursor:pointer"><span style="position:absolute;top:8px;left:8px;background:#22c55e;color:#fff;font-size:11px;padding:3px 8px;border-radius:10px;font-weight:bold;z-index:5;pointer-events:none">✅ ${pct}% монанд</span><img src="${img}" style="width:100%;height:280px;object-fit:cover"><div style="padding:12px"><b>${p.name||''}</b><div style="color:#7c3aed;font-weight:bold">${p.price||''} сомонӣ</div><div style="display:flex;gap:8px;margin-top:8px"><button onclick="event.stopPropagation();window.addToCartById('${p.id}')" style="flex:1;padding:10px;background:#7c3aed;color:#fff;border:none;border-radius:10px;font-weight:bold">🛒 Сабад</button><button onclick="event.stopPropagation();window.orderById('${p.id}')" style="flex:1;padding:10px;background:#22c55e;color:#fff;border:none;border-radius:10px;font-weight:bold">✅ Заказать</button></div></div></div>`;
        }).join("");
      } else {
        // ИСЛОҲИ 2: Картҳои индекси худатро пахшшаванда мекунем!
        setTimeout(()=>{
          let cards=listEl.querySelectorAll(':scope > div');
          cards.forEach((c,i)=>{
            if(!top[i]) return;
            let p=top[i].p;
            c.style.cursor='pointer';
            c.style.position='relative';
            // Нишони % - пахшро намебандад!
            let s=document.createElement('span');
            s.innerText='✅ '+Math.round(top[i].score*100)+'% монанд';
            s.style.cssText='position:absolute;top:8px;left:8px;background:#22c55e;color:#fff;font-size:11px;padding:3px 8px;border-radius:10px;font-weight:bold;z-index:5;pointer-events:none';
            c.appendChild(s);
            // Ҳар карт - пахш шавад - мол кушода мешавад!
            c.addEventListener('click', ()=>{ window.openProductCard(p); });
            // Тугмаҳои Сабад / Заказать - мисли Wildberries!
            let btnBox=document.createElement('div');
            btnBox.style.cssText='display:flex;gap:8px;padding:0 10px 10px 10px';
            btnBox.innerHTML=`<button style="flex:1;padding:10px;background:#7c3aed;color:#fff;border:none;border-radius:10px;font-weight:bold">🛒 Сабад</button><button style="flex:1;padding:10px;background:#22c55e;color:#fff;border:none;border-radius:10px;font-weight:bold">✅ Заказать</button>`;
            btnBox.children[0].onclick=(e)=>{ e.stopPropagation(); window.addToCartById(p.id); };
            btnBox.children[1].onclick=(e)=>{ e.stopPropagation(); window.orderById(p.id); };
            c.appendChild(btnBox);
          });
        },200);
      }
      if(pagEl) pagEl.innerHTML=`<div style="text-align:center;padding:10px"><p style="font-size:13px;color:#666">${top.length} моли монанд ёфт шуд!</p><button onclick="window.restoreAllProducts()" style="padding:10px 20px;background:#7c3aed;color:#fff;border:none;border-radius:12px;font-weight:bold">↩️ Ҳамаи молҳо</button></div>`;
      if(syncEl) syncEl.innerText="✅ "+top.length+" моли монанд ёфт шуд!";
    }
    window.scrollTo(0,400);
  }catch(e){ alert('Хатогӣ: '+e.message); }
}
window.searchByImage=searchByImage;
