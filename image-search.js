// image-search.js v14 - БЕ ИВАЗИ ИНДЕКС! Фақат ҳамин файлро иваз кун!
// Индексро даст назан - ин файл худаш ҳамаашро мекунад!
let _embCache = null;
let _extractor = null;
let _origProducts = null;

async function getExt(){
  if(_extractor) return _extractor;
  const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
  _extractor = await pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch32');
  return _extractor;
}
function cosSim(a,b){
  let dot=0, na=0, nb=0;
  for(let i=0;i<a.length;i++){ dot+=a[i]*b[i]; na+=a[i]*a[i]; nb+=b[i]*b[i]; }
  return dot / (Math.sqrt(na)*Math.sqrt(nb) + 0.000001);
}

// Ин функсия - моли оддии сайтро бармегардонад, то ҷустуҷӯи расм тоза шавад
function restoreAll(){
  if(_origProducts && typeof products !== 'undefined'){
    // Ҳамаи молҳоро бармегардонем
    try{
      if(typeof renderProducts === 'function') renderProducts(_origProducts);
      else if(typeof showProducts === 'function') showProducts(_origProducts);
      else if(typeof displayProducts === 'function') displayProducts(_origProducts);
      else location.reload();
    }catch(e){ location.reload(); }
  } else location.reload();
}
window.restoreAllProducts = restoreAll;

async function searchByImage(input){
  try{
    let file = input?.files?.[0];
    if(!file) return;
    let syncEl = document.getElementById("sync");
    if(syncEl) syncEl.innerText = "⏳ Ҷустуҷӯ...";

    // 1. Ҳамаи молҳоро як бор захира мекунем, то баъд баргардонем
    if(!_origProducts){
      try{ if(typeof products !== 'undefined' && products.length>0) _origProducts = [...products]; }catch(e){}
    }
    let list = _origProducts || [];
    if(list.length==0){
      let r = await fetch('https://raw.githubusercontent.com/muhammadlatif579/bozori-barodaron/main/products_1.json?t='+Date.now());
      list = await r.json();
      _origProducts = [...list];
    }
    if(!_embCache){
      let r = await fetch('https://raw.githubusercontent.com/muhammadlatif579/bozori-barodaron/main/embeddings.json?t='+Date.now());
      _embCache = r.ok ? await r.json() : {};
    }
    const extractor = await getExt();
    const qOut = await extractor(URL.createObjectURL(file));
    const qEmb = Array.from(qOut.data);
    let results = [];
    for(let p of list){
      let emb = _embCache[p.id] || _embCache[p.imgCode] || null;
      if(!emb) continue;
      results.push({p, score: cosSim(qEmb, emb)});
    }
    results.sort((a,b)=> b.score - a.score);

    // 2. ИСЛОҲИ КАЛОН: Фақат монандҳояш!
    let MIN_SCORE = 0.70;
    let good = results.filter(r => r.score >= MIN_SCORE);
    let top = good.slice(0, 8); // Фақат 8-то, на 20-то!

    let listEl = document.getElementById("list");
    let pagEl = document.getElementById("pagination");

    if(top.length==0){
      // Агар монанд набошад - ҲЕҶ ЧИЗ нишон надиҳад!
      let bestScore = results.length ? Math.round(results[0].score*100) : 0;
      if(listEl) listEl.innerHTML = `<div style="text-align:center;padding:30px 15px">
        <div style="font-size:50px">😕</div>
        <h3 style="margin:10px 0">Моли монанд ёфт нашуд!</h3>
        <p style="color:#666;font-size:14px;line-height:1.5">Ин мол дар Бозори Бародарон ҳоло нест.<br>Монандии наздиктарин фақат ${bestScore}% буд - кам аст.</p>
        <button onclick="window.restoreAllProducts()" style="padding:12px 25px;background:#7c3aed;color:#fff;border:none;border-radius:12px;font-weight:bold;font-size:15px;margin-top:10px">↩️ Ҳамаи молҳоро дидан</button>
      </div>`;
      if(pagEl) pagEl.innerHTML = "";
      if(syncEl) syncEl.innerText = "😕 Моли монанд нест";
    } else {
      // 3. Фақат монандҳоро нишон медиҳем - бо истифода аз функсияи ХУДИ индекс!
      // Индексро иваз намекунем, фақат молҳои монандро ба ҳамон функсия медиҳем!
      let topProducts = top.map(r => r.p);
      let rendered = false;
      try{
        if(typeof renderProducts === 'function'){ renderProducts(topProducts); rendered = true; }
        else if(typeof showProducts === 'function'){ showProducts(topProducts); rendered = true; }
        else if(typeof displayProducts === 'function'){ displayProducts(topProducts); rendered = true; }
      }catch(e){}
      // Агар индекс функсияи тайёр надошта бошад, худамон карт месозем:
      if(!rendered && listEl){
        listEl.innerHTML = top.map(r => {
          let p = r.p;
          let pct = Math.round(r.score*100);
          let img = p.img || p.image || p.photo || '';
          let name = p.name || p.title || 'Мол';
          let price = p.price || p.cost || '';
          return `<div style="background:#fff;border-radius:15px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1);position:relative">
            <div style="position:absolute;top:8px;left:8px;background:#22c55e;color:#fff;font-size:11px;padding:3px 8px;border-radius:10px;font-weight:bold;z-index:5">✅ ${pct}% монанд</div>
            <img src="${img}" style="width:100%;height:220px;object-fit:cover" onerror="this.src='https://via.placeholder.com/300'">
            <div style="padding:12px"><b style="font-size:14px">${name}</b><div style="color:#7c3aed;font-weight:bold;margin-top:5px">${price} сомонӣ</div></div>
          </div>`;
        }).join("");
      }
      if(pagEl) pagEl.innerHTML = `<div style="text-align:center;padding:10px"><p style="font-size:13px;color:#666">${top.length} моли монанд ёфт шуд!</p><button onclick="window.restoreAllProducts()" style="padding:10px 20px;background:#7c3aed;color:#fff;border:none;border-radius:12px;font-weight:bold">↩️ Ҳамаи молҳо</button></div>`;
      if(syncEl) syncEl.innerText = "✅ "+top.length+" моли монанд ёфт шуд!";
    }
    window.scrollTo(0, 400);
  }catch(e){ alert('Хатогӣ: ' + e.message); }
}
window.searchByImage = searchByImage;
