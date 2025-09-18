import { loadAtlas, loadPointCoordsWithData, saveEditedLayer, initMapMetadata, createEmptyCsvData, loadExternalMapFiles} from './src/io.js';
import { cleanMap, cleanEditingEnv, resetEditedMapData, cleanLayerData, removeLayerFromEditedMap } from './src/cleaning.js';
import { preloadAllSymbols, getSymbol, getAllSymbolNames } from './src/symbolLoader.js';
import { addSymbolLayerToMap, drawVoronoiLayers, addEmptyPointsLayer } from './src/drawingUtils.js';
import { borderStyles, areaFillStyles } from './src/styleConfig.js';
import { createInput, createButton, createLayerBox, createFileInput, createModalButtons } from '/src/elementDefinitions.js'


////////////////////////////////////////////// Initial load of all data and layout setup //////////////////////////////////////////////////

// Encapsulate all globals in a single object
window.AppState = {
  selectedAtlas: null,               // str: which atlas is currently selected
  map: null,                         // Leaflet map object
  data: null,                         // d3 parsed CSV data: main dataset (array of objects)
  points: null,                       // d3 parsed CSV data: points dataset (array of objects)
  metadata: null,                     // JSON object: metadata of the atlas
  editing_mode: false,                // bool: whether editing mode is active
  editedMapMetadata: null,            // object: stores edited metadata temporarily
  editedMapAllLayersCsvData: null,    // object/array: stores CSV data of all layers while editing
  clippingGeometry: null,             // GeoJSON Feature: the main clipping geometry of the map
  clippingGeometryLayer: null,        // Leaflet layer: the layer added to the map for clippingGeometry
  boundingBox: null,                  // array [minX, minY, maxX, maxY]: bounding box of clippingGeometry
  symbolLayer: null,                  // Leaflet layer: layer holding point symbols on the map
  voronoiLayers: null                 // object: stores Voronoi layers, each with possible sublayers (borders, areaFills)
};

function showWelcomePopup() {
  const modalOverlay = document.createElement("div");
  modalOverlay.className = "welcome-modal-overlay";

  const modalContent = document.createElement("div");
  modalContent.className = "welcome-modal-content";

  const title = document.createElement("h2");
  title.textContent = "Wersja Cyfrowa Atlasu Językowego Kaszubszczyzny";

  const subtitle1 = document.createElement("h3");
  subtitle1.textContent = "Cel";

  const generalMessage = document.createElement("p");
  generalMessage.textContent = "Ta strona prezentuje działanie środowiska do digitalizacji atlasów gwarowych i językowych. Jako przykład wybrano mapy i punkty z Atlasu Językowego Kaszubszczyzny. Interfejs opartemy na \"klikaniu\" i \"przeciąganiu myszką\" pozwala na bardzo szybką digitalizację map z różnych atlasów językowych nawet osobom słabo radzącym sobie z komputerem.";

  const subtitle2 = document.createElement("h3");
  subtitle2.textContent = "Stawka";

  const stakeMessage = document.createElement("p");
  stakeMessage.textContent = "Wydane w Polsce atlasy językowe obejmują tysiące map językowych bardzo wysokiej jakości. Liczba wszystkich punktów na opracowanych w systematyczny sposób i wydanych w Polsce mapach sięga być może nawet miliona. Te dane nie są obecnie dostępne do bezpośredniego wykorzystania do badań ilościowych. Dzięki digitalizacji, dane z atlasów mogą być łatwo udostępnione w Internecie oraz wykorzystane do ilościowych analiz (geo-)lingwistycznych. Możliwe będzie także powiązanie geograficzne danych lingwistycznych z innymi bazami danych na temat polskiej geografii społecznej, ekonomicznej i geografii historycznej.";


  const okButton = document.createElement("button");
  okButton.textContent = "OK";
  okButton.className = "welcome-ok-button";
  okButton.onclick = () => {
    modalOverlay.remove();
  };

  modalContent.appendChild(title);
  modalContent.appendChild(subtitle1);
  modalContent.appendChild(generalMessage);
  modalContent.appendChild(subtitle2);
  modalContent.appendChild(stakeMessage);
  modalContent.appendChild(okButton);
  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);
}

