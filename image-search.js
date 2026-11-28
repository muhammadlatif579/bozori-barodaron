// image-search.js - ДУРУСТ - Бигзор 30 сония шавад, аммо айнан худашро ёбад
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

// === НАВ: Акси канораҳоро мебурем, фақат худи молро мегирем ===
function cropCenter(imgEl){
  let c=document.createElement('canvas');
  // 20% аз ҳар тараф мебурем - пол ва девор нест мешавад, фақат пойафзол мемонад
  let w=imgEl.naturalWidth||imgEl.width, h=imgEl.naturalHeight||imgEl.height;
  let cw=w*0.6, ch=h*0.6, cx=w*0.2, cy=h*0.2;
  c.width=160; c.height=160;
  let ctx=c.getContext('2d');
  ctx.drawImage(imgEl, cx, cy, cw, ch, 0, 0, 160, 160);
  return c;
}
// === НАВ: Ранги дақиқ - мокасини сиёҳи тобнок ва красовкаи сиёҳи матнӣ фарқ доранд ===
function getColorHist(canvasEl){
  let ctx=canvasEl.getContext('2d');
  let d=ctx.getImageData(0,0,160,160).data;
  let hist=new Array(12).fill(0);
  for(let i=0;i<d.length;i+=16){
    let r=d[i], g=d[i+1], b=d[i+2];
    let idx=0;
    if(r<70 && g<70 && b<70) idx=0; // сиёҳи тоза
    else if(r>180 && g>180 && b>180) idx=1; // сафед
    else if(r>120 && g>80 && b<60) idx=2; // қаҳвагӣ
    else if(r>150 && g<100 && b<100) idx=3; // сурх
    else if(Math.abs(r-g)<20 && Math.abs(g-b)<20) idx=4; // хокистарӣ
    else idx=5;
    hist[idx]++;
  }
  let sum=hist.reduce((a,b)=>a+b,0);
  return hist.map(x=>x/sum);
}
function histSim(a,b){
  let s=0;
  for(let i=0;i<a.length;i++) s+=Math.min(a[i],b[i]);
  return s; // 0 то 1
}

async function getFeatures(imgEl){
  let cropped=cropCenter(imgEl);
  let t=tf.browser.fromPixels(cropped);
  let resized=tf.image.resizeBilinear(t,[224,224]);
  let emb=_imgModel.infer(resized,true);
  let arr=Array.from(await emb.data());
  t.dispose(); resized.dispose(); emb.dispose();
  let hist=getColorHist(cropped);
  return {emb:arr, hist};
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
      let q=await getFeatures(img);

      async function checkOne(p){
        let imgs=p.imgs||[];
        let best=-1;
        for(let src of imgs.slice(0,4)){
          let cached=_embCache.get(src);
          let f;
          if(cached) f=cached;
          else{
            let pim=await loadImg(src);
            if(!pim) continue;
            f=await getFeatures(pim);
            _embCache.set(src, f);
          }
          let embSim=cosine(q.emb, f.emb);
          let colSim=histSim(q.hist, f.hist);
          // 70% шакл + 30% ранг - агар ҳарду монанд набошад, намебарояд
          let sim = embSim*0.7 + colSim*0.3;
          if(sim>best) best=sim;
        }
        if(best==-1) return null;
        return {p, sim:best};
      }

      let scored=[];
      // Бигзор 30 сония шавад - 2-то якҷо, аммо дуруст
      for(let i=0;i<products.length;i+=2){
        let results=await Promise.all(products.slice(i,i+2).map(checkOne));
        scored.push(...results.filter(Boolean));
      }
      scored.sort((a,b)=> b.sim - a.sim);
      console.log('TOP:', scored.slice(0,5).map(s=>s.p.name+'='+s.sim.toFixed(3)));

      // ҚАТЪӢ: Фақат 0.88 боло - агар 1-то бошад 1-то, агар 2-то бошад 2-то, агар набошад - ёфт нашуд
      let top=scored.filter(s=> s.sim > 0.88).slice(0,6);

      if(top.length==0){
        document.getElementById('list').innerHTML='<div style="grid-column:1/-1;text-align:center;padding:30px">😕 Моли айнан монанд ёфт нашуд.<br>Акси аз наздик ва аз пеш, бе пол гузор.<br><br><button onclick="clearImageSearch()" style="background:#7c3aed;color:#fff;border:none;padding:10px 20px;border-radius:20px;font-weight:bold">Ҳамаи молҳоро бубин</button></div>';
        document.getElementById('pagination').innerHTML='';
      } else {
        document.getElementById('list').innerHTML=top.map(s=>cardHtml(s.p, products.indexOf(s.p))).join("");
        document.getElementById('pagination').innerHTML='<div style="font-size:13px;color:#666">✅ '+top.length+' моли айнан монанд ёфт шуд</div><button onclick="clearImageSearch()" style="background:#eee;border:none;padding:8px 16px;border-radius:20px;font-weight:bold">✕ Тоза кардан</button>';
      }
    }catch(e){ console.log(e); render(); }
  };
}
function clearImageSearch(){
  document.getElementById('imgSearchInput').value='';
  currentPage=1; render();
    }
