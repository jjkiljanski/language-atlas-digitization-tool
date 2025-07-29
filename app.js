import { preloadAllSymbols, getSymbol } from './src/symbolLoader.js';
import { addSymbolLayerToMap, drawVoronoiLayers } from './src/drawingUtils.js';
import { borderStyles, areaFillStyles } from './src/styleConfig.js';


////////////////////////////////////////////// Initial load of all data and layout setup //////////////////////////////////////////////////

let map;
let metadata;
let editing_mode = false;

async function init() {
  /**************************** Define map layer ****************************/
  map = L.map("map").setView([54.0, 18.0], 8.2);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19
  }).addTo(map);

  /**************************** Load external data ****************************/
  const [pointsRawText, dataRawText, metadataRaw] = await Promise.all([
    fetch("data/points.csv").then(res => res.text()),
    fetch("data/data.csv").then(res => res.text()),
    fetch(`data/metadata.json?nocache=${Date.now()}`).then(res => res.json())
  ]);

  const points = d3.dsvFormat(";").parse(pointsRawText);
  const data = d3.dsvFormat(";").parse(dataRawText);
  metadata = metadataRaw;

  // Make points and data available globally if needed
  window.points = points;
  window.data = data;

  /**************************** Add Legend Box ****************************/
  const legendControl = L.control({ position: "topright" });

  legendControl.onAdd = function (map) {
    const div = L.DomUtil.create("div", "legend-container");
    div.id = "legend";
    return div;
  };

  legendControl.addTo(map);

  /**************************** Render UI ****************************/
  renderSidebar();
}

/**************************** Function for map cleaning ****************************/
function cleanMap() {
  console.log("Cleaning map...")

  // Clean Legend
  const container = document.querySelector('.legend-container');
  container.innerHTML = "";

  // Clean Map
  if (symbolLayer) map.removeLayer(symbolLayer);
  if (voronoiLayers) {
    for (const layerId in voronoiLayers) {
      const layerGroup = voronoiLayers[layerId];

      // Remove border layers if present
      if (layerGroup.borders) {
        layerGroup.borders.forEach(layer => map.removeLayer(layer));
      }

      // Remove area fill layers if present
      if (layerGroup.areaFills) {
        layerGroup.areaFills.forEach(layer => map.removeLayer(layer));
      }
    }
  }
}

////////////////////////////////////////////////////// Logic for sidebar rendering //////////////////////////////////////////////////////////////

function renderSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebar.innerHTML = ""; // Clear existing content

  if (editing_mode) {
    // BACK BUTTON
    const backBtn = document.createElement("button");
    backBtn.textContent = "← Powrót";
    backBtn.style.marginBottom = "10px";
    backBtn.id = "back-button";
    backBtn.onclick = () => {
      editing_mode = false;
      renderSidebar(); // Re-render normal view
    };
    sidebar.appendChild(backBtn);

    // Editing mode UI
    const heading = document.createElement("strong");
    heading.textContent = "Istniejące warstwy";
    sidebar.appendChild(heading);

    const layerList = document.createElement("ul");
    layerList.id = "layer-list"; // Empty initially
    sidebar.appendChild(layerList);

    const downloadBtn = document.createElement("button");
    downloadBtn.textContent = "Pobierz gotową mapę";
    downloadBtn.style.marginTop = "auto";
    downloadBtn.id = "download-map-button";
    sidebar.appendChild(downloadBtn);

    cleanMap(); // Clear map for editing mode

  } else {
    // Normal (viewing) mode UI
    const labelSelect = document.createElement("label");
    labelSelect.setAttribute("for", "map-select");
    labelSelect.id = "map-label";
    labelSelect.textContent = "Wybierz mapę:";
    sidebar.appendChild(labelSelect);

    const select = document.createElement("select");
    select.id = "map-select";
    sidebar.appendChild(select);

    const labelAuthor = document.createElement("label");
    labelAuthor.setAttribute("for", "map-author");
    labelAuthor.id = "author-label";
    labelAuthor.textContent = "Autor:";
    sidebar.appendChild(labelAuthor);

    const authorBox = document.createElement("div");
    authorBox.id = "map-author";
    sidebar.appendChild(authorBox);

    const loadMapBtn = document.createElement("button");
    loadMapBtn.id = "load-map-button";
    loadMapBtn.textContent = "Załaduj mapę";
    sidebar.appendChild(loadMapBtn);

    const newMapBtn = document.createElement("button");
    newMapBtn.id = "new-map-button";
    newMapBtn.textContent = "Stwórz nową mapę";
    sidebar.appendChild(newMapBtn);

    // Button logic
    loadMapBtn.onclick = () => {
      document.getElementById("load-map-modal").style.display = "block";
    };

    newMapBtn.onclick = () => {
      editing_mode = true;
      renderSidebar();
    };

    // Re-populate map selection and author if metadata is available
    if (metadata && Array.isArray(metadata)) {
      metadata.forEach(entry => {
        const opt = document.createElement("option");
        opt.value = entry.map_id;
        opt.textContent = entry.map_id + " " + entry.map_name;
        select.appendChild(opt);
      });

      select.addEventListener("change", () => {
        const selectedId = select.value;
        const selectedMeta = metadata.find(m => m.map_id === selectedId);

        if (selectedMeta) {
          authorBox.textContent = selectedMeta.author || "";
        }

        drawMap(selectedId, metadata);
      });

      if (metadata.length > 0) {
        select.value = metadata[0].map_id;
        authorBox.textContent = metadata[0].author || "";
        drawMap(metadata[0].map_id, metadata);
      }
    }
  }
}


////////////////////////////////////////////////////// Logic for map creating //////////////////////////////////////////////////////////////


////////////////////////////////////////////////////// Logic for map loading ///////////////////////////////////////////////////////////////


////////////////////////////////////////////////////// Logic for map showing ///////////////////////////////////////////////////////////////

/**************************** Define Legend ****************************/

let symbolLayer;
let voronoiLayers;

function updateLegend(legendList, mapName, voronoiLayers, map) {
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
    item.style.cursor = "pointer"; // indicate it's clickable

    const symbolDiv = document.createElement("div");
    symbolDiv.className = "legend-symbol";
    symbolDiv.style.width = "24px";
    symbolDiv.style.height = "24px";
    symbolDiv.style.position = "relative";

    if (entry.symbol) {
      symbolDiv.innerHTML = getSymbol(entry.symbol) || "";
    } else if (entry.border) {
      const borderConfig = borderStyles[entry.border];
      if (borderConfig) {
        const legendStyle = borderConfig.legendStyle || {};
        const line = document.createElement("div");
        line.style.width = "100%";
        line.style.height = "2px";
        line.style.position = "absolute";
        line.style.top = "50%";
        line.style.left = "0";
        line.style.transform = "translateY(-50%)";

        if (legendStyle.borderTop) line.style.borderTop = legendStyle.borderTop;
        if (legendStyle.backgroundColor) line.style.backgroundColor = legendStyle.backgroundColor;

        symbolDiv.appendChild(line);

        // ➕ Add decorator marker if defined
        if (borderConfig.decorator?.type === "marker") {
          const html = borderConfig.decorator.symbolOptions?.markerOptions?.icon?.options?.html;
          if (html) {
            const markerEl = document.createElement("div");
            markerEl.innerHTML = html;
            markerEl.style.position = "absolute";
            markerEl.style.left = "50%";
            markerEl.style.top = "50%";

            // Default transform values
            let shiftY = "-50%";
            let shiftX = "-50%";
            let rotation = "0deg";

            // Apply decorator legendStyle if defined
            if (entry.border) {
              const borderConfig = borderStyles[entry.border];
              const decoratorLegendStyle = borderConfig?.decorator?.legendStyle || {};

              if (decoratorLegendStyle.upwardShift) {
                shiftY = `calc(-50% - ${decoratorLegendStyle.upwardShift})`;
              }

              if (decoratorLegendStyle.rotation) {
                rotation = `${decoratorLegendStyle.rotation}deg`;
              }
            }

            markerEl.style.transform = `translate(${shiftX}, ${shiftY}) rotate(${rotation})`;
            symbolDiv.appendChild(markerEl);
          }
        }
      }
    } else if (entry.area_fill) {
      const fillConfig = areaFillStyles[entry.area_fill];
      if (fillConfig?.legendStyle) {
        const style = fillConfig.legendStyle;
        for (const key in style) {
          symbolDiv.style[key] = style[key];
        }
      }
    }

    item.appendChild(symbolDiv);

    const labelSpan = document.createElement("span");
    labelSpan.className = "legend-name";
    labelSpan.textContent = entry.name || entry.value;
    item.appendChild(labelSpan);

    // 🔁 Track visibility state
    let visible = true;

    // 🔁 Add click handler to toggle layer visibility
    item.addEventListener("click", () => {
      const layers = voronoiLayers[entry.layer_id];
      if (!layers) return;

      const { borders = [], areaFills = [] } = layers;
      const allLayers = [...borders, ...areaFills];

      allLayers.forEach(layer => {
        if (visible) {
          map.removeLayer(layer);
        } else {
          map.addLayer(layer);
        }
      });

      visible = !visible;
      item.style.opacity = visible ? "1" : "0.4"; // Optional visual feedback
    });

    container.appendChild(item);
  });
}