async function init() {
  showWelcomePopup();
  await preloadAllSymbols();

  /**************************** Define map layer ****************************/
  window.AppState.map = L.map("map").setView([54.0, 18.0], 8.2);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19
  }).addTo(window.AppState.map);

  /**************************** Add Legend Box ****************************/
  const legendControl = L.control({ position: "topright" });
  legendControl.onAdd = function (map) {
    const div = L.DomUtil.create("div", "legend-container");
    div.id = "legend";
    return div;
  };
  legendControl.addTo(window.AppState.map);

  /**************************** Load Atlas ****************************/
  window.AppState.selectedAtlas = "kashubian_atlas";

  // define data, points, metadata, clippingGeometry, clipppingGeometryLayer,
  // and boundingBox attributes of window.AppState with loadAtlas().
  await loadAtlas();

  /**************************** Render UI ****************************/
  renderSidebar();
}

///////////// Data processing functions /////////////

function getSelectedPointIds(allLayersCsvData, selectedColumn) {
  return allLayersCsvData.filter(row => row[selectedColumn] === 1).map(row => row.point_id);
}

////////////////////////////////////////////////////// Logic for sidebar rendering //////////////////////////////////////////////////////////////

function renderSidebar(loadedData) {
  const sidebar = document.getElementById("sidebar");
  sidebar.innerHTML = ""; 

  if (window.AppState.editing_mode) {
    window.AppState.editedMapAllLayersCsvData = loadedData ? cleanLayerData(loadedData) : window.AppState.points.map(p => ({ point_id: p.point_id }));
    window.AppState.editedMapMetadata = initMapMetadata(loadedData);

    renderEditingSidebar(sidebar);

  } else {
    renderViewingSidebar(sidebar);
  }
}

