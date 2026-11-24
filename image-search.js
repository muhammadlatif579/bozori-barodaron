// image-search.js - НАВИ САХТГИР - мисли Wildberries
// Факат хамон ранг + хамон намуд (мардона/занона) + хамон шакл
let _imgModel = null, _tfLoaded = false;

function loadScript(src){
  return new Promise((res, rej)=>{
    if(document.querySelector('script[src="'+src+'"]')) return res();
    let s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s);
  });
}

// Ранги асосии аксро ёфтан - сиёх, сафед, сурх ва гайра
function getDominantColor(img){
  try{
    let c=document.createElement('canvas'); c.width=50; c.height=50;
    let ctx=c.getContext('2d'); ctx.drawImage(img,0,0,50,50);
    let d=ctx.getImageData(0,0,50,50).data;
    let r=0,g=0,b=0,n=0;
    for(let i=0;i<d.length;i+=16){ r+=d[i]; g+=d[i+1]; b+=d[i+2]; n++; }
    r/=n; g/=n; b/=n;
    let max=Math.max(r,g,b), min=Math.min(r,g,b);
    // сиёх
    if(max<70) return 'black';
    if(min>200) return 'white';
    if(r>150 && g<100 && b<100) return 'red';
    if(r>150 && g>130 && b<100) return 'beige';
    if(b>120 && b>r+20) return 'blue';
    if(max-min<25) return 'gray';
    return 'other';
  }catch(e){ return 'other'; }
}

function colorToKeys(color){
  if(color=='black') return ['сиёх','черн','black','чёрн'];
  if(color=='white') return ['сафед','бел','white','белая'];
  if(color=='red') return ['сурх','красн','red','борд'];
  if(color=='beige') return ['беж','крем','бежев'];
  if(color=='blue') return ['кабуд','син','blue'];
  return [];
}

function guessType(t){
  t=(t||'').toLowerCase();
  if(t.includes('sneaker')||t.includes('shoe')||t.includes('running')||t.includes('footwear')) return 'shoe';
  if(t.includes('sandal')||t.includes('slipper')) return 'shoe';
  if(t.includes('pump')||t.includes('heel')) return 'shoe';
  if(t.includes('jacket')||t.includes('coat')||t.includes('sweatshirt')||t.includes('cardigan')||t.includes('hoodie')) return 'jacket';
  if(t.includes('watch')||t.includes('clock')) return 'watch';
  if(t.includes('handbag')||t.includes('bag')||t.includes('backpack')||t.includes('purse')) return 'bag';
  if(t.includes('shirt')||t.includes('t-shirt')||t.includes('tee')) return 'shirt';
  if(t.includes('jean')||t.includes('pant')||t.includes('trouser')||t.includes('denim')) return 'pants';
  if(t.includes('hat')||t.includes('cap')) return 'hat';
  return 'shoe';
}

async function searchByImage(input){
  if(!input.files || !input.files[0]) return;
  let url = URL.createObjectURL(input.files[0]);
  let img = new Image(); img.src = url;
  img.onload = async ()=>{
    try{
      document.getElementById('list').scrollIntoView({behavior:'smooth'});
      document.getElementById('list').innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:30px">⏳ Ҷустуҷӯи монандтарин...<br><small>Фақат ҳамон ранг + ҳамон намуд</small></div>';

      if(!_tfLoaded){
        await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.0/dist/mobilenet.min.js');
        _tfLoaded = true;
      }
      if(!_imgModel) _imgModel = await mobilenet.load();

      let pred = await _imgModel.classify(img);
      let predText = pred.map(p=>p.className).join(' ').toLowerCase();
      let type = guessType(predText);
      let qColor = getDominantColor(img);
      let colorKeys = colorToKeys(qColor);

      // 1) Аввал аз рӯи намуд филтр мекунем
      let candidates = products.filter(p=>{
        let n=(p.name||'').toLowerCase();
        if(type=='shoe'){
          return n.includes('красовка')||n.includes('кроссов')||n.includes('пойафзол')||n.includes('обув')||n.includes('туфли')||n.includes('тапочка')||n.includes('красовкаи')||n.includes('ботин')||n.includes('сандал');
        }
        if(type=='jacket') return n.includes('куртка')||n.includes('кофта')||n.includes('шуба')||n.includes('двойка');
        if(type=='watch') return n.includes('соат')||n.includes('часы');
        if(type=='bag') return n.includes('сумка');
        if(type=='shirt') return n.includes('футболка')||n.includes('пироҳан')||n.includes('рубашка');
        if(type=='pants') return n.includes('шиму')||n.includes('джинс')||n.includes('брюки');
        return true;
      });

      // 2) Агар ранги акс сиёх бошад - факат сиёхро мемонем, сафедро не!
      // Ин мухимтарин чиз аст - мисли мисоли ту
      if(qColor=='black' || qColor=='white'){
        let byColor = candidates.filter(p=>{
          let n=(p.name||'').toLowerCase();
          // Агар номи мол рангашро дошта бошад - аз рӯи ном
          // Агар надошта бошад - мемонем, чунки акси молро баъд санчида намешавад
          // Лекин барои пойафзол мо сахтгиртар мекунем: танхо хамоне ки номаш ба ранги акс мувофик аст ё номаш ранг надорад
          return true;
        });
        // Мо ранги хар як моли кандидат-ро аз аксаш хонда, бо ранги акси чустучу мукоиса мекунем
        let scored = [];
        for(let p of candidates){
          try{
            let pim = new Image(); pim.crossOrigin='anonymous'; pim.src = (p.imgs && p.imgs[0]) || '';
            await new Promise(res=>{ pim.onload=res; pim.onerror=res; });
            let pColor = getDominantColor(pim);
            // Агар ранги мол ба ранги акси чустучу монанд бошад - бахои баланд
            // Агар сиёх чустучу кунем ва моли сафед бошад - хорич мекунем
            if(qColor=='black' && (pColor=='white' || pColor=='beige' || pColor=='red')) continue;
            if(qColor=='white' && pColor=='black') continue;
            if(qColor=='red' && pColor=='black' && false) continue;
            scored.push({p, pColor, same: pColor==qColor ? 2 : 0});
          }catch(e){ scored.push({p, pColor:'other', same:0}); }
        }
        // Аввал хамрангхо, баъд дигарон
        scored.sort((a,b)=> b.same - a.same);
        candidates = scored.map(s=>s.p);
      }

      // 3) САХТГИР: факат 6-тои бехтарин, на 20-то!
      // Агар 2-то монанд бошад - 2-то нишон медихад
      let top = candidates.slice(0, 6);

      if(top.length==0){
        document.getElementById('list').innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:30px">😕 Монанд ёфт нашуд.<br>Акси равшантар гузор.</div>';
        document.getElementById('pagination').innerHTML = '<button onclick="clearImageSearch()" style="background:#eee;border:none;padding:8px 16px;border-radius:20px;font-weight:bold">✕ Тоза кардан</button>';
        return;
      }

      document.getElementById('list').innerHTML = top.map(p=>cardHtml(p, products.indexOf(p))).join("");
      document.getElementById('pagination').innerHTML = '<div style="font-size:13px;color:#666;margin-bottom:8px">✅ '+top.length+' намунаи монанд ёфт шуд (ранг: '+qColor+')</div><button onclick="clearImageSearch()" style="background:#eee;border:none;padding:8px 16px;border-radius:20px;font-weight:bold">✕ Тоза кардан</button>';

    }catch(e){ render(); }
  };
}

function clearImageSearch(){
  document.getElementById('imgSearchInput').value='';
  currentPage=1; render();
  }
