// image-search-FAST.js - ТЕЗ КАРДАШУДА
let _imgModel = null, _tfLoaded = false, _modelPromise = null;
let _embCache = {};
let _preloading = false;

// 1. Моделро пешакӣ бор кун - вақте сайт кушода шуд
function preloadModel(){
  if(_modelPromise) return _modelPromise;
  _modelPromise = (async ()=>{
    if(!_tfLoaded){
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js');
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.0/dist/mobilenet.min.js');
      _tfLoaded = true;
    }
    if(!_imgModel) _imgModel = await mobilenet.load();
    return _imgModel;
  })();
  return _modelPromise;
}
// Ҳамин ки саҳифа кушода шуд, оғоз кун
document.addEventListener('DOMContentLoaded', ()=> setTimeout(preloadModel, 1000));

// 2. Embedding-ро дар localStorage нигоҳ дор
function loadCache(){
  try{ _embCache = JSON.parse(localStorage.getItem('embCache_v1')||'{}'); }catch(e){ _embCache = {}; }
}
function saveCache(){
  try{ localStorage.setItem('embCache_v1', JSON.stringify(_embCache)); }catch(e){}
}
loadCache();

async function getEmbedding(imgEl){
  let t = tf.browser.fromPixels(imgEl);
  let resized = tf.image.resizeBilinear(t, [128,128]); // 160 -> 128, тезтар
  let emb = _imgModel.infer(resized, true);
  let arr = Array.from(await emb.data());
  t.dispose(); resized.dispose(); emb.dispose();
  return arr;
}

async function searchByImage(input){
  if(!input.files || !input.files[0]) return;
  let url = URL.createObjectURL(input.files[0]);
  let img = new Image(); img.src = url;
  img.onload = async ()=>{
    try{
      document.getElementById('list').scrollIntoView({behavior:'smooth'});
      showYoutubeLoading();

      await preloadModel(); // дигар интизор намешавӣ, чунки пешакӣ бор шудааст

      let qColor = getShoeColor(img);
      let qEmb = await getEmbedding(img);

      // 3. 5-то 5-то якбора санҷ - на якто-якто
      async function checkOne(p){
        let src = (p.imgs && p.imgs[0]) || '';
        if(!src) return null;
        if(_embCache[src]){
          let cached = _embCache[src];
          let sim = cosine(qEmb, cached.emb);
          if(qColor=='black' && cached.color=='white') sim -= 0.35;
          if(qColor=='white' && cached.color=='black') sim -= 0.35;
          if(qColor==cached.color) sim += 0.08;
          return {p, sim};
        }
        let pim = new Image(); pim.crossOrigin='anonymous'; pim.src = src;
        await new Promise(res=>{ pim.onload=res; pim.onerror=res; setTimeout(res, 400); });
        if(!pim.complete || pim.naturalWidth==0) return null;
        let pColor = getShoeColor(pim);
        let pEmb = await getEmbedding(pim);
        _embCache[src] = {emb: pEmb, color: pColor};
        let sim = cosine(qEmb, pEmb);
        if(qColor=='black' && pColor=='white') sim -= 0.35;
        if(qColor=='white' && pColor=='black') sim -= 0.35;
        if(qColor==pColor) sim += 0.08;
        return {p, sim};
      }

      let scored = [];
      for(let i=0; i<products.length; i+=5){
        let batch = products.slice(i, i+5);
        let results = await Promise.all(batch.map(checkOne));
        scored.push(...results.filter(Boolean));
      }
      saveCache();

      scored.sort((a,b)=> b.sim - a.sim);
      let top = scored.filter(s=> s.sim > 0.78).slice(0, 6);
      if(top.length==0) top = scored.slice(0, 3);

      if(top.length==0){
        document.getElementById('list').innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:30px">😕 Монанд ёфт нашуд.<br>Акси равшантар, аз наздик гузор.</div>';
      } else {
        document.getElementById('list').innerHTML = top.map(s=>cardHtml(s.p, products.indexOf(s.p))).join("");
      }
      document.getElementById('pagination').innerHTML = '<div style="font-size:13px;color:#666;margin-bottom:8px">✅ '+top.length+' монандтарин ёфт шуд</div><button onclick="clearImageSearch()" style="background:#eee;border:none;padding:8px 16px;border-radius:20px;font-weight:bold">✕ Тоза кардан</button>';

    }catch(e){ render(); }
  };
     }
