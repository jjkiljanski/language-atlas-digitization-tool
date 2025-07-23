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

/////////////////////// Load and add symbols as points on the map and to the legend //////////////////////

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
      symbolDiv.innerHTML = svgCache[entry.symbol] || "";
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

  const features = [];
  const borderGroups = {};

  for (const row of csv) {
    const [latStr, lonStr] = row.Coordinates.split(",");
    const lat = Number(latStr.trim());
    const lon = Number(lonStr.trim());

    const activeSymbols = [];

    for (const layer of legendList) {
      const colKey = `${mapId}/${layer.layer_id}`;
      const cellValue = row[colKey];

      if (!cellValue || cellValue.trim() === "") continue;

      if (layer.symbol) {
        activeSymbols.push({ name: layer.name, symbol: layer.symbol });
      }

      if (layer.border) {
        if (!borderGroups[layer.layer_id]) borderGroups[layer.layer_id] = [];
        borderGroups[layer.layer_id].push([lat, lon]);
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
        activeSymbols
      }
    });
  }

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

  // Draw Voronoi border between presence and absence
  for (const layer of legendList) {
    if (!layer.border) continue;

    const layerId = layer.layer_id;
    const colKey = `${mapId}/${layerId}`;

    // Separate presence and absence groups
    const presence = [];
    const absence = [];

    for (const row of csv) {
      const [latStr, lonStr] = row.Coordinates.split(",");
      const lat = Number(latStr.trim());
      const lon = Number(lonStr.trim());
      const val = row[colKey];

      if (val && val.trim() !== "") {
        presence.push({ lat, lon });
      } else {
        absence.push({ lat, lon });
      }
    }

    const allPoints = [...presence.map(p => ({ ...p, hasTrait: true })), ...absence.map(p => ({ ...p, hasTrait: false }))];
    const coords = allPoints.map(p => [p.lon, p.lat]); // [x, y]

    if (coords.length < 3) continue; // can't form Voronoi

    const delaunay = d3.Delaunay.from(coords);
    const voronoi = delaunay.voronoi([14, 52, 23, 56]); // bounding box: adjust to your region

    const borderLines = [];

    for (let e = 0; e < delaunay.halfedges.length; ++e) {
      const j = delaunay.halfedges[e];
      if (j < e) continue; // skip duplicate edges

      const p = delaunay.triangles[e];
      const q = delaunay.triangles[j];

      const pt1 = allPoints[p];
      const pt2 = allPoints[q];

      if (!pt1 || !pt2) continue;
      if (pt1.hasTrait === pt2.hasTrait) continue; // only draw between different groups

      const v1 = voronoi.cellPolygon(p);
      const v2 = voronoi.cellPolygon(q);
      if (!v1 || !v2) continue;

      // Find common edge
      const edge = v1.find(pt => v2.some(pt2 => pt[0] === pt2[0] && pt[1] === pt2[1]));
      if (!edge) continue;

      const edgeIndex1 = v1.findIndex(pt => v2.some(pt2 => pt[0] === pt2[0] && pt[1] === pt2[1]));
      const edgeIndex2 = (edgeIndex1 + 1) % v1.length;

      const edgeStart = v1[edgeIndex1];
      const edgeEnd = v1[edgeIndex2];

      borderLines.push([[edgeStart[1], edgeStart[0]], [edgeEnd[1], edgeEnd[0]]]); // Leaflet expects [lat, lon]
    }

    const borderStyle = {
      color: "#000",
      weight: 2,
      dashArray: layer.border === "dashed_line" ? "5,5" :
                layer.border === "dots" ? "1, 6" : null
    };

    borderLines.forEach(line => {
      L.polyline(line, borderStyle).addTo(map);
    });
  }

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