// =========================
// EDITING MODE SIDEBAR
// =========================
function renderEditingSidebar(sidebar) {

  console.log("window.AppState.editedMapAllLayersCsvData: ", window.AppState.editedMapAllLayersCsvData);
  console.log("window.AppState.editedMapMetadata: ", window.AppState.editedMapMetadata);
  // Remove any existing right sidebar
  document.getElementById("right-sidebar")?.remove();

  let smallestFreeLayerId = 0;

  // --- BACK BUTTON ---
  const backBtn = createButton("← Powrót", () => {
    window.AppState.editing_mode = false;
    resetEditedMapData();
    renderSidebar(); // Re-render normal view
    document.getElementById("right-sidebar")?.remove();
  }, { marginBottom: "10px" });
  backBtn.id = "back-button";
  sidebar.appendChild(backBtn);

  // --- MAP METADATA INPUTS ---
  const { label: idLabel, input: idInput } = createInput("ID mapy", "map-id-input", "np. XV.1");
  if (window.AppState.editedMapMetadata.map_id) { idInput.value = window.AppState.editedMapMetadata.map_id; delete window.AppState.editedMapMetadata.map_id; }
  sidebar.appendChild(idLabel);
  sidebar.appendChild(idInput);

  const { label: nameLabel, input: nameInput } = createInput("Nazwa mapy", "map-name-input", "np. Granice dialektów na obszarze AJK");
  if (window.AppState.editedMapMetadata.map_name) { nameInput.value = window.AppState.editedMapMetadata.map_name; delete window.AppState.editedMapMetadata.map_name; }
  sidebar.appendChild(nameLabel);
  sidebar.appendChild(nameInput);

  const { label: authorLabel, input: authorInput } = createInput("Autor", "map-author-input", "np. Jan Kowalski");
  if (window.AppState.editedMapMetadata.author) { authorInput.value = window.AppState.editedMapMetadata.author; delete window.AppState.editedMapMetadata.author; }
  sidebar.appendChild(authorLabel);
  sidebar.appendChild(authorInput);

  // --- EXISTING LAYERS HEADING + ADD BUTTON ---
  const headingWrapper = document.createElement("div");
  headingWrapper.style.display = "flex";
  headingWrapper.style.justifyContent = "space-between";
  headingWrapper.style.alignItems = "center";
  headingWrapper.style.marginTop = "10px";

  const heading = document.createElement("strong");
  heading.textContent = "Istniejące warstwy";

  const addBtn = document.createElement("span");
  addBtn.textContent = "+";
  addBtn.title = "Dodaj nową warstwę";
  addBtn.style.cursor = "pointer";
  addBtn.style.marginLeft = "10px";
  addBtn.style.fontSize = "16px";
  addBtn.style.userSelect = "none";
  addBtn.style.padding = "2px 6px";
  addBtn.style.border = "1px solid #ccc";
  addBtn.style.borderRadius = "4px";
  addBtn.style.backgroundColor = "#eee";
  addBtn.style.color = "#333";

  addBtn.onmouseover = () => { addBtn.style.backgroundColor = "#ddd"; };
  addBtn.onmouseout = () => { addBtn.style.backgroundColor = "#eee"; };

  addBtn.onclick = () => {
    const layerId = smallestFreeLayerId++;
    const newLayerMetadata = { layer_id: layerId, name: `Warstwa ${layerId}` };
    const box = createLayerBox(newLayerMetadata, smallestFreeLayerId, cleanEditingEnv, layerRightSidebar);
    layerList.appendChild(box);
  };

  headingWrapper.appendChild(heading);
  headingWrapper.appendChild(addBtn);
  sidebar.appendChild(headingWrapper);

  const layerList = document.createElement("ul");
  layerList.id = "layer-list";
  sidebar.appendChild(layerList);

  // Render existing layers
  if (window.AppState.editedMapMetadata.layers && Array.isArray(window.AppState.editedMapMetadata.layers)) {
    window.AppState.editedMapMetadata.layers.forEach(layer => {
      const box = createLayerBox(layer, smallestFreeLayerId, cleanEditingEnv, layerRightSidebar);
      layerList.appendChild(box);
      if (layer.layer_id >= smallestFreeLayerId) smallestFreeLayerId = layer.layer_id + 1;
    });
  }

  // --- DOWNLOAD BUTTON ---
  const downloadBtn = createButton("Pobierz gotową mapę", () => {
    // Expand metadata
    window.AppState.editedMapMetadata.map_id = idInput.value;
    window.AppState.editedMapMetadata.map_name = nameInput.value;
    window.AppState.editedMapMetadata.author = authorInput.value;

    const mapId = window.AppState.editedMapMetadata.map_id;

    // Rename CSV headers
    const originalHeaders = Object.keys(window.AppState.editedMapAllLayersCsvData[0]);
    const renamedHeaders = originalHeaders.map(col => col === "point_id" ? "point_id" : `${mapId}/${col}`);
    const renamedCsvData = editedMapAllLayersCsvData.map(row => {
      const renamedRow = {};
      for (const key of originalHeaders) {
        renamedRow[key === "point_id" ? "point_id" : `${mapId}/${key}`] = row[key];
      }
      return renamedRow;
    });

    // CSV download
    const csvRows = renamedCsvData.map(row => renamedHeaders.map(h => JSON.stringify(row[h] ?? "")).join(";"));
    const csvContent = [renamedHeaders.join(";"), ...csvRows].join("\n");
    const csvBlob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const csvUrl = URL.createObjectURL(csvBlob);
    const csvLink = document.createElement("a");
    csvLink.href = csvUrl;
    csvLink.download = "mapa_dane.csv";
    csvLink.click();
    URL.revokeObjectURL(csvUrl);

    // JSON metadata download
    const jsonBlob = new Blob([JSON.stringify(window.AppState.editedMapMetadata, null, 2)], { type: "application/json" });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonLink = document.createElement("a");
    jsonLink.href = jsonUrl;
    jsonLink.download = "mapa_metadata.json";
    jsonLink.click();
    URL.revokeObjectURL(jsonUrl);

  }, { backgroundColor: "#007bff", color: "white", border: "none", marginTop: "auto" });

  downloadBtn.id = "download-map-button";
  sidebar.appendChild(downloadBtn);

  // Clear map for editing mode
  cleanMap();
}

