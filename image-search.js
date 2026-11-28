// image-search.js v12 - НАВ, ТЕЗ мисли пештара
let _embCache = null;
let _extractor = null;
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
async function searchByImage(input){
  try{
    let file = input?.files?.[0];
    if(!file) return;
    let syncEl = document.getElementById("sync");
    if(syncEl) syncEl.innerText = "⏳ Ҷустуҷӯ...";
    let list = [];
    try{ if(typeof products !== 'undefined' && products.length>0) list = products; }catch(e){}
    if(list.length==0){
      let r = await fetch('https://raw.githubusercontent.com/muhammadlatif579/bozori-barodaron/main/products_1.json?t='+Date.now());
      list = await r.json();
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
    let top = results.slice(0, 20).map(r=>r.p);
    let listEl = document.getElementById("list");
    if(top.length==0){
      listEl.innerHTML = "<p style='text-align:center;padding:20px'>😕 Моли монанд ёфт нашуд!</p>";
    } else {
      listEl.innerHTML = top.map((p, idx) => {
        let gi = 0; try{ gi = products.indexOf(p); if(gi<0) gi = idx; }catch(e){ gi = idx; }
        return cardHtml(p, gi);
      }).join("");
      document.getElementById("pagination").innerHTML = `<div style="text-align:center;padding:10px"><button onclick="location.reload()" style="padding:10px 20px;background:#7c3aed;color:#fff;border:none;border-radius:12px;font-weight:bold">↩️ Ҳамаи молҳо</button></div>`;
    }
    if(syncEl) syncEl.innerText = "✅ "+top.length+" мол ёфт шуд!";
    window.scrollTo(0, 400);
  }catch(e){ alert('Хатогӣ: ' + e.message); }
}
window.searchByImage = searchByImage;
