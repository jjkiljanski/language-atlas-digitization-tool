import { getSymbol } from "../map-display/symbolLoader.js";
import { areaFillStyles } from "../map-display/areaFillStyleConfig.js";
import { borderStyles } from "../map-display/borderFillStyleConfig.js";

export function createEmptyLegendDiv(map) {
  // Create the container div
  const div = document.createElement("div");
  div.className = "legend-container";
  div.id = "legend";

  // Optionally, you can fill it with content here
  div.innerHTML = `
    <h4>Legend</h4>
    <ul>
      <li><span class="symbol circle"></span> Circle</li>
      <li><span class="symbol triangle"></span> Triangle</li>
      <li><span class="symbol rectangle"></span> Rectangle</li>
    </ul>
  `;

  // Prevent clicks from propagating to the map
  div.addEventListener("click", (e) => e.stopPropagation());

  // Attach to Leaflet map using L.Control if needed
  const legendControl = L.control({ position: "topright" });
  legendControl.onAdd = function () {
    return div;
  };
  legendControl.addTo(map);

  // Return the container in case we want to update it later
  return div;
}

/**************************** Define function for legend decorators preparation ****************************/
export function createLegendIcon(decorator_type, decorator_name, asHTML = false) {
  const symbolDiv = document.createElement("div");
  symbolDiv.className = "legend-symbol";
  symbolDiv.style.width = "24px";
  symbolDiv.style.height = "24px";
  symbolDiv.style.position = "relative";

  if (decorator_type === "symbol") {
    symbolDiv.innerHTML = getSymbol(decorator_name) || "";

  } else if (decorator_type === "border") {
    const borderConfig = borderStyles[decorator_name];
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

      if (borderConfig.decorator?.type === "marker") {
        const html = borderConfig.decorator.symbolOptions?.markerOptions?.icon?.options?.html;
        if (html) {
          const markerEl = document.createElement("div");
          markerEl.innerHTML = html;
          markerEl.style.position = "absolute";
          markerEl.style.left = "50%";
          markerEl.style.top = "50%";

          let shiftY = "-50%";
          let shiftX = "-50%";
          let rotation = "0deg";

          const decoratorLegendStyle = borderConfig.decorator.legendStyle || {};
          if (decoratorLegendStyle.upwardShift) {
            shiftY = `calc(-50% - ${decoratorLegendStyle.upwardShift})`;
          }
          if (decoratorLegendStyle.rotation) {
            rotation = `${decoratorLegendStyle.rotation}deg`;
          }

          markerEl.style.transform = `translate(${shiftX}, ${shiftY}) rotate(${rotation})`;
          symbolDiv.appendChild(markerEl);
        }
      }
    }

  } else if (decorator_type === "area_fill") {
    const fillConfig = areaFillStyles[decorator_name];
    if (fillConfig?.legendStyle) {
      const style = fillConfig.legendStyle;
      for (const key in style) {
        symbolDiv.style[key] = style[key];
      }
    }
  }

  return asHTML ? symbolDiv.outerHTML : symbolDiv;
}

/**************************** Define Legend ****************************/

export function updateLegend(legendList, mapName) {
  const container = document.querySelector('.legend-container');
  container.innerHTML = "";

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
    item.style.cursor = "pointer";

    let symbolEl = null;

    if (entry.symbol) {
      symbolEl = createLegendIcon("symbol", entry.symbol);
    } else if (entry.border) {
      symbolEl = createLegendIcon("border", entry.border);
    } else if (entry.area_fill) {
      symbolEl = createLegendIcon("area_fill", entry.area_fill);
    }

    if (symbolEl) item.appendChild(symbolEl);

    const labelSpan = document.createElement("span");
    labelSpan.className = "legend-name";
    labelSpan.textContent = entry.name || entry.value;
    item.appendChild(labelSpan);

    let visible = true;

    item.addEventListener("click", () => {
      const layers = window.AppState.voronoiLayers[entry.layer_id];
      if (!layers) return;

      const { borders = [], areaFills = [] } = layers;
      const allLayers = [...borders, ...areaFills];

      allLayers.forEach(layer => {
        visible ? window.AppState.map.removeLayer(layer) : window.AppState.map.addLayer(layer);
      });

      visible = !visible;
      item.style.opacity = visible ? "1" : "0.4";
    });

    container.appendChild(item);
  });
}