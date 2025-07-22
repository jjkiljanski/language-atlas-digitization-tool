const map = L.map("map").setView([54.0, 18.0], 8.2);
L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
  subdomains: "abcd",
  maxZoom: 19
}).addTo(map);

let geoLayer;
let currentLegendMap = {};  // value → { name, symbol }
let svgCache = {};
let metadata = [];
let allSymbolNames = [];

// Load and cache all symbols listed in manifest.json
async function preloadAllSymbols() {
  const manifest = await fetch("symbols/manifest.json").then(res => res.json());
  allSymbolNames = manifest;

  svgCache = {};
  for (const name of manifest) {
    const url = `symbols/${name}.svg`;
    svgCache[name] = await fetch(url).then(res => res.text());
  }
}

// Draw legend
function updateLegend(legendList) {
  const container = document.getElementById("legend");
  container.innerHTML = "<h4>Legend</h4>";

  legendList.forEach(entry => {
    const item = document.createElement("div");
    item.className = "legend-item";

    const symbolDiv = document.createElement("div");
    symbolDiv.className = "legend-symbol";
    symbolDiv.innerHTML = svgCache[entry.symbol] || "";
    item.appendChild(symbolDiv);

    const label = document.createTextNode(entry.name || entry.value);
    item.appendChild(label);

    container.appendChild(item);
  });
}

// Load map and draw points
async function loadMap(mapId) {
  const rawText = await fetch("data/data.csv").then(res => res.text());
  const csv = d3.dsvFormat(";").parse(rawText);

  const mapMeta = metadata.find(m => m.map_id === mapId);
  if (!mapMeta) return;

  const legendList = mapMeta.legend || [];

  // Build value → legend info
  currentLegendMap = {};
  legendList.forEach(entry => {
    currentLegendMap[entry.value] = {
      name: entry.name || entry.value,
      symbol: entry.symbol
    };
  });

  if (geoLayer) map.removeLayer(geoLayer);

  const features = csv.map(row => {
    const [latStr, lonStr] = row.Coordinates.split(",");
    const lat = Number(latStr.trim());
    const lon = Number(lonStr.trim());

    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: [lon, lat] },
      properties: {
        id: row.Nr,
        value: row[mapId]
      }
    };
  });

  geoLayer = L.geoJSON({ type: "FeatureCollection", features }, {
    pointToLayer: (feature, latlng) => {
      const val = feature.properties.value;
      const symbolInfo = currentLegendMap[val];
      const svg = symbolInfo ? svgCache[symbolInfo.symbol] : "";
      const div = document.createElement("div");
      div.className = "map-symbol";
      div.innerHTML = svg;
      return L.marker(latlng, {
        icon: L.divIcon({
          html: div.outerHTML,
          className: "",
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        })
      });
    },
    onEachFeature: (feature, layer) => {
      layer.bindTooltip(`Nr: ${feature.properties.id}<br>Val: ${feature.properties.value}`);
    }
  }).addTo(map);

  updateLegend(legendList);
}

// Initialize everything
async function init() {
  await preloadAllSymbols(); // Load all symbols into svgCache
  metadata = await fetch("data/metadata.json").then(res => res.json());

  const select = document.getElementById("map-select");
  metadata.forEach(entry => {
    const opt = document.createElement("option");
    opt.value = entry.map_id;
    opt.textContent = entry.name;
    select.appendChild(opt);
  });

  select.addEventListener("change", () => loadMap(select.value));
  loadMap(metadata[0].map_id);
}

init();