// =========================
// VIEWING MODE SIDEBAR
// =========================
function renderViewingSidebar(sidebar) {
  // --- ATLAS SELECT ---
  const atlasLabel = document.createElement("label");
  atlasLabel.setAttribute("for", "atlas-select");
  atlasLabel.textContent = "Wybierz atlas:";
  sidebar.appendChild(atlasLabel);

  const atlasSelect = document.createElement("select");
  atlasSelect.id = "atlas-select";
  atlasSelect.className = "select-sidebar";
  atlasSelect.style.width = "100%";
  atlasSelect.style.padding = "6px";
  atlasSelect.style.fontSize = "14px";
  sidebar.appendChild(atlasSelect);

  const atlasOptions = {
    "kashubian_atlas": "Atlas Językowy Kaszubszczyzny",
    "magp_atlas": "Mały Atlas Gwar Polskich"
  };

  Object.entries(atlasOptions).forEach(([folder, label]) => {
    const opt = document.createElement("option");
    opt.value = folder;
    opt.textContent = label;
    atlasSelect.appendChild(opt);
  });

  // --- MAP SELECTION ---
  const labelSelect = document.createElement("label");
  labelSelect.setAttribute("for", "map-select");
  labelSelect.id = "map-label";
  labelSelect.textContent = "Wybierz mapę:";
  sidebar.appendChild(labelSelect);

  const mapSelect = document.createElement("select");
  mapSelect.id = "map-select";
  mapSelect.className = "select-sidebar";
  sidebar.appendChild(mapSelect);

  const labelAuthor = document.createElement("label");
  labelAuthor.setAttribute("for", "map-author");
  labelAuthor.id = "author-label";
  labelAuthor.textContent = "Autor:";
  sidebar.appendChild(labelAuthor);

  const authorBox = document.createElement("div");
  authorBox.id = "map-author";
  sidebar.appendChild(authorBox);

  const loadMapBtn = createButton("Załaduj mapę");
  const modalElements = createLoadMapModal();
  attachModalBehavior(loadMapBtn, modalElements);
  sidebar.appendChild(loadMapBtn);

  const newMapBtn = createButton("Stwórz nową mapę", () => {
    window.AppState.editing_mode = true;
    renderSidebar({
      csv: createEmptyCsvData(), // your CSV with only point_id
      metadata: { "layers": []}                   // empty metadata object
    });
  });
  sidebar.appendChild(newMapBtn);

  // --- HELPER FUNCTION: Populate map select ---
  function updateMapSelect() {
    mapSelect.innerHTML = ""; // clear previous options
    if (window.AppState.metadata && Array.isArray(window.AppState.metadata)) {
      window.AppState.metadata.forEach(entry => {
        const opt = document.createElement("option");
        opt.value = entry.map_id;
        opt.textContent = entry.map_id + " " + entry.map_name;
        mapSelect.appendChild(opt);
      });

      mapSelect.addEventListener("change", () => {
        const selectedId = mapSelect.value;
        const selectedMeta = window.AppState.metadata.find(m => m.map_id === selectedId);
        if (selectedMeta) authorBox.textContent = selectedMeta.author || "";
        displayMap(selectedId, undefined);
      });

      // select the first map by default
      if (window.AppState.metadata.length > 0) {
        mapSelect.value = window.AppState.metadata[0].map_id;
        authorBox.textContent = window.AppState.metadata[0].author || "";
        displayMap(window.AppState.metadata[0].map_id, undefined);
      }
    }
  }

  // --- GLOBAL VARIABLE ---
  if (window.AppState.selectedAtlas) {
    window.AppState.selectedAtlas = Object.keys(atlasOptions)[0];
  }
  atlasSelect.value = window.AppState.selectedAtlas;

  // initially populate map select
  updateMapSelect();

  // --- ATLAS CHANGE HANDLER ---
  atlasSelect.addEventListener("change", async () => {
    window.AppState.selectedAtlas = atlasSelect.value;

    // define data, points, metadata, clippingGeometry, clipppingGeometryLayer,
    // and boundingBox attributes of window.AppState with loadAtlas().
    await loadAtlas();
    updateMapSelect();
  });
}


