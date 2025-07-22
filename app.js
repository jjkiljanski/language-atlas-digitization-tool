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

    const labelSpan = document.createElement("span");
    labelSpan.className = "legend-name";
    labelSpan.textContent = entry.name || entry.value;
    item.appendChild(labelSpan);


    container.appendChild(item);
  });
}

async function loadMap(mapId) {
  const rawText = await fetch("data/data.csv").then(res => res.text());
  const csv = d3.dsvFormat(";").parse(rawText);

  const mapMeta = metadata.find(m => m.map_id === mapId);
  if (!mapMeta) return;

  const legendList = mapMeta.layers || [];

  // Build symbol info for each layer by its full key (e.g., XV.1/0)
  const symbolMap = {};
  for (const layer of legendList) {
    const colKey = `${mapId}/${layer.layer_id}`;
    symbolMap[colKey] = {
      name: layer.name,
      symbol: layer.symbol
    };
  }

  if (geoLayer) map.removeLayer(geoLayer);

  const features = csv.map(row => {
    const [latStr, lonStr] = row.Coordinates.split(",");
    const lat = Number(latStr.trim());
    const lon = Number(lonStr.trim());

    // Collect all symbols that are active at this point
    const activeSymbols = [];

    for (const layer of legendList) {
      const colKey = `${mapId}/${layer.layer_id}`;
      const cellValue = row[colKey];
      if (cellValue && cellValue.trim() !== "") {
        activeSymbols.push(symbolMap[colKey]);
      }
    }

    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: [lon, lat] },
      properties: {
        id: row.Nr,
        place_name: row["City Name Today"] && row["City Name Today"].trim() !== "" 
          ? row["City Name Today"] 
          : row["Original City Name"],
        activeSymbols
      }
    };
  });

  geoLayer = L.geoJSON({ type: "FeatureCollection", features }, {
    pointToLayer: (feature, latlng) => {
      const { id, activeSymbols } = feature.properties;

      // Build marker container
      const container = document.createElement("div");
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.alignItems = "center";
      container.style.justifyContent = "center";
      container.style.width = "30px";
      container.style.userSelect = "none";

      // Number div
      const numberDiv = document.createElement("div");
      numberDiv.textContent = id;
      numberDiv.style.width = "30px";
      numberDiv.style.height = "15px";
      numberDiv.style.display = "flex";
      numberDiv.style.alignItems = "center";
      numberDiv.style.justifyContent = "center";
      numberDiv.style.fontWeight = "bold";
      numberDiv.style.fontSize = "11px";
      numberDiv.style.backgroundColor = "transparent";
      numberDiv.style.border = "none";

      // Symbol row (flex row)
      const symbolRow = document.createElement("div");
      symbolRow.style.display = "flex";
      symbolRow.style.flexDirection = "row";
      symbolRow.style.justifyContent = "center";
      symbolRow.style.alignItems = "center";

      for (const sym of activeSymbols) {
        const symDiv = document.createElement("div");
        symDiv.innerHTML = svgCache[sym.symbol] || "";
        symDiv.style.width = "15px";
        symDiv.style.height = "15px";
        symbolRow.appendChild(symDiv);
      }

      container.appendChild(numberDiv);
      container.appendChild(symbolRow);

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
      const { id, place_name, activeSymbols } = feature.properties;
      const legendNames = activeSymbols.map(s => s.name).join("<br>");
      layer.bindTooltip(`Nr: ${id} (${place_name})<br><span class="tooltip-legend-name">${legendNames}</span>`);
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