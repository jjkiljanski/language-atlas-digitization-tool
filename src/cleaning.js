/**************************** Function for total map cleaning ****************************/
export function cleanMap() {

  // Clean Legend
  const container = document.querySelector('.legend-container');
  container.innerHTML = "";

  // Clean Map
  if (window.AppState.symbolLayer) window.AppState.map.removeLayer(window.AppState.symbolLayer);
  if (window.AppState.voronoiLayers) {
    for (const layerId in window.AppState.voronoiLayers) {
      const layerGroup = window.AppState.voronoiLayers[layerId];

      // Remove border layers if present
      if (layerGroup.borders) {
        layerGroup.borders.forEach(layer => window.AppState.map.removeLayer(layer));
      }

      // Remove area fill layers if present
      if (layerGroup.areaFills) {
        layerGroup.areaFills.forEach(layer => window.AppState.map.removeLayer(layer));
      }
    }
  }
  console.log("Cleaned map.")
}

// Function for cleaning up the editing environment
export function cleanEditingEnv() {
  document.getElementById("right-sidebar")?.remove(); // remove the right sidebar
  document.querySelectorAll(".layer-box").forEach(b => { // color the background of all the layers to neutral
    b.style.backgroundColor = "";
  });
  window.AppState.map.removeLayer(window.AppState.symbolLayer); // remove the points from the map

  // Remove existing drawControl if it exists
  if (window.AppState.map._drawControl) {
    window.AppState.map.removeControl(window.AppState.map._drawControl);
  }
}

export function resetEditedMapData () {
  window.AppState.editedMapAllLayersCsvData = createEmptyCsvData();
  window.AppState.editedMapMetadata = { "layers": []};
}

export function cleanLayerData(loadedData) {
  return loadedData["csv"].map(row => {
    const cleanedRow = { point_id: row.point_id };
    for (const key in row) {
      if (key !== "point_id" && key.includes("/")) {
        const [, layerId] = key.split("/");
        cleanedRow[layerId] = row[key] === "0" ? 0 : row[key] === "1" ? 1 : row[key];
      }
    }
    return cleanedRow;
  });
}

export function removeLayerFromEditedMap(layerId) {
  window.AppState.editedMapMetadata.layers = window.AppState.editedMapMetadata.layers.filter(layer => layer.layer_id !== layerId);
  window.AppState.editedMapAllLayersCsvData.forEach(row => delete row[layerId]);
}