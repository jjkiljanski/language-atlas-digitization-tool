const map = L.map("map").setView([54.0, 18.0], 8.2);
L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
  subdomains: "abcd",
  maxZoom: 19
}).addTo(map);

const legendControl = L.control({ position: 'topright' });

legendControl.onAdd = function(map) {
  const div = L.DomUtil.create('div', 'legend-container');
  div.id = 'legend';
  div.style.background = 'white';
  div.style.padding = '10px';
  div.style.borderRadius = '6px';
  div.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
  div.style.maxWidth = '300px';
  div.style.fontFamily = 'sans-serif';
  return div;
};

legendControl.addTo(map);

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
function updateLegend(legendList, mapName) {
  const container = document.querySelector('.legend-container');
  container.innerHTML = "";

  // Add map name as a title
  if (mapName) {
    const title = document.createElement("h3");
    title.textContent = mapName;
    title.style.marginBottom = "8px";
    container.appendChild(title);
  }

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

      // Container div (vertical stack)
      const container = document.createElement("div");
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.alignItems = "center";
      container.style.justifyContent = "center";
      container.style.width = "30px";
      container.style.userSelect = "none";

      // Number box (invisible but same size)
      const numberDiv = document.createElement("div");
      numberDiv.textContent = feature.properties.id;
      numberDiv.style.width = "30px";
      numberDiv.style.height = "15px";
      numberDiv.style.display = "flex";
      numberDiv.style.alignItems = "center";
      numberDiv.style.justifyContent = "center";
      numberDiv.style.fontWeight = "bold";
      numberDiv.style.fontSize = "11px";

      // Remove background and border (invisible box)
      numberDiv.style.backgroundColor = "transparent";
      numberDiv.style.border = "none";

      // Symbol box (unchanged)
      const symbolDiv = document.createElement("div");
      symbolDiv.style.width = "30px";
      symbolDiv.style.height = "15px";
      symbolDiv.style.display = "flex";
      symbolDiv.style.alignItems = "center";
      symbolDiv.style.justifyContent = "center";
      symbolDiv.innerHTML = svg;

      // Append both boxes
      container.appendChild(numberDiv);
      container.appendChild(symbolDiv);

      return L.marker(latlng, {
        icon: L.divIcon({
          html: container.outerHTML,
          className: "",
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        })
      });
    },
    onEachFeature: (feature, layer) => {
      const val = feature.properties.value;
      const legendEntry = currentLegendMap[val];
      const legendName = legendEntry ? legendEntry.name : val;
      layer.bindTooltip(`Nr: ${feature.properties.id}<br>${legendName}`);

    }
  }).addTo(map);

  updateLegend(legendList, mapMeta.map_name);
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