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



export function drawVoronoiBorders(features, legendList, map, boundingBox = [14, 52, 23, 56]) {

  const coords = features.map(feature => [
    feature.geometry.coordinates[0],
    feature.geometry.coordinates[1]
  ]);

  if (coords.length < 3) return;

  // Compute convex hull (as a GeoJSON polygon)
  const hullCoords = d3.polygonHull(coords);
  if (!hullCoords) return;

  // Close the polygon
  if (hullCoords[0][0] !== hullCoords[hullCoords.length - 1][0] ||
      hullCoords[0][1] !== hullCoords[hullCoords.length - 1][1]) {
    hullCoords.push(hullCoords[0]);
  }

  const convexHull = turf.polygon([[...hullCoords]]); // GeoJSON format

  for (const layer of legendList) {
    if (!layer.border) continue;

    const layerId = layer.layer_id;

    const delaunay = d3.Delaunay.from(coords);
    const voronoi = delaunay.voronoi(boundingBox);

    const borderLines = [];

    for (let e = 0; e < delaunay.halfedges.length; ++e) {
      const j = delaunay.halfedges[e];
      if (j < e) continue;

      const p = delaunay.triangles[e];
      const q = delaunay.triangles[j];

      const feature1 = features[p];
      const feature2 = features[q];

      if (
        !feature1 || !feature2 ||
        !feature1.properties.activeBorderGroups ||
        !feature2.properties.activeBorderGroups
      ) continue;

      if (
        feature1.properties.activeBorderGroups.includes(layerId) ===
        feature2.properties.activeBorderGroups.includes(layerId)
      ) continue;

      const v1 = voronoi.cellPolygon(p);
      const v2 = voronoi.cellPolygon(q);
      if (!v1 || !v2) continue;

      const edgeIndex1 = v1.findIndex(pt => v2.some(pt2 => pt[0] === pt2[0] && pt[1] === pt2[1]));
      const edgeIndex2 = (edgeIndex1 + 1) % v1.length;

      if (edgeIndex1 === -1 || !v1[edgeIndex1] || !v1[edgeIndex2]) continue;

      const edgeStart = v1[edgeIndex1];
      const edgeEnd = v1[edgeIndex2];

      const line = turf.lineString([
        [edgeStart[0], edgeStart[1]],
        [edgeEnd[0], edgeEnd[1]]
      ]);

      // Delete the line's part that is outside of the convex hull
      const clipped = turf.lineIntersect(line, convexHull);
      const startInside = turf.booleanPointInPolygon(turf.point([edgeStart[0], edgeStart[1]]), convexHull);
      const endInside = turf.booleanPointInPolygon(turf.point([edgeEnd[0], edgeEnd[1]]), convexHull);

      if (startInside && endInside) {
        borderLines.push([
          [edgeStart[1], edgeStart[0]],
          [edgeEnd[1], edgeEnd[0]]
        ]);
      } else if (startInside || endInside) {
        if (clipped.features.length > 0) {
          const intersection = clipped.features[0].geometry.coordinates;
          const inside = startInside ? edgeStart : edgeEnd;

          borderLines.push([
            [inside[1], inside[0]],
            [intersection[1], intersection[0]]
          ]);
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
}