////////////////////////////////////////////////////// Logic for map creating //////////////////////////////////////////////////////////////

function createDecoratorSelector(decoratorType, items, prechosenOption = "") {
  const container = document.createElement("div");
  container.style.position = "relative";
  container.style.userSelect = "none";

  // Current selected display
  const selectedDisplay = document.createElement("div");
  selectedDisplay.style.border = "1px solid #ccc";
  selectedDisplay.style.padding = "6px 8px";
  selectedDisplay.style.cursor = "pointer";
  selectedDisplay.style.display = "flex";
  selectedDisplay.style.alignItems = "center";
  selectedDisplay.style.gap = "6px";

  // Placeholder text when nothing selected
  selectedDisplay.textContent = "Wybierz dekorator";

  const iconWrapper = document.createElement("div");
  selectedDisplay.prepend(iconWrapper);

  // Arrow
  const arrow = document.createElement("span");
  arrow.textContent = "▼";
  arrow.style.marginLeft = "auto";
  selectedDisplay.appendChild(arrow);

  container.appendChild(selectedDisplay);

  // Dropdown list (hidden by default)
  const dropdown = document.createElement("div");
  dropdown.style.position = "absolute";
  dropdown.style.top = "100%";
  dropdown.style.left = "0";
  dropdown.style.right = "0";
  dropdown.style.border = "1px solid #ccc";
  dropdown.style.backgroundColor = "#fff";
  dropdown.style.maxHeight = "150px";
  dropdown.style.overflowY = "auto";
  dropdown.style.zIndex = "1001";
  dropdown.style.display = "none";
  container.appendChild(dropdown);

  // Function to update selected display with chosen name
  function setSelected(name) {
    iconWrapper.innerHTML = "";
    iconWrapper.appendChild(createLegendIcon(decoratorType, name, false));
    selectedDisplay.textContent = "";
    selectedDisplay.appendChild(iconWrapper);
    const label = document.createElement("span");
    label.textContent = name;
    selectedDisplay.appendChild(label);
    selectedDisplay.appendChild(arrow);

    // Dispatch event to notify external listeners
    container.dispatchEvent(new CustomEvent("decoratorSelected", {
      detail: { decoratorType, decoratorName: name },
      bubbles: true
    }));
  }

  // Populate dropdown options
  items.forEach(name => {
    const option = document.createElement("div");
    option.style.padding = "6px 8px";
    option.style.display = "flex";
    option.style.alignItems = "center";
    option.style.gap = "6px";
    option.style.cursor = "pointer";

    // Create icon element
    const icon = createLegendIcon(decoratorType, name, false);
    icon.style.width = "18px";
    icon.style.height = "18px";
    iconWrapper.style.width = "18px";
    iconWrapper.style.height = "18px";

    option.appendChild(icon);
    const label = document.createElement("span");
    label.textContent = name;
    option.appendChild(label);

    option.addEventListener("click", () => {
      setSelected(name);
      dropdown.style.display = "none";
    });

    dropdown.appendChild(option);
  });

  selectedDisplay.addEventListener("click", () => {
    dropdown.style.display = dropdown.style.display === "none" ? "block" : "none";
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", e => {
    if (!container.contains(e.target)) {
      dropdown.style.display = "none";
    }
  });

  // If prechosenOption is valid, set it as selected right away
  if (prechosenOption && items.includes(prechosenOption)) {
    setSelected(prechosenOption);
  }

  return container;
}

/************************************************* Layer editing sidebar *******************************************/

