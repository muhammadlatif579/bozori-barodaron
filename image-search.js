// image-search.js - ФИКС - фақат монандҳоро нишон медиҳад, на 6-тои маҷбурӣ
let _imgModel = null, _tfLoaded = false, _modelPromise = null;
let _embCache = new Map();

function loadScript(src){
  return new Promise((res, rej)=>{
    if(document.querySelector('script[src="'+src+'"]')) return res();
    let s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s);
  });
}
function showYoutubeLoading(){
  let skeletons='';
  for(let i=0;i<6;i++){
    skeletons+=`<div style="background:#fff;border-radius:12px;padding:10px"><div style="width:100%;height:180px;background:#e5e5e5;border-radius:8px;animation:ytPulse 1.1s infinite"></div><div style="height:14px;background:#eee;border-radius:6px;margin-top:10px"></div></div>`;
  }
  document.getElementById('list').innerHTML=skeletons;
  document.getElementById('pagination').innerHTML='';
  if(!document.getElementById('ytPulseStyle')){
    let st=document.createElement('style'); st.id='ytPulseStyle';
    st.innerHTML='@keyframes ytPulse{0%{opacity:1}50%{opacity:.45}100%{opacity:1}}';
    document.head.appendChild(st);
  }
}
function getShoeColor(img){
  try{
    let c=document.createElement('canvas'); c.width=100; c.height=100;
    let ctx=c.getContext('2d'); ctx.drawImage(img,0,0,100,100);
    let d=ctx.getImageData(30,30,40,40).data;
    let r=0,g=0,b=0,n=0;
    for(let i=0;i<d.length;i+=4){ r+=d[i]; g+=d[i+1]; b+=d[i+2]; n++; }
    r/=n; g/=n; b/=n;
    let max=Math.max(r,g,b), min=Math.min(r,g,b);
    if(max<85) return 'black';
    if(min>205) return 'white';
    if(r>160 && g<110 && b<110) return 'red';
    if(max-min<22) return 'gray';
    return 'other';
  }catch(e){ return 'other'; }
}
function cosine(a,b){
  let dot=0, na=0, nb=0;
  for(let i=0;i<a.length;i++){ dot+=a[i]*b[i]; na+=a[i]*a[i]; nb+=b[i]*b[i]; }
  return dot / (Math.sqrt(na)*Math.sqrt(nb) + 0.00001);
}
function preloadModel(){
  if(_modelPromise) return _modelPromise;
  _modelPromise=(async()=>{
    if(!_tfLoaded){
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js');
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.0/dist/mobilenet.min.js');
      _tfLoaded=true;
    }
    if(!_imgModel) _imgModel=await mobilenet.load();
    return _imgModel;
  })();
  return _modelPromise;
}
setTimeout(preloadModel, 1000);

async function getEmbedding(imgEl){
  let t=tf.browser.fromPixels(imgEl);
  let resized=tf.image.resizeBilinear(t,[160,160]);
  let emb=_imgModel.infer(resized,true);
  let arr=Array.from(await emb.data());
  t.dispose(); resized.dispose(); emb.dispose();
  return arr;
}
function loadImg(src){
  return new Promise(res=>{
    let im=new Image(); im.crossOrigin='anonymous'; im.src=src;
    im.onload=()=>res(im); im.onerror=()=>res(null); setTimeout(()=>res(null),800);
  });
}

async function searchByImage(input){
  if(!input.files || !input.files[0]) return;
  if(typeof products === 'undefined' || products.length < 5){
    alert('⏳ Молҳо ҳоло бор шуда истодаанд, 5 сония сабр кун!');
    input.value=''; return;
  }
  let url=URL.createObjectURL(input.files[0]);
  let img=new Image(); img.src=url;
  img.onload=async()=>{
    try{
      document.getElementById('list').scrollIntoView({behavior:'smooth'});
      showYoutubeLoading();
      await preloadModel();
      let qColor=getShoeColor(img);
      let qEmb=await getEmbedding(img);

      async function checkOne(p){
        let imgs=p.imgs||[];
        let bestSim=-1;
        for(let src of imgs.slice(0,4)){
          let cached=_embCache.get(src);
          let pEmb, pColor;
          if(cached){ pEmb=cached.emb; pColor=cached.color; }
          else{
            let pim=await loadImg(src);
            if(!pim) continue;
            pColor=getShoeColor(pim);
            pEmb=await getEmbedding(pim);
            _embCache.set(src, {emb:pEmb, color:pColor});
          }
          let sim=cosine(qEmb,pEmb);
          if(qColor=='black' && pColor=='white') sim-=0.15;
          if(qColor=='white' && pColor=='black') sim-=0.15;
          if(qColor==pColor) sim+=0.05;
          if(sim>bestSim) bestSim=sim;
        }
        if(bestSim==-1) return null;
        return {p, sim:bestSim};
      }

      let scored=[];
      for(let i=0;i<products.length;i+=8){
        let results=await Promise.all(products.slice(i,i+8).map(checkOne));
        scored.push(...results.filter(Boolean));
      }
      scored.sort((a,b)=> b.sim - a.sim);
      console.log('TOP:', scored.slice(0,6).map(s=>s.p.name+'='+s.sim.toFixed(2)));

      // ДУРУСТАШ: Фақат монандҳо - 0.72 боло. Агар 1-то бошад 1-то, агар 2-то бошад 2-то.
      let top=scored.filter(s=> s.sim > 0.72).slice(0,6);

      if(top.length==0){
        document.getElementById('list').innerHTML='<div style="grid-column:1/-1;text-align:center;padding:30px">😕 Моли монанд ёфт нашуд.<br>Акси равшантар гузор.<br><br><button onclick="clearImageSearch()" style="background:#7c3aed;color:#fff;border:none;padding:10px 20px;border-radius:20px;font-weight:bold">Ҳамаи молҳоро бубин</button></div>';
        document.getElementById('pagination').innerHTML='';
      } else {
        document.getElementById('list').innerHTML=top.map(s=>cardHtml(s.p, products.indexOf(s.p))).join("");
        document.getElementById('pagination').innerHTML='<div style="font-size:13px;color:#666">✅ '+top.length+' моли монанд ёфт шуд</div><button onclick="clearImageSearch()" style="background:#eee;border:none;padding:8px 16px;border-radius:20px;font-weight:bold">✕ Тоза кардан</button>';
      }
    }catch(e){ console.log(e); render(); }
  };
}
function clearImageSearch(){
  document.getElementById('imgSearchInput').value='';
  currentPage=1; render();
  }
