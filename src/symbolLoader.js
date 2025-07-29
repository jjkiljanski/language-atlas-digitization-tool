let svgCache = {}; // Dict of the form symbol_name: SVG_symbol_code
let allSymbolNames = [];

export async function preloadAllSymbols() {
  const manifest = await fetch("symbols/manifest.json").then(res => res.json());
  allSymbolNames = manifest;

  svgCache = {};
  for (const name of manifest) {
    const url = `symbols/${name}.svg`;
    svgCache[name] = await fetch(url).then(res => res.text());
  }
}

export function getSymbol(name) {
  return svgCache[name] || null;
}

export function getAllSymbolNames() {
  return allSymbolNames;
}