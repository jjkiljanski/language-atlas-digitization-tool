import { addClippingGeometry, findBoundingBox} from './src/drawingUtils.js';

// --- ATLAS CHANGE HANDLER ---
// This function uses the currently selected atlas (window.AppState.selectedAtlas) to load
// and define data, points, metadata, clippingGeometry, clipppingGeometryLayer,
// and boundingBox attributes of window.AppState.
export async function loadAtlas() {
  folder = window.AppState.selectedAtlas;
  try {
    function noCache(url) {
      return `${url}?_=${Date.now()}`;
    }

    const [csvResp, metadataResp, boundariesResp, pointsResp] = await Promise.all([
      fetch(noCache(`data/${folder}/data.csv`)),
      fetch(noCache(`data/${folder}/metadata.json`)),
      fetch(noCache(`data/${folder}/map_boundaries.geojson`)),
      fetch(noCache(`data/${folder}/points.csv`))
    ]);

    const [csvText, metadataJson, boundariesJson, pointsText] = await Promise.all([
      csvResp.text(),
      metadataResp.json(),
      boundariesResp.json(),
      pointsResp.text()
    ]);

    // Update global data
    window.AppState.data = d3.dsvFormat(";").parse(csvText);
    window.AppState.points = d3.dsvFormat(";").parse(pointsText);
    window.AppState.metadata = metadataJson;
    window.AppState.clippingGeometry = boundariesJson.features[0];

    // Modify window.AppState.clippingGeometryLayer
    addClippingGeometry();

    window.AppState.boundingBox = findBoundingBox(window.AppState.clippingGeometry.geometry);

  } catch (err) {
    alert("Błąd podczas ładowania atlasu: " + err.message);
    console.error(err);
  }
}

/**************************** Function for GeoJSON creation for plotting ****************************/

/**
 * Generates a GeoJSON-like array of point features for map plotting.
 * Each feature includes location, place name, and styling info (symbols, borders, fills)
 * based on the provided legend list and matched data.
 *
 * @param {Array} legendList - Optional array of layer definitions with styling (symbol, border, area_fill).
 * @returns {Array} Array of GeoJSON-style Feature objects.
 */
export function loadPointCoordsWithData(mapId = "", legendList = []) {
  const features = [];

  // Index the data rows from data/data.csv by point_id for fast lookup
  const dataByPointId = Object.fromEntries(
    window.AppState.data.map(row => [row.point_id, row])
  );

  // Process each point
  for (const point of window.AppState.points) {
    if (!point.Coordinates || typeof point.Coordinates !== "string") continue;

    const coords = point.Coordinates.split(",");
    if (coords.length !== 2) continue;

    const lat = Number(coords[0].trim());
    const lon = Number(coords[1].trim());

    const activeSymbols = [];
    const activeBorderGroups = [];
    const activeAreaFillGroups = [];

    // Look up corresponding data row
    const dataRow = dataByPointId[point.point_id];
    if (!dataRow) continue; // skip if no data

    for (const layer of legendList) {
      const colKey = `${mapId}/${layer.layer_id}`;
      const cellValue = dataRow[colKey];

      if (
        cellValue === undefined || 
        cellValue === null || 
        cellValue === "0" || 
        cellValue === 0 || 
        (typeof cellValue === "string" && cellValue.trim() === "")
      ) continue;

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

    const cityNameToday = typeof point["City Name Today"] === "string" ? point["City Name Today"].trim() : "";
    const placeName = cityNameToday !== "" ? cityNameToday : point["Original City Name"];

    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lon, lat] },
      properties: {
        id: point.point_id,
        place_name: placeName,
        activeSymbols,
        activeBorderGroups,
        activeAreaFillGroups
      }
    });
  }
  return features;
}

export function saveEditedLayer(layerMetadata, selectedIds) {
  window.AppState.editedMapMetadata.layers = window.AppState.editedMapMetadata.layers.filter(layer => layer.layer_id !== layerMetadata.layer_id);
  window.AppState.editedMapMetadata.layers.push(layerMetadata);

  for (const row of window.AppState.editedMapAllLayersCsvData) {
    row[layerMetadata.layer_id] = selectedIds.includes(row.point_id) ? 1 : 0;
  }
}

export function initMapMetadata(loadedData) {
  return loadedData ? loadedData.metadata : { layers: [] };
}

export function createEmptyCsvData() {
  return window.AppState.data.map(row => ({ point_id: row.point_id }));
}

// ==============================
// Load external map files
// ==============================
export async function loadExternalMapFiles(jsonFile, csvFile) {
  if (!jsonFile || !csvFile) {
    alert("Proszę wybrać pliki JSON i CSV.");
    return;
  }

  try {
    const jsonText = await jsonFile.text();
    const csvText = await csvFile.text();
    const newMetadata = JSON.parse(jsonText);
    const newDataRows = d3.dsvFormat(";").parse(csvText);
    return { csv: newDataRows, metadata: newMetadata };
  } catch (err) {
    alert("Błąd podczas ładowania danych: " + err.message);
    console.error(err);
    return null;
  }
}