import { preloadAllSymbols, getSymbol } from './src/symbolLoader.js';
import { addSymbolLayerToMap, drawVoronoiLayers } from './src/drawingUtils.js';

// Define map layer

const map = L.map("map").setView([54.0, 18.0], 8.2);
L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
  subdomains: "abcd",
  maxZoom: 19
}).addTo(map);

// Define legend in the top-right corner of the map
const legendControl = L.control({ position: 'topright' });

legendControl.onAdd = function(map) {
  const div = L.DomUtil.create('div', 'legend-container');
  div.id = 'legend';
  return div;
};

legendControl.addTo(map);

// Load data
const rawText = await fetch("data/data.csv").then(res => res.text());
const csv = d3.dsvFormat(";").parse(rawText);

//////////////////////////////////// Define Legend ////////////////////////////////////

let geoLayer;
let metadata = [];

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
    item.style.display = "flex";
    item.style.alignItems = "center";
    item.style.marginBottom = "6px";
    item.style.gap = "6px";

    const symbolDiv = document.createElement("div");
    symbolDiv.className = "legend-symbol";
    symbolDiv.style.width = "20px";
    symbolDiv.style.height = "12px";

    if (entry.symbol) {
      // Use SVG symbol
      symbolDiv.innerHTML = getSymbol(entry.symbol) || "";
    } else if (entry.border) {
      // Create line sample
      const line = document.createElement("div");
      line.style.width = "100%";
      line.style.height = "2px";
      line.style.backgroundColor = "black";

      // Style for dashed or dotted lines
      if (entry.border === "dashed_line") {
        line.style.borderTop = "2px dashed black";
        line.style.backgroundColor = "transparent";
      } else if (entry.border === "dots") {
        line.style.borderTop = "2px dotted black";
        line.style.backgroundColor = "transparent";
      }

      symbolDiv.appendChild(line);
    }

    item.appendChild(symbolDiv);

    const labelSpan = document.createElement("span");
    labelSpan.className = "legend-name";
    labelSpan.textContent = entry.name || entry.value;
    item.appendChild(labelSpan);

    container.appendChild(item);
  });
}

//////////////////////////////////// Load Map data and draw them on the map ///////////////////////////////////

async function loadMap(mapId) {
  const mapMeta = metadata.find(m => m.map_id === mapId);
  if (!mapMeta) return;

  const legendList = mapMeta.layers || [];

  if (geoLayer) map.removeLayer(geoLayer);

  ////////////// Define features list with map data ///////////////

  const features = [];

  for (const row of csv) {
    const [latStr, lonStr] = row.Coordinates.split(",");
    const lat = Number(latStr.trim());
    const lon = Number(lonStr.trim());

    const activeSymbols = [];
    const activeBorderGroups = [];
    const activeAreaFillGroups = [];

    for (const layer of legendList) {
      const colKey = `${mapId}/${layer.layer_id}`;
      const cellValue = row[colKey];

      if (!cellValue || cellValue.trim() === "") continue;

      if (layer.symbol) {
        activeSymbols.push({ name: layer.name, symbol: layer.symbol });
      }

      if (layer.border) {
        activeBorderGroups.push(layer.layer_id);
      }

      if (layer.area_fill) {
        activeAreaFillGroups.push(layer.layer_id);
      }
    }

    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lon, lat] },
      properties: {
        id: row.Nr,
        place_name: row["City Name Today"] && row["City Name Today"].trim() !== "" 
          ? row["City Name Today"] 
          : row["Original City Name"],
        activeSymbols,
        activeBorderGroups,
        activeAreaFillGroups
      }
    });
  }

  ////////////// Draw data on the map /////////////

  geoLayer = addSymbolLayerToMap(features, map);

  fetch('data/map_boundaries.geojson') // Load the map boundaries from geojson
  .then(res => res.json())
  .then(geojson => {
    const clippingGeometry = geojson.features[0];

    // Add the map boundaries to the map
    L.geoJSON(clippingGeometry, {
      style: {
        color: "#000",       // black border
        weight: 2,           // line thickness
        fill: false          // don't fill the area
      }
    }).addTo(map);

    // Draw the borders and area fills using Voronoi diagram approach
    drawVoronoiLayers(features, legendList, map, clippingGeometry);
  });


  updateLegend(legendList, mapMeta.map_name);
}

//////////////////////////////////// Initialize Everything ///////////////////////////////////
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