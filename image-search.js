// image-search.js - НАВИ ДУРУСТ - мукоисаи хакикии акс ба акс
let _imgModel = null, _tfLoaded = false;

function loadScript(src){
  return new Promise((res, rej)=>{
    if(document.querySelector('script[src="'+src+'"]')) return res();
    let s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s);
  });
}

// Ранги ХУДИ пойафзол - факат марказ, на замин!
function getShoeColor(img){
  try{
    let c=document.createElement('canvas'); c.width=100; c.height=100;
    let ctx=c.getContext('2d'); ctx.drawImage(img,0,0,100,100);
    // Факат марказ 40% - дар он чо пойафзол аст, замин не
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

async function getEmbedding(imgEl){
  // mobilenet.infer - вектори шаклро медихад
  let t = tf.browser.fromPixels(imgEl);
  let resized = tf.image.resizeBilinear(t, [224,224]);
  let emb = _imgModel.infer(resized, true);
  let arr = await emb.data();
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
      document.getElementById('list').innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:30px">⏳ Акс ба акс мукоиса карда истодаам...<br><small>Факат монандтаринхо</small></div>';

      if(!_tfLoaded){
        await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.0/dist/mobilenet.min.js');
        _tfLoaded = true;
      }
      if(!_imgModel) _imgModel = await mobilenet.load();

      let qColor = getShoeColor(img);
      let qEmb = await getEmbedding(img);

      // Хамаи молхоро бо акси ту мукоиса мекунем
      let scored = [];
      // Барои тез кор кардан факат 60-тои охиринро месанчем - одатан молхои нав хамон чоянд
      // Агар хохед хамаашро санчад - 60-ро ба products.length иваз кунед
      let toCheck = products.slice(-80);

      for(let p of toCheck){
        try{
          let src = (p.imgs && p.imgs[0]) || '';
          if(!src) continue;
          let pim = new Image(); pim.crossOrigin='anonymous'; pim.src = src;
          await new Promise(res=>{ pim.onload=res; pim.onerror=res; setTimeout(res, 1500); });
          if(!pim.complete || pim.naturalWidth==0) continue;

          let pColor = getShoeColor(pim);
          let pEmb = await getEmbedding(pim);
          let sim = cosine(qEmb, pEmb);

          // САХТГИР: агар ранги пойафзол фарк кунад - холро хеле паст мекунем
          // Сиёхро чустучу кунем - сафед ва сурх набояд барояд
          if(qColor=='black' && pColor=='white') sim -= 0.35;
          if(qColor=='black' && pColor=='red') sim -= 0.25;
          if(qColor=='white' && pColor=='black') sim -= 0.35;
          if(qColor=='black' && pColor=='black') sim += 0.08;
          if(qColor=='white' && pColor=='white') sim += 0.08;

          scored.push({p, sim, pColor});
        }catch(e){}
      }

      scored.sort((a,b)=> b.sim - a.sim);

      // Факат хеле монандхоро мемонем - мачбури пур намекунем!
      // Агар факат 2-то монанд бошад - 2-то нишон медихад
      let top = scored.filter(s=> s.sim > 0.78).slice(0, 6);
      // Агар хеч кадомаш ба 0.78 нарасад - 3-тои бехтаринро нишон медихем, вале на 20-то
      if(top.length==0) top = scored.slice(0, 3);

      if(top.length==0 || scored.length==0){
        document.getElementById('list').innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:30px">😕 Монанд ёфт нашуд.<br>Акси равшантар, аз наздик гузор.</div>';
      } else {
        document.getElementById('list').innerHTML = top.map(s=>cardHtml(s.p, products.indexOf(s.p))).join("");
      }
      document.getElementById('pagination').innerHTML = '<div style="font-size:13px;color:#666;margin-bottom:8px">✅ '+top.length+' монандтарин ёфт шуд (ранги пойафзол: '+qColor+')</div><button onclick="clearImageSearch()" style="background:#eee;border:none;padding:8px 16px;border-radius:20px;font-weight:bold">✕ Тоза кардан</button>';

    }catch(e){ render(); }
  };
}

function clearImageSearch(){
  document.getElementById('imgSearchInput').value='';
  currentPage=1; render();
    }
