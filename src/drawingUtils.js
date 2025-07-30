import { getSymbol } from './symbolLoader.js';
import { areaFillStyles, borderStyles } from './styleConfig.js';

export function addSymbolLayerToMap(features, map) {
  const geoLayer = L.geoJSON({ type: "FeatureCollection", features }, {
    pointToLayer: (feature, latlng) => {
      const { id, activeSymbols } = feature.properties;

      const container = document.createElement("div");
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.alignItems = "center";
      container.style.justifyContent = "center";
      container.style.width = "30px";
      container.style.userSelect = "none";

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

      const symbolRow = document.createElement("div");
      symbolRow.style.display = "flex";
      symbolRow.style.flexDirection = "row";
      symbolRow.style.justifyContent = "center";
      symbolRow.style.alignItems = "center";

      for (const sym of activeSymbols) {
        const symDiv = document.createElement("div");
        symDiv.innerHTML = getSymbol(sym.symbol) || "";
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
      layer.bindTooltip(
        `Nr: ${id} (${place_name})<br><span class="tooltip-legend-name">${legendNames}</span>`
      );
    }
  });

  geoLayer.addTo(map);
  return geoLayer;
}

/**
 * Computes the Delaunay triangulation and Voronoi diagram for a set of features.
 * @param {Array} features - Array of GeoJSON point features with geometry.coordinates.
 * @param {Array} boundingBox - Array [xmin, ymin, xmax, ymax] defining the bounding box for Voronoi diagram.
 * @returns {Object|null} Returns an object with {delaunay, voronoi} or null if not enough points.
 */
function computeVoronoiDiagram(features, boundingBox) {
  const coords = features.map(f => [f.geometry.coordinates[0], f.geometry.coordinates[1]]);
  if (coords.length < 3) return null;

  const delaunay = d3.Delaunay.from(coords);
  const voronoi = delaunay.voronoi(boundingBox);

  return { delaunay, voronoi };
}

/**
 * Returns a properly oriented border line segment between two Voronoi cells,
 * ensuring that the side with the `layerId` feature is always on the left.
 * 
 * Uses a 2D cross product to determine if the feature cell lies to the left
 * or right of the segment, and reverses the segment if needed.
 * 
 * @param {Array} a - [x, y] coordinates of the start point of the Voronoi edge.
 * @param {Array} b - [x, y] coordinates of the end point of the Voronoi edge.
 * @param {Object} f1 - First feature object.
 * @param {Object} f2 - Second feature object.
 * @param {Array} v1 - Polygon of Voronoi cell for feature f1 (array of [x, y] coords).
 * @param {Array} v2 - Polygon of Voronoi cell for feature f2.
 * @param {string} layerId - ID of the layer used to check for active border groups.
 * @returns {Array|null} Oriented line segment as [[lat1, lng1], [lat2, lng2]], or null if invalid.
 */
function getOrientedBorderSegment(a, b, f1, f2, v1, v2, layerId) {
  // Determine which feature has the active border
  let cellPolygon;
  if ((f1.properties.activeBorderGroups || []).includes(layerId)) {
    cellPolygon = v1;
  } else if ((f2.properties.activeBorderGroups || []).includes(layerId)) {
    cellPolygon = v2;
  } else {
    return null;
  }

  // Compute centroid of the cell with the feature
  const cellCenter = turf.centroid(turf.polygon([[...cellPolygon, cellPolygon[0]]])).geometry.coordinates;

  // Convert points
  const [ax, ay] = a;
  const [bx, by] = b;
  const [cx, cy] = cellCenter;

  // Vector AB and AC
  const abx = bx - ax, aby = by - ay;
  const acx = cx - ax, acy = cy - ay;

  // Cross product AB x AC
  const cross = abx * acy - aby * acx;

  // Reverse if cell is on the right
  return cross < 0
    ? [[b[1], b[0]], [a[1], a[0]]]
    : [[a[1], a[0]], [b[1], b[0]]];
}


/**
 * Merges individual polylines into longer connected lines by joining those
 * that share endpoints. This ensures continuity of styling and reduces visual
 * artifacts caused by fragmented line segments.
 *
 * The function compares line endpoints (with fixed precision) and concatenates
 * them when they are found to be directly adjacent or reversed.
 *
 * @param {Array<Array<[number, number]>>} lines - An array of line segments,
 *        where each line is an array of [latitude, longitude] coordinate pairs.
 *        Example: [ [[lat1, lng1], [lat2, lng2]], [[lat2, lng2], [lat3, lng3]] ]
 *
 * @returns {Array<Array<[number, number]>>} - An array of merged polylines
 *        where connected lines are grouped into single continuous line arrays.
 *
 * @example
 * const segments = [
 *   [[52.0, 21.0], [52.1, 21.1]],
 *   [[52.1, 21.1], [52.2, 21.2]]
 * ];
 * const merged = connectBorderLines(segments);
 * // Result: [[[52.0, 21.0], [52.1, 21.1], [52.2, 21.2]]]
 */
function connectBorderLines(lines) {
  const connected = [];

  const toKey = ([lat, lng]) => `${lat.toFixed(6)},${lng.toFixed(6)}`;
  const endMap = new Map(); // Maps endpoint to polyline index

  lines.forEach(line => {
    const start = toKey(line[0]);
    const end = toKey(line[line.length - 1]);

    let merged = false;

    for (let i = 0; i < connected.length; i++) {
      const current = connected[i];
      const cStart = toKey(current[0]);
      const cEnd = toKey(current[current.length - 1]);

      if (start === cEnd) {
        connected[i] = current.concat(line.slice(1));
        merged = true;
        break;
      } else if (end === cStart) {
        connected[i] = line.concat(current.slice(1));
        merged = true;
        break;
      } else if (start === cStart) {
        connected[i] = line.reverse().concat(current.slice(1));
        merged = true;
        break;
      } else if (end === cEnd) {
        connected[i] = current.concat(line.reverse().slice(1));
        merged = true;
        break;
      }
    }

    if (!merged) {
      connected.push(line);
    }
  });

  return connected;
}

/**
 * Draws the Voronoi cell borders for a given layer on the Leaflet map.
 * Borders are clipped to the provided clippingGeometry polygon.
 * Each border is added as an individual Leaflet polyline layer.
 * 
 * @param {Object} layer - Layer configuration object with layer_id and border type.
 * @param {Array} features - Array of GeoJSON features.
 * @param {Object} voronoi - Voronoi diagram object from d3.Delaunay.voronoi().
 * @param {Object} delaunay - Delaunay triangulation object from d3.Delaunay.
 * @param {Object} clippingGeometry - Turf.js polygon or multipolygon for clipping.
 * @param {L.Map} map - Leaflet map instance.
 * @returns {L.Polyline[]} Array of Leaflet polyline layers added to the map,
 *                        useful for later removal.
 */
function drawVoronoiBorders(layer, features, voronoi, delaunay, clippingGeometry, map) {
  const layerId = layer.layer_id;
  const borderLines = [];
  const borderLayers = []; // Track added Leaflet layers

  for (let e = 0; e < delaunay.halfedges.length; ++e) {
    const j = delaunay.halfedges[e];
    if (j < e) continue;

    const p = delaunay.triangles[e];
    const q = delaunay.triangles[j];

    const f1 = features[p];
    const f2 = features[q];
    if (!f1 || !f2) continue;

    const g1 = f1.properties.activeBorderGroups || [];
    const g2 = f2.properties.activeBorderGroups || [];

    const oneHas = g1.includes(layerId);
    const twoHas = g2.includes(layerId);

    if (oneHas === twoHas) continue;

    const v1 = voronoi.cellPolygon(p);
    const v2 = voronoi.cellPolygon(q);
    if (!v1 || !v2) continue;

    const i = v1.findIndex(pt => v2.some(pt2 => pt[0] === pt2[0] && pt[1] === pt2[1]));
    const next = (i + 1) % v1.length;
    if (i === -1 || !v1[i] || !v1[next]) continue;

    const a = v1[i];
    const b = v1[next];

    const startInside = turf.booleanPointInPolygon(turf.point(a), clippingGeometry);
    const endInside = turf.booleanPointInPolygon(turf.point(b), clippingGeometry);
    const line = turf.lineString([a, b]);
    const intersections = turf.lineIntersect(line, clippingGeometry);

    if (startInside && endInside) {
      const orientedSegment = getOrientedBorderSegment(a, b, f1, f2, v1, v2, layerId);
      if (orientedSegment) {
        borderLines.push(orientedSegment);
      }
    } else if (startInside || endInside) {
      const inside = startInside ? a : b;
      if (intersections.features.length > 0) {
        const out = intersections.features[0].geometry.coordinates;
        borderLines.push([[inside[1], inside[0]], [out[1], out[0]]]);
      }
    }
  }

  const borderStyle = borderStyles[layer.border] || borderStyles.solid_line;
  const mergedLines = connectBorderLines(borderLines);

  mergedLines.forEach(line => {
    const polyline = L.polyline(line, {
      color: borderStyle.color,
      weight: borderStyle.weight,
      dashArray: borderStyle.dashArray || null
    }).addTo(map);

    borderLayers.push(polyline);

    const decoratorCfg = borderStyle.decorator;
    if (decoratorCfg) {
      const symbolFactory = L.Symbol[decoratorCfg.type];
      if (symbolFactory) {
        const symbol = symbolFactory(decoratorCfg.symbolOptions || {});
        const decorator = L.polylineDecorator(polyline, {
          patterns: [{
            offset: decoratorCfg.offset,
            repeat: decoratorCfg.repeat,
            symbol
          }]
        }).addTo(map);
        borderLayers.push(decorator);
      }
    }
  });

  return borderLayers; // Return all added layers
}



/**
 * Draws filled Voronoi cell areas for a given layer on the Leaflet map.
 * Areas are clipped to the provided clippingGeometry polygon.
 * Supports both pattern fills and solid color fills.
 * Each filled area is added as a Leaflet GeoJSON layer.
 * 
 * @param {Object} layer - Layer configuration object with layer_id and area_fill type.
 * @param {Array} features - Array of GeoJSON features.
 * @param {Object} voronoi - Voronoi diagram object from d3.Delaunay.voronoi().
 * @param {Object} clippingGeometry - Turf.js polygon or multipolygon for clipping.
 * @param {L.Map} map - Leaflet map instance.
 * @returns {L.Layer[]} Array of Leaflet layers added to the map,
 *                      useful for later removal.
 */
function drawVoronoiAreaFill(layer, features, voronoi, clippingGeometry, map) {
  const layerId = layer.layer_id;
  const styleConfig = areaFillStyles[layer.area_fill];
  const areaFillLayers = [];

  if (!styleConfig) {
    console.warn(`Unknown area fill style: ${layer.area_fill}`);
    return areaFillLayers;
  }

  let pattern = null;

  if (!styleConfig.isSolidFill) {
    if (!map._areaFillPatterns) map._areaFillPatterns = {};
    pattern = map._areaFillPatterns[layerId];

    if (!pattern) {
      pattern = new L.Pattern({
        width: 10,
        height: 10,
        patternUnits: 'userSpaceOnUse'
      });

      if (styleConfig.createShape) {
        styleConfig.createShape(pattern);
      }

      pattern.addTo(map);
      map._areaFillPatterns[layerId] = pattern;
    }
  }

  const groupA = features.filter(f => f.properties.activeAreaFillGroups?.includes(layerId));
  if (groupA.length === 0) return areaFillLayers;

  const fillCellPolys = [];

  for (let i = 0; i < features.length; i++) {
    const f = features[i];
    if (!f.properties.activeAreaFillGroups?.includes(layerId)) continue;

    const cell = voronoi.cellPolygon(i);
    if (!cell) continue;

    const turfPoly = turf.polygon([[...cell, cell[0]]]);
    const clipped = turf.intersect(turfPoly, clippingGeometry);
    if (clipped) fillCellPolys.push(clipped);
  }

  if (fillCellPolys.length === 0) return areaFillLayers;

  let merged = fillCellPolys[0];
  for (let i = 1; i < fillCellPolys.length; i++) {
    try {
      merged = turf.union(merged, fillCellPolys[i]);
    } catch (e) {
      console.warn(`Error unioning polygon at index ${i}:`, e);
    }
  }

  if (merged) {
    const geoJsonLayer = L.geoJSON(merged, {
      style: styleConfig.isSolidFill
        ? {
            fillColor: styleConfig.fillColor,
            fillOpacity: 0.2,
            weight: 0
          }
        : {
            fillPattern: pattern,
            fillOpacity: 1,
            weight: 0
          }
    }).addTo(map);

    areaFillLayers.push(geoJsonLayer);
  }

  return areaFillLayers;
}


/**
 * Main function to draw Voronoi borders and area fills for multiple layers on the Leaflet map.
 * Uses a clipping geometry (polygon) to restrict drawing area.
 * @param {Array} features - Array of GeoJSON point features.
 * @param {Array} legendList - Array of layer configuration objects.
 * @param {L.Map} map - Leaflet map instance.
 * @param {Object} clippingGeometry - Turf.js polygon or multipolygon for clipping.
 * @param {Array} boundingBox - Optional bounding box [xmin, ymin, xmax, ymax] for Voronoi diagram (default: [14, 52, 23, 56]).
 */
export function drawVoronoiLayers(features, legendList, map, clippingGeometry, boundingBox = [14, 52, 23, 56]) {
  let voronoiLayers = {};
  const diagrams = computeVoronoiDiagram(features, boundingBox);
  if (!diagrams) return;

  const { delaunay, voronoi } = diagrams;

  for (const layer of legendList) {
    voronoiLayers[layer.layer_id] = {};

    if (layer.border) {
      voronoiLayers[layer.layer_id].borders = drawVoronoiBorders(layer, features, voronoi, delaunay, clippingGeometry, map);
    }

    if (layer.area_fill) {
      voronoiLayers[layer.layer_id].areaFills = drawVoronoiAreaFill(layer, features, voronoi, clippingGeometry, map);
    }
  }

  return voronoiLayers;
}




////////////////////////////////////////////////// Editing mode functions ///////////////////////////////////////////////////

// Selection State
const tempSelectedPoints = new Map(); // point_id -> marker

/************************************ Function to clean the rectangle selection *********************************/
export function cleanPointSelect() {
  // Remove yellow outlines
  for (const { marker } of tempSelectedPoints.values()) {
    const iconDiv = marker.getElement();
    if (iconDiv) iconDiv.classList.remove("selected-outline");
  }

  tempSelectedPoints.clear();

  // Remove buttons
  const controls = document.getElementById("multi-select-controls");
  if (controls) controls.remove();
}

/**
 * Adds a layer of empty points to the map, each represented by a large grey circle with a point number.
 * Clicking a point turns it red and adds a corresponding entry to the right sidebar with an "X" to remove it.
 * Clicking the sidebar entry toggles the point color between green (active) and grey (inactive).
 * Removing the entry also resets the point color to grey.
 *
 * @param {Array} features - Array of GeoJSON Feature objects with "point_id" and coordinates.
 * @param {L.Map} map - The Leaflet map instance to add the layer to.
 * @returns {L.GeoJSON} - The Leaflet GeoJSON layer added to the map.
 */
export function addEmptyPointsLayer(features, map, preselectedPoints) {
  const selectedPoints = new Map();    // point_id -> { marker, box, active }
  const tempSelectedPoints = new Set(); // point_ids currently rectangle-selected
  const allMarkers = new Map();         // point_id -> marker

  function createMarkerIcon(pointId) {
    const isSelected = selectedPoints.has(pointId);
    const isActive = isSelected && selectedPoints.get(pointId).active;
    const isTempSelected = tempSelectedPoints.has(pointId);

    const fillColor = isSelected ? (isActive ? "green" : "red") : "grey";

    const div = document.createElement("div");
    div.className = "point-marker";
    div.style.backgroundColor = fillColor;
    div.style.width = "28px";
    div.style.height = "28px";
    div.style.borderRadius = "50%";
    div.style.color = "white";
    div.style.fontWeight = "bold";
    div.style.fontSize = "14px";
    div.style.textAlign = "center";
    div.style.lineHeight = "28px";
    div.style.userSelect = "none";
    div.textContent = pointId;

    if (isTempSelected) {
      div.style.boxShadow = "0 0 0 3px yellow";
    }

    return L.divIcon({
      html: div.outerHTML,
      className: "",
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
  }

  function updateMarkerIcon(pointId) {
    const marker = allMarkers.get(pointId);
    if (!marker) return;
    marker.setIcon(createMarkerIcon(pointId));
  }

  function updateAllTempSelectedIcons() {
    for (const id of tempSelectedPoints) {
      updateMarkerIcon(id);
    }
  }

  function clearTempSelection() {
    tempSelectedPoints.clear();
    for (const id of allMarkers.keys()) {
      updateMarkerIcon(id);
    }
  }

  function selectPoint(id) {
    const marker = allMarkers.get(id);
    if (!marker) return;

    // Avoid duplicate selection
    if (selectedPoints.has(id)) return;

    const selectedContainer = document.getElementById("selected-points-container");
    if (!selectedContainer) return;

    const box = document.createElement("div");
    box.className = "point-box";
    box.style.display = "flex";
    box.style.justifyContent = "space-between";
    box.style.alignItems = "center";
    box.style.marginBottom = "4px";
    box.style.border = "1px solid #ccc";
    box.style.padding = "4px 8px";
    box.style.borderRadius = "4px";

    const label = document.createElement("span");
    label.textContent = `Punkt ${id}`;
    label.style.flex = "1";
    label.style.cursor = "pointer";

    const removeBtn = document.createElement("span");
    removeBtn.textContent = "✕";
    removeBtn.className = "remove-btn";
    removeBtn.style.cursor = "pointer";
    removeBtn.style.marginLeft = "8px";

    box.appendChild(label);
    box.appendChild(removeBtn);
    selectedContainer.appendChild(box);

    let isActive = false;
    label.addEventListener("click", () => {
      isActive = !isActive;
      selectedPoints.get(id).active = isActive;
      updateMarkerIcon(id);
    });

    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      box.remove();
      selectedPoints.delete(id);
      updateMarkerIcon(id);
    });

    selectedPoints.set(id, { marker, box, active: false });
    updateMarkerIcon(id);
  }

  const geoLayer = L.geoJSON({ type: "FeatureCollection", features }, {
    pointToLayer: (feature, latlng) => {
      const { id } = feature.properties;

      const marker = L.marker(latlng, {
        icon: createMarkerIcon(id)
      });

      allMarkers.set(id, marker);

      marker.on("click", () => {
        if (selectedPoints.has(id)) {
          const { box } = selectedPoints.get(id);
          box.remove();
          selectedPoints.delete(id);
          updateMarkerIcon(id);
        } else {
          selectPoint(id);
        }
      });

      return marker;
    }
  });

  geoLayer.addTo(map);

  const drawControl = new L.Control.Draw({
    draw: {
      polygon: false,
      circle: false,
      polyline: false,
      marker: false,
      circlemarker: false,
      rectangle: true
    },
    edit: false
  });
  map.addControl(drawControl);

  // Save reference for next calls
  map._drawControl = drawControl;

  map.on(L.Draw.Event.CREATED, function (e) {
    const layer = e.layer;
    const bounds = layer.getBounds();

    for (const [id, marker] of allMarkers.entries()) {
      if (bounds.contains(marker.getLatLng())) {
        tempSelectedPoints.add(id);
      }
    }

    updateAllTempSelectedIcons();
    showMultiSelectControls(selectedPoints, tempSelectedPoints);
  });

  function showMultiSelectControls(selectedPoints, tempSelectedPoints) {
    const sidebar = document.getElementById("right-sidebar");
    if (!sidebar || tempSelectedPoints.size === 0) return;

    document.getElementById("multi-select-controls")?.remove();

    const container = document.createElement("div");
    container.id = "multi-select-controls";
    container.style.marginTop = "16px";
    container.style.display = "flex";
    container.style.gap = "8px";

    const addBtn = document.createElement("button");
    addBtn.textContent = "Dodaj wybrane punkty";
    addBtn.onclick = () => {
      for (const id of tempSelectedPoints) {
        selectPoint(id);
      }
      clearTempSelection();
      container.remove();
    };

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Odznacz wybrane punkty";
    removeBtn.onclick = () => {
      for (const id of tempSelectedPoints) {
        if (selectedPoints.has(id)) {
          const { box } = selectedPoints.get(id);
          box.remove();
          selectedPoints.delete(id);
          updateMarkerIcon(id);
        }
      }
      clearTempSelection();
      container.remove();
    };

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "X";
    cancelBtn.onclick = () => {
      clearTempSelection();
      container.remove();
    };

    container.appendChild(addBtn);
    container.appendChild(removeBtn);
    container.appendChild(cancelBtn);

    sidebar.appendChild(container);
  }

  // Select all preselected points (once markers exist)
  if (Array.isArray(preselectedPoints)) {
    for (const id of preselectedPoints) {
      // Delay to next tick to ensure markers are initialized
      setTimeout(() => selectPoint(id), 0);
    }
  }

  window.cleanPointSelect = clearTempSelection;

  return {
    layer: geoLayer,
    getSelectedPointIds: () => Array.from(selectedPoints.keys()),
    getSelectedPointsMap: () => selectedPoints,
  };
}