function layerRightSidebar(saveEditedLayer, layerMetadata, preselectedPoints) {

  /////////////////////// Define sidebar style ///////////////////////

  document.getElementById("right-sidebar")?.remove();

  const rightSidebar = document.createElement("aside");
  rightSidebar.id = "right-sidebar";
  rightSidebar.classList.add("right-sidebar");
  // You can remove inline styles now since CSS covers them, but left here just in case
  rightSidebar.style.position = "absolute";
  rightSidebar.style.top = "0";
  rightSidebar.style.right = "0";
  rightSidebar.style.width = "300px";
  rightSidebar.style.height = "100%";
  rightSidebar.style.backgroundColor = "#f0f0f0";
  rightSidebar.style.padding = "16px";
  rightSidebar.style.borderLeft = "1px solid #ccc";
  rightSidebar.style.boxShadow = "-2px 0 4px rgba(0,0,0,0.1)";
  rightSidebar.style.zIndex = "1000";

  /////////////////////// Define fields for entering layer metadata ///////////////////////

  // Layer name
  const nameLabel = document.createElement("label");
  nameLabel.textContent = "Nazwa warstwy";
  rightSidebar.appendChild(nameLabel);

  const nameRow = document.createElement("div");
  nameRow.style.display = "flex";
  nameRow.style.gap = "8px";
  nameRow.style.marginBottom = "16px";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "np. granice dialektów";
  nameInput.style.flex = "1";

  // Check if layerMetadata has a key "name" and set the input value
  if (layerMetadata && "name" in layerMetadata) {
    nameInput.value = layerMetadata.name;
  }

  nameRow.appendChild(nameInput);
  rightSidebar.appendChild(nameRow);

  // Layer type
  const typeLabel = document.createElement("label");
  typeLabel.textContent = "Typ warstwy";
  rightSidebar.appendChild(typeLabel);

  const typeSelect = document.createElement("select");
  typeSelect.style.marginTop = "4px";
  rightSidebar.appendChild(typeSelect);

  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";      // empty string means no selection
  defaultOpt.textContent = "-- Wybierz typ warstwy --";
  defaultOpt.selected = true; // make it selected by default
  typeSelect.appendChild(defaultOpt);

  ["Symbol", "Powierzchnia", "Granica"].forEach(option => {
    const opt = document.createElement("option");
    opt.value = option;
    opt.textContent = option;
    typeSelect.appendChild(opt);
  });

  const textToDecorTypeId = {
    "Symbol": "symbol",
    "Powierzchnia": "area_fill",
    "Granica": "border"
  };

  // Check if the decorator type value was already passed in the metadata. If yes, use it.
  const keys = { symbol: "Symbol", area_fill: "Powierzchnia", border: "Granica" };
  const layerKeys = Object.keys(keys);
  const preselectedKey = layerKeys.find(key => layerMetadata?.hasOwnProperty(key));
  typeSelect.value = preselectedKey ? keys[preselectedKey] : "";

  // Placeholder for decorator select
  const decoratorContainer = document.createElement("div");
  decoratorContainer.style.marginTop = "16px";
  rightSidebar.appendChild(decoratorContainer);

  // Container for selected points label + scrollable container
  let selectedPointsLabel = null;
  let selectedPointsContainer = null;
  let saveButton = null;

  // Define your event handler as a separate function:
  function onTypeSelectChange() {
    decoratorContainer.innerHTML = "";
    if (selectedPointsLabel) selectedPointsLabel.remove();
    if (selectedPointsContainer) selectedPointsContainer.remove();

    const selected = typeSelect.value;
    if (!selected) return;

    let items = [];

    if (selected === "Symbol") {
      items = getAllSymbolNames();
    } else if (selected === "Powierzchnia") {
      items = Object.keys(areaFillStyles || {});
    } else if (selected === "Granica") {
      items = Object.keys(borderStyles || {});
    }

    const selectedType = textToDecorTypeId[selected];

    let prechosenOption;
    if (layerMetadata?.[selectedType]) {
      prechosenOption = layerMetadata[selectedType];
    }
    else {
      prechosenOption = "";
    }

    const decoratorSelector = createDecoratorSelector(selectedType, items, prechosenOption);
    decoratorContainer.appendChild(decoratorSelector);

    /////////////////////// Logic if layer metadata was defined ///////////////////////
    // Add listener
    function handleDecoratorSelected(e) {
      layerMetadata[selectedType] = e.detail.decoratorName;

      // Add "Zapisz" button below decorator selector
      if (!saveButton) {
        saveButton = document.createElement("button");
        saveButton.textContent = "Zapisz";
        saveButton.style.marginTop = "12px";
        saveButton.style.padding = "10px";
        saveButton.style.backgroundColor = "#007bff";
        saveButton.style.color = "white";
        saveButton.style.border = "none";
        saveButton.style.cursor = "pointer";
        saveButton.style.borderRadius = "4px";
        rightSidebar.appendChild(saveButton);

        saveButton.addEventListener("click", () => {
          const selectedIds = layerControl.getSelectedPointIds();
          layerMetadata["name"] = nameInput.value;
          saveEditedLayer(
            layerMetadata,   // the metadata of the layer being edited
            selectedIds      // array of selected point IDs
          );

          cleanEditingEnv();

          const layerBox = document.getElementById(`layer-box-${layerMetadata["layer_id"]}`);

          // Trim name to 20 characters
          let name = nameInput.value.trim();
          if (name.length > 20) {
            name = name.slice(0, 20) + "...";
          }

          // Find the label <span> inside the layerBox
          const label = layerBox.querySelector("span"); // the first span is the label
          if (label) {
            label.textContent = `${layerMetadata["layer_id"]}: ${name}`;
          }
        });
      }

      if (!selectedPointsLabel) {
        selectedPointsLabel = document.createElement("label");
        selectedPointsLabel.textContent = "Wybrane punkty";
        selectedPointsLabel.style.marginTop = "16px";
        rightSidebar.appendChild(selectedPointsLabel);
      }

      if (!selectedPointsContainer) {
        selectedPointsContainer = document.createElement("div");
        selectedPointsContainer.id = "selected-points-container";
        rightSidebar.appendChild(selectedPointsContainer);
      }

      // Draw the map and add the editing toolkit
      const layerControl = drawEditMap(undefined, preselectedPoints = preselectedPoints);
    }

    decoratorSelector.addEventListener("decoratorSelected", handleDecoratorSelected);

    // 🩹 Trigger manually if prechosen
    if (prechosenOption && items.includes(prechosenOption)) {
      handleDecoratorSelected({
        detail: {
          decoratorType: selectedType,
          decoratorName: prechosenOption
        }
      });
    }
  }

  typeSelect.addEventListener("change", onTypeSelectChange);

  // Call once on init to set decoratorSelector if there is a preselected type
  if (typeSelect.value) {
    onTypeSelectChange();
  }

  typeSelect.addEventListener("change", onTypeSelectChange);

  document.body.appendChild(rightSidebar);
}


