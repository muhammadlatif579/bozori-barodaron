// image-search.js - Чустучу бо акс мисли LakLak, алохида аз index
let _model = null;
let _tfLoaded = false;

function loadScript(src){
  return new Promise((res,rej)=>{
    if(document.querySelector('script[src="'+src+'"]')) return res();
    let s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=rej;
    document.head.appendChild(s);
  });
}

function guessType(t){
  t=(t||'').toLowerCase();
  if(t.includes('sneaker')||t.includes('shoe')||t.includes('running')||t.includes('footwear')) return 'shoe';
  if(t.includes('jacket')||t.includes('coat')||t.includes('sweatshirt')||t.includes('cardigan')||t.includes('hoodie')) return 'jacket';
  if(t.includes('watch')||t.includes('clock')) return 'watch';
  if(t.includes('handbag')||t.includes('bag')||t.includes('backpack')||t.includes('purse')) return 'bag';
  if(t.includes('shirt')||t.includes('t-shirt')||t.includes('tee')) return 'shirt';
  if(t.includes('jean')||t.includes('pant')||t.includes('trouser')||t.includes('denim')) return 'pants';
  if(t.includes('hat')||t.includes('cap')) return 'hat';
  return 'other';
}

function typeToCat(type){
  if(type=='shoe') return ['красовка','кроссов','пойафзол','обув','туфли','тапочка','красовкаи'];
  if(type=='jacket') return ['куртка','кофта','шуба','двойка'];
  if(type=='watch') return ['соат','часы','соати'];
  if(type=='bag') return ['сумка'];
  if(type=='shirt') return ['футболка','пироҳан','рубашка','кофта'];
  if(type=='pants') return ['шиму','ҷинс','джинс','брюки'];
  if(type=='hat') return ['кулоҳ','шапка'];
  return [];
}

async function searchByImage(input){
  if(!input.files || !input.files[0]) return;
  let url = URL.createObjectURL(input.files[0]);
  let img = new Image(); img.src = url;
  img.onload = async ()=>{
    try{
      document.getElementById('list').scrollIntoView({behavior:'smooth'});
      if(!_tfLoaded){
        await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.0/dist/mobilenet.min.js');
        _tfLoaded = true;
      }
      if(!_model) _model = await mobilenet.load();
      let pred = await _model.classify(img);
      let predText = pred.map(p=>p.className).join(' ').toLowerCase();
      let type = guessType(predText);
      let keys = typeToCat(type);
      let top = [];
      if(keys.length){
        top = products.filter(p=>{
          let n = (p.name||'').toLowerCase();
          return keys.some(k=>n.includes(k));
        });
      }
      if(top.length===0) top = products.slice(-20);
      top = top.slice(0,20);
      document.getElementById('list').innerHTML = top.map(p=>cardHtml(p, products.indexOf(p))).join("");
      document.getElementById('pagination').innerHTML = `<button onclick="clearImageSearch()" style="background:#eee;border:none;padding:8px 16px;border-radius:20px;font-weight:bold">✕ Тоза кардан</button>`;
    }catch(e){ render(); }
  };
}

function clearImageSearch(){
  document.getElementById('imgSearchInput').value='';
  currentPage=1; render();
    }
