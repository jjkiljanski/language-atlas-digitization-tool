const map = L.map("map").setView([51, 10], 6);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

let geoLayer;
const symbolMap = {
  aaaaa: "circle",
  bbbbb: "square",
  ccccc: "triangle"
};
const colorMap = {
  aaaaa: "red",
  bbbbb: "green",
  ccccc: "blue"
};

// Create symbol SVG
function createSymbol(type, color) {
  const size = 20;
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);

  let shape;
  switch (type) {
    case "circle":
      shape = document.createElementNS(ns, "circle");
      shape.setAttribute("cx", 10);
      shape.setAttribute("cy", 10);
      shape.setAttribute("r", 6);
      break;
    case "square":
      shape = document.createElementNS(ns, "rect");
      shape.setAttribute("x", 4);
      shape.setAttribute("y", 4);
      shape.setAttribute("width", 12);
      shape.setAttribute("height", 12);
      break;
    case "triangle":
      shape = document.createElementNS(ns, "polygon");
      shape.setAttribute("points", "10,3 17,17 3,17");
      break;
    default:
      return;
  }

  shape.setAttribute("fill", color);
  svg.appendChild(shape);
  
  return svg;
}

// Draw legend
function updateLegend(uniqueValues) {
  const container = document.getElementById("legend");
  container.innerHTML = "<h4>Legend</h4>";

  uniqueValues.forEach(val => {
    const item = document.createElement("div");
    item.className = "legend-item";

    const symbolType = symbolMap[val] || "circle";
    const color = colorMap[val] || "gray";
    const sym = createSymbol(symbolType, color);
    if (sym) {
    sym.classList.add("legend-symbol");
    item.appendChild(sym);
    }

    sym.classList.add("legend-symbol");
    item.appendChild(sym);

    const label = document.createTextNode(val);
    item.appendChild(label);

    container.appendChild(item);
  });
}

// Load map and data
async function loadMap(mapId) {
  const rawText = await fetch("data/data.csv").then(res => res.text());
  const csv = d3.dsvFormat(";").parse(rawText);

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

  const uniqueSymbols = [...new Set(features.map(f => f.properties.value))];

  geoLayer = L.geoJSON({ type: "FeatureCollection", features }, {
    pointToLayer: (feature, latlng) => {
      const symbol = symbolMap[feature.properties.value] || "circle"; // fallback to "circle"
      const color = colorMap[feature.properties.value] || "gray";

      const div = document.createElement("div");
      div.appendChild(createSymbol(symbol, color));
      return L.marker(latlng, { icon: L.divIcon({ html: div.outerHTML, className: "" }) });
    },
    onEachFeature: (feature, layer) => {
      layer.bindTooltip(`Nr: ${feature.properties.id}<br>Val: ${feature.properties.value}`);
    }
  }).addTo(map);

  updateLegend(uniqueSymbols);
}

// Load metadata and populate map selector
async function init() {
  const meta = await fetch("data/metadata.json").then(res => res.json());
  const select = document.getElementById("map-select");

  meta.forEach(entry => {
    const opt = document.createElement("option");
    opt.value = entry.map_id;
    opt.textContent = entry.name;
    select.appendChild(opt);
  });

  select.addEventListener("change", () => loadMap(select.value));
  loadMap(meta[0].map_id);
}

init();