/**************************** Draw Legend ****************************/

async function drawMap(mapId, metadata) {
  const mapMeta = metadata.find(m => m.map_id === mapId);
  if (!mapMeta) return;

  const legendList = mapMeta.layers || [];

  cleanMap();

  /**************************** Define features list with map data ****************************/

  const features = [];

  // Index the data rows from data/data.csv by point_id for fast lookup
  const dataByPointId = Object.fromEntries(
    data.map(row => [row.point_id, row])
  );

  // Process each point
  for (const point of points) {
    const [latStr, lonStr] = point.Coordinates.split(",");
    const lat = Number(latStr.trim());
    const lon = Number(lonStr.trim());

    const activeSymbols = [];
    const activeBorderGroups = [];
    const activeAreaFillGroups = [];

    // Look up corresponding data row
    const dataRow = dataByPointId[point.point_id];
    if (!dataRow) continue; // skip if no data

    for (const layer of legendList) {
      const colKey = `${mapId}/${layer.layer_id}`;
      const cellValue = dataRow[colKey];

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
        id: point.point_id,
        place_name: point["City Name Today"] && point["City Name Today"].trim() !== "" 
          ? point["City Name Today"] 
          : point["Original City Name"],
        activeSymbols,
        activeBorderGroups,
        activeAreaFillGroups
      }
    });
  }

  /**************************** Draw data on the map ****************************/

  symbolLayer = addSymbolLayerToMap(features, map);

  fetch('data/map_boundaries.geojson') // Load the map boundaries from geojson
  .then(res => res.json())
  .then(geojson => {
    const clippingGeometry = geojson.features[0];

    // Add the map boundaries to the map
    L.geoJSON(clippingGeometry, {
      style: {
        color: "green",       // black border
        weight: 2,           // line thickness
        fill: false          // don't fill the area
      }
    }).addTo(map);

    // Draw the borders and area fills using Voronoi diagram approach
    voronoiLayers = drawVoronoiLayers(features, legendList, map, clippingGeometry);

    updateLegend(legendList, mapMeta.map_name, voronoiLayers, map);
  });
}

///////////////////////////////////////////////////// Initialize Everything //////////////////////////////////////////////////////////

init();