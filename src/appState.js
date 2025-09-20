const AppState = {
  selectedAtlas: null,               // str: which atlas is currently selected
  map: null,                         // Leaflet map object
  data: null,                         // d3 parsed CSV data: main dataset (array of objects)
  points: null,                       // d3 parsed CSV data: points dataset (array of objects)
  metadata: null,                     // JSON object: metadata of the atlas
  editing_mode: false,                // bool: whether editing mode is active
  editedMapMetadata: null,            // object: stores edited metadata temporarily
  editedMapSmallestFreeLayerId: null, // int: stores the lowest free layerId available for the currently edited map
  editedMapAllLayersCsvData: null,    // object/array: stores CSV data of all layers while editing
  clippingGeometry: null,             // GeoJSON Feature: the main clipping geometry of the map
  clippingGeometryLayer: null,        // Leaflet layer: the layer added to the map for clippingGeometry
  boundingBox: null,                  // array [minX, minY, maxX, maxY]: bounding box of clippingGeometry
  symbolLayer: null,                  // Leaflet layer: layer holding point symbols on the map
  voronoiLayers: null                 // object: stores Voronoi layers, each with possible sublayers (borders, areaFills)
};

export default AppState;