////////////////////////////////////////////////////// Logic for map loading ///////////////////////////////////////////////////////////////

// ==============================
// Load Map Modal Creation
// ==============================
function createLoadMapModal() {
  const modalOverlay = document.createElement("div");
  modalOverlay.id = "load-map-modal";
  modalOverlay.style.display = "none"; // initially hidden
  modalOverlay.style.position = "fixed";
  modalOverlay.style.top = 0;
  modalOverlay.style.left = 0;
  modalOverlay.style.width = "100%";
  modalOverlay.style.height = "100%";
  modalOverlay.style.backgroundColor = "rgba(0,0,0,0.5)";
  modalOverlay.style.justifyContent = "center";
  modalOverlay.style.alignItems = "center";
  modalOverlay.style.zIndex = 1000;

  const modalContent = document.createElement("div");
  modalContent.id = "load-map-modal-content";
  modalContent.style.backgroundColor = "white";
  modalContent.style.padding = "20px";
  modalContent.style.borderRadius = "6px";
  modalContent.style.width = "400px";
  modalContent.style.maxWidth = "90%";
  modalContent.style.display = "flex";
  modalContent.style.flexDirection = "column";
  modalContent.style.gap = "12px";

  // Close button
  const closeBtn = document.createElement("span");
  closeBtn.id = "close-modal";
  closeBtn.innerHTML = "&times;";
  closeBtn.style.alignSelf = "flex-end";
  closeBtn.style.cursor = "pointer";

  // Title
  const title = document.createElement("h3");
  title.textContent = "Załaduj dane mapy";

  // JSON input
  const jsonInput = createFileInput("Definicja stylu mapy w formacie JSON:", "json-file", ".json");

  // CSV input
  const csvInput = createFileInput("CSV z danymi:", "csv-file", ".csv");

  // Add spacer
  const spacer = document.createElement("div");
  spacer.style.height = "12px"; // or any value

  // Submit buttons
  const { editBtn, submitBtn } = createModalButtons();

  // Assemble modal
  modalContent.append(closeBtn, title, jsonInput.wrapper, csvInput.wrapper, spacer, createModalButtons().wrapper);
  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);

  // Close modal behavior
  closeBtn.onclick = () => (modalOverlay.style.display = "none");
  modalOverlay.onclick = e => { if (e.target === modalOverlay) modalOverlay.style.display = "none"; };

  return { modalOverlay, jsonInput, csvInput, editBtn, submitBtn };
}

