// image-search.js - ВЕРСИЯИ АВТОМАТИ v2
// Моли нав худаш автомати ёфта мешавад, generate.html лозим нест!

let embeddingsCache = {};
let productsCache = [];
let modelLoaded = false;
let extractor = null;

// 1. embeddings.json-и куҳнаро мехонем
async function loadEmbeddings() {
  try {
    const res = await fetch('embeddings.json');
    embeddingsCache = await res.json();
  } catch(e) { embeddingsCache = {}; }
  // Кэши пештараи дар браузер захирашударо ҳам мехонем
  const saved = localStorage.getItem('auto_embeddings');
  if (saved) {
    Object.assign(embeddingsCache, JSON.parse(saved));
  }
}

// 2. Агар моли нав embeddings надошта бошад - худаш ҳисоб мекунад
async function getEmbeddingForProduct(product) {
  const id = product.id || product.name;
  if (embeddingsCache[id]) return embeddingsCache[id];

  // Моделро як бор бор мекунем
  if (!extractor) {
    const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
    extractor = await pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch32');
  }
  const imgUrl = product.image || product.img || product.photo;
  const output = await extractor(imgUrl);
  const emb = Array.from(output.data);

  // Захира мекунем, ки дафъаи дигар 1 сония шавад
  embeddingsCache[id] = emb;
  localStorage.setItem('auto_embeddings', JSON.stringify(embeddingsCache));
  return emb;
}

// 3. Ҷустуҷӯи асосӣ - ҳам моли куҳна, ҳам моли навро меёбад
async function searchByImage(queryImageFile) {
  await loadEmbeddings();
  const res = await fetch('products_1.json');
  productsCache = await res.json();
  const products = Array.isArray(productsCache) ? productsCache : productsCache.products;

  if (!extractor) {
    const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
    extractor = await pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch32');
  }
  const queryOut = await extractor(URL.createObjectURL(queryImageFile));
  const queryEmb = Array.from(queryOut.data);

  const results = [];
  for (const p of products) {
    const emb = await getEmbeddingForProduct(p);
    // Ҳисоби монандӣ (cosine similarity)
    let dot = 0, a = 0, b = 0;
    for (let i = 0; i < queryEmb.length; i++) {
      dot += queryEmb[i] * emb[i];
      a += queryEmb[i] * queryEmb[i];
      b += emb[i] * emb[i];
    }
    const score = dot / (Math.sqrt(a) * Math.sqrt(b));
    results.push({ product: p, score });
  }
  results.sort((x, y) => y.score - x.score);
  return results.slice(0, 10);
}

window.searchByImage = searchByImage;
