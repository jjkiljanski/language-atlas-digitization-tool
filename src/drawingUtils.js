import { getSymbol } from './symbolLoader.js';

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



export function drawVoronoiBorders(features, legendList, map, clippingGeometry, boundingBox = [14, 52, 23, 56]) {
  const coords = features.map(f => [f.geometry.coordinates[0], f.geometry.coordinates[1]]);
  if (coords.length < 3) return;

  for (const layer of legendList) {
    const layerId = layer.layer_id;
    const delaunay = d3.Delaunay.from(coords);
    const voronoi = delaunay.voronoi(boundingBox);

    // BORDER LOGIC (unchanged)
    if (layer.border) {
      const borderLines = [];

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
          borderLines.push([[a[1], a[0]], [b[1], b[0]]]);
        } else if (startInside || endInside) {
          const inside = startInside ? a : b;
          if (intersections.features.length > 0) {
            const out = intersections.features[0].geometry.coordinates;
            borderLines.push([[inside[1], inside[0]], [out[1], out[0]]]);
          }
        }
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

    // AREA FILL LOGIC
    if (layer.area_fill) {
      console.log(`Computing area fill for layer ${layerId}`);
      const groupA = features.filter(f => f.properties.activeAreaFillGroups?.includes(layerId));
      if (groupA.length === 0) continue;
      console.log(`Number of points with the feature: ${groupA.length}`);

      const fillCellPolys = [];

      let no_features_added = 0

      for (let i = 0; i < features.length; i++) {
        const f = features[i];
        const hasTrait = f.properties.activeAreaFillGroups?.includes(layerId);
        if (!hasTrait) continue;

        const cell = voronoi.cellPolygon(i);
        if (!cell) continue;

        const turfPoly = turf.polygon([[...cell, cell[0]]]); // Close the loop
        const clipped = turf.intersect(turfPoly, clippingGeometry);
        if (clipped) {
            fillCellPolys.push(clipped);
            no_features_added++;
        }
      }

      console.log(`Added ${no_features_added} clipped voronoi cells.`);

      let merged = fillCellPolys[0];
        for (let i = 1; i < fillCellPolys.length; i++) {
        try {
            merged = turf.union(merged, fillCellPolys[i]);
        } catch (e) {
            console.warn(`Error unioning polygon at index ${i}:`, e);
        }
        }
    
      console.log("Merged geometry type:", merged.geometry.type);
      console.log("Number of coordinates:", merged.geometry.coordinates.length);


      if (merged) {
        const styleId = `fill-${layerId}-${layer.area_fill}`;
        ensurePatternDefined(styleId, layer.area_fill);

        L.geoJSON(merged, {
          style: {
            fillPattern: `url(#${styleId})`,
            weight: 0,
            fillOpacity: 1
          }
        }).addTo(map);
      }
    }
  }
}

// Helper to inject SVG pattern into the DOM
function ensurePatternDefined(id, type) {
  if (document.getElementById(id)) return;

  const svgDefs = document.querySelector("svg defs") || createDefs();

  const pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
  pattern.setAttribute("id", id);
  pattern.setAttribute("patternUnits", "userSpaceOnUse");
  pattern.setAttribute("width", "10");
  pattern.setAttribute("height", "10");

  const shape = document.createElementNS("http://www.w3.org/2000/svg", "path");
  shape.setAttribute("stroke", "#000");
  shape.setAttribute("stroke-width", "1");

  if (type === "vertical_stripes") {
    shape.setAttribute("d", "M0,0 L0,10");
  } else if (type === "horizontal_stripes") {
    shape.setAttribute("d", "M0,0 L10,0");
  } else if (type === "dots") {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "5");
    circle.setAttribute("cy", "5");
    circle.setAttribute("r", "1.5");
    circle.setAttribute("fill", "#000");
    pattern.appendChild(circle);
  }

  if (type !== "dots") {
    pattern.appendChild(shape);
  }

  svgDefs.appendChild(pattern);
}

function createDefs() {
  let svg = document.querySelector("svg");
  if (!svg) {
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.position = "absolute";
    svg.style.width = 0;
    svg.style.height = 0;
    document.body.appendChild(svg);
  }

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  svg.appendChild(defs);
  return defs;
}