// image-search.js - МИСЛИ WILDBERRIES - embeddings.json-ро мехонад, 1-2 сония
let _imgModel = null, _tfLoaded = false, _modelPromise = null;
let _embeddings = null, _embPromise = null;

function loadScript(src){
  return new Promise((res, rej)=>{
    if(document.querySelector('script[src="'+src+'"]')) return res();
    let s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s);
  });
}
function showYoutubeLoading(){
  let skeletons='';
  for(let i=0;i<6;i++) skeletons+=`<div style="background:#fff;border-radius:12px;padding:10px"><div style="width:100%;height:180px;background:#e5e5e5;border-radius:8px;animation:ytPulse 1.1s infinite"></div><div style="height:14px;background:#eee;border-radius:6px;margin-top:10px"></div></div>`;
  document.getElementById('list').innerHTML=skeletons;
  document.getElementById('pagination').innerHTML='';
  if(!document.getElementById('ytPulseStyle')){
    let st=document.createElement('style'); st.id='ytPulseStyle'; st.innerHTML='@keyframes ytPulse{0%{opacity:1}50%{opacity:.45}100%{opacity:1}}'; document.head.appendChild(st);
  }
}
function cosine(a,b){let dot=0,na=0,nb=0;for(let i=0;i<a.length;i++){dot+=a[i]*b[i];na+=a[i]*a[i];nb+=b[i]*b[i];}return dot/(Math.sqrt(na)*Math.sqrt(nb)+0.00001);}
function histSim(a,b){let s=0;for(let i=0;i<a.length;i++)s+=Math.min(a[i],b[i]);return s;}
function preloadModel(){
  if(_modelPromise) return _modelPromise;
  _modelPromise=(async()=>{
    if(!_tfLoaded){ await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js'); await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.0/dist/mobilenet.min.js'); _tfLoaded=true; }
    if(!_imgModel) _imgModel=await mobilenet.load(); return _imgModel;
  })(); return _modelPromise;
}
function loadEmbeddings(){
  if(_embPromise) return _embPromise;
  _embPromise=fetch('embeddings.json').then(r=>r.json()).then(j=>{_embeddings=j; return j;}).catch(()=>{ _embeddings={}; return {}; });
  return _embPromise;
}
setTimeout(()=>{preloadModel(); loadEmbeddings();},1000);
function cropCenter(imgEl){
  let c=document.createElement('canvas'); let w=imgEl.naturalWidth||imgEl.width,h=imgEl.naturalHeight||imgEl.height;
  let cw=w*0.6,ch=h*0.6,cx=w*0.2,cy=h*0.2; c.width=160;c.height=160;
  let ctx=c.getContext('2d'); ctx.drawImage(imgEl,cx,cy,cw,ch,0,0,160,160); return c;
}
function getColorHist(canvasEl){
  let ctx=canvasEl.getContext('2d'); let d=ctx.getImageData(0,0,160,160).data; let hist=new Array(12).fill(0);
  for(let i=0;i<d.length;i+=16){let r=d[i],g=d[i+1],b=d[i+2];let idx=5; if(r<70&&g<70&&b<70)idx=0; else if(r>180&&g>180&&b>180)idx=1; else if(r>120&&g>80&&b<60)idx=2; else if(r>150&&g<100&&b<100)idx=3; else if(Math.abs(r-g)<20&&Math.abs(g-b)<20)idx=4; hist[idx]++;}
  let s=hist.reduce((a,b)=>a+b,0); return hist.map(x=>x/s);
}
async function getFeatures(imgEl){
  let cropped=cropCenter(imgEl);
  let t=tf.browser.fromPixels(cropped); let resized=tf.image.resizeBilinear(t,[224,224]);
  let emb=_imgModel.infer(resized,true); let arr=Array.from(await emb.data());
  t.dispose(); resized.dispose(); emb.dispose();
  return {emb:arr, hist:getColorHist(cropped)};
}
async function searchByImage(input){
  if(!input.files||!input.files[0]) return;
  if(typeof products==='undefined'||products.length<5){ alert('⏳ Молҳо бор шуда истодаанд, 5 сония сабр кун!'); input.value=''; return; }
  let url=URL.createObjectURL(input.files[0]); let img=new Image(); img.src=url;
  img.onload=async()=>{
    try{
      document.getElementById('list').scrollIntoView({behavior:'smooth'}); showYoutubeLoading();
      await preloadModel(); await loadEmbeddings();
      let q=await getFeatures(img);
      let scored=[];
      for(let p of products){
        let best=-1;
        for(let src of (p.imgs||[]).slice(0,4)){
          let f=_embeddings[src]; if(!f) continue;
          let sim=cosine(q.emb,f.e)*0.7 + histSim(q.hist,f.h)*0.3;
          if(sim>best) best=sim;
        }
        if(best!==-1) scored.push({p, sim:best});
      }
      scored.sort((a,b)=>b.sim-a.sim);
      console.log('TOP:', scored.slice(0,5).map(s=>s.p.name+'='+s.sim.toFixed(3)));
      let top=scored.filter(s=>s.sim>0.88).slice(0,6);
      if(top.length==0){
        document.getElementById('list').innerHTML='<div style="grid-column:1/-1;text-align:center;padding:30px">😕 Моли айнан монанд ёфт нашуд.<br>Акси аз наздик ва аз пеш гузор.<br><br><button onclick="clearImageSearch()" style="background:#7c3aed;color:#fff;border:none;padding:10px 20px;border-radius:20px;font-weight:bold">Ҳамаи молҳоро бубин</button></div>'; document.getElementById('pagination').innerHTML='';
      } else {
        document.getElementById('list').innerHTML=top.map(s=>cardHtml(s.p, products.indexOf(s.p))).join("");
        document.getElementById('pagination').innerHTML='<div style="font-size:13px;color:#666">✅ '+top.length+' моли айнан монанд ёфт шуд</div><button onclick="clearImageSearch()" style="background:#eee;border:none;padding:8px 16px;border-radius:20px;font-weight:bold">✕ Тоза кардан</button>';
      }
    }catch(e){ console.log(e); render(); }
  };
}
function clearImageSearch(){ document.getElementById('imgSearchInput').value=''; currentPage=1; render(); }
