import { displayMap } from "../map-display/mapDisplayUtils.js";
import { createButton, createSidebarBackButton, createLabeledTextInput } from "./elementDefinitions.js";
import { createLoadMapModal } from "./loadMapModal.js";
import { cleanMap, cleanLayerData, cleanEditingEnv, resetEditedMapData } from "../../cleaning.js";
import { loadAtlas, createEmptyCsvData, initMapMetadata, mergeCsvDataIntoApp } from "../../io.js";
import { renderLayersSidebar } from "./leftEditSidebar.js";

////////////////////////////////////////////////////// Logic for sidebar rendering //////////////////////////////////////////////////////////////

export function renderSidebar(loadedData) {
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
export function renderEditingSidebar(sidebar) {

  console.log("window.AppState.editedMapAllLayersCsvData: ", window.AppState.editedMapAllLayersCsvData);
  console.log("window.AppState.editedMapMetadata: ", window.AppState.editedMapMetadata);
  // Remove any existing right sidebar
  document.getElementById("right-sidebar")?.remove();

  const backBtn = createSidebarBackButton({
    onClick: () => {
      AppState.editing_mode = false;
      resetEditedMapData();
      renderSidebar(); // Re-render normal view
      document.getElementById("right-sidebar")?.remove();
    },
    styles: { marginBottom: "10px" }
  });

  sidebar.appendChild(backBtn);

  // --- MAP METADATA INPUTS ---
  const { label: idLabel, input: idInput } = createLabeledTextInput("ID mapy", "map-id-input", "np. XV.1");
  if (window.AppState.editedMapMetadata.map_id) { idInput.value = window.AppState.editedMapMetadata.map_id; delete window.AppState.editedMapMetadata.map_id; }
  sidebar.appendChild(idLabel);
  sidebar.appendChild(idInput);

  const { label: nameLabel, input: nameInput } = createLabeledTextInput("Nazwa mapy", "map-name-input", "np. Granice dialektów na obszarze AJK");
  if (window.AppState.editedMapMetadata.map_name) { nameInput.value = window.AppState.editedMapMetadata.map_name; delete window.AppState.editedMapMetadata.map_name; }
  sidebar.appendChild(nameLabel);
  sidebar.appendChild(nameInput);

  const { label: authorLabel, input: authorInput } = createLabeledTextInput("Autor", "map-author-input", "np. Jan Kowalski");
  if (window.AppState.editedMapMetadata.author) { authorInput.value = window.AppState.editedMapMetadata.author; delete window.AppState.editedMapMetadata.author; }
  sidebar.appendChild(authorLabel);
  sidebar.appendChild(authorInput);

  // Render the layers sidebar using the new modular components
  renderLayersSidebar({
    sidebar,
    cleanEditingEnv
  });

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
    const renamedCsvData = window.AppState.editedMapAllLayersCsvData.map(row => {
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
  const loadMapModal = createLoadMapModal({
    editLoadedMap: loadedData => {
      window.AppState.editing_mode = true;
      renderSidebar(loadedData);
    },
    displayLoadedMap: loadedData => {
      window.AppState.metadata.push(loadedData.metadata);
      mergeCsvDataIntoApp(loadedData.csv);
      renderSidebar();
    }
  });
  loadMapBtn.onclick = () => loadMapModal.open();
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