// ==============================================
// Attach behavior to load map modal buttons
// ==============================================
function attachModalBehavior(loadMapBtn, modalElements) {
  const { modalOverlay, jsonInput, csvInput, editBtn, submitBtn } = modalElements;

  // Open modal (attach to main button outside)
  loadMapBtn.onclick = () => {
    modalOverlay.style.display = "flex";
    jsonInput.input.value = "";
    csvInput.input.value = "";
  };

  submitBtn.onclick = async () => {
    const loadedData = await loadExternalMapFiles(jsonInput.input.files[0], csvInput.input.files[0]);
    if (!loadedData) return;

    window.AppState.metadata.push(loadedData.metadata);

    // Merge CSV data into existing `data`
    const newDataMap = new Map(loadedData.csv.map(row => [row.point_id, row]));
    for (const row of data) {
      const newValues = newDataMap.get(row.point_id);
      if (newValues) {
        for (const [k, v] of Object.entries(newValues)) {
          if (k !== "point_id") row[k] = v;
        }
      }
    }

    renderSidebar();
    modalOverlay.style.display = "none";
  };

  editBtn.onclick = async () => {
    const loadedData = await loadExternalMapFiles(jsonInput.input.files[0], csvInput.input.files[0]);
    if (!loadedData) return;
    window.AppState.editing_mode = true;
    renderSidebar(loadedData);
    modalOverlay.style.display = "none";
  };
}

////////////////////////////////////////////////////// Logic for map showing ///////////////////////////////////////////////////////////////

/**************************** Define function for legend decorators preparation ****************************/
function createLegendIcon(decorator_type, decorator_name, asHTML = false) {
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

function updateLegend(legendList, mapName) {
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

/**************************** Draw Map ****************************/

function displayMap(mapId = "", preselectedPoints = []) {

  cleanMap();

  if (mapId == "") {
    console.log("Error. No mapId provided");
    return { error: "No mapId provided" };
  }
  else {
    const mapMeta = window.AppState.metadata.find(m => m.map_id === mapId);
    if (!mapMeta) return;

    const legendList = mapMeta.layers || [];

    /**************************** Define features list with map data ****************************/

    const features = loadPointCoordsWithData(mapId, legendList);

    /**************************** Draw data on the map ****************************/

    // Add symbols to the map. Modifies window.AppState.symbolLayer.
    addSymbolLayerToMap(features);

    /**
     * Draw the borders and area fills using Voronoi diagram approach.
     *
     * Global variables updated:
     * - window.AppState.voronoiLayers
     * - voronoi polylines added to window.AppState.map (drawVoronoiBorders)
     * - Voronoi area fills added to window.AppState.map (drawVoronoiAreaFills)
     */
    drawVoronoiLayers(features, legendList);

    // Update the legend to show the decorators and descriptions
    updateLegend(legendList, mapMeta.map_name);
    
    return {"layer": symbolLayer}
  }
}

function drawEditMap(mapId = "", metadata=[], preselectedPoints = []) {
  const features = loadPointCoordsWithData();

    // Add symbols to the map
    const layerControl = addEmptyPointsLayer(features, preselectedPoints)

    window.AppState.symbolLayer = layerControl.layer

    return layerControl
}

///////////////////////////////////////////////////// Initialize Everything //////////////////////////////////////////////////////////

init();