////////////////////////////////////////////////////// Load Map Modal Creation ///////////////////////////////////////////////////////////////

import { createFileInput, createModalButtons } from './elementDefinitions.js'
import { loadExternalMapFiles } from '../../io.js';

export function createLoadMapModal({ editLoadedMap, displayLoadedMap }) {
  // --- Modal overlay ---
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

  // --- Modal content ---
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

  // --- Title + Close Button Wrapper ---
  const titleWrapper = document.createElement("div");
  titleWrapper.style.display = "flex";
  titleWrapper.style.justifyContent = "space-between"; // title left, close button right
  titleWrapper.style.alignItems = "center";             // vertical alignment
  titleWrapper.style.width = "100%";                    // fill modal width

  // Title
  const title = document.createElement("h3");
  title.textContent = "Załaduj dane mapy";
  title.style.margin = 0; // remove default margins for perfect alignment

  // Close button
  const closeBtn = document.createElement("span");
  closeBtn.innerHTML = "&times;";
  closeBtn.style.cursor = "pointer";
  closeBtn.onclick = () => (modalOverlay.style.display = "none");

  // Add both to wrapper
  titleWrapper.appendChild(title);
  titleWrapper.appendChild(closeBtn);

  // File inputs
  const jsonInput = createFileInput("Definicja stylu mapy w formacie JSON:", "json-file", ".json");
  const csvInput = createFileInput("CSV z danymi:", "csv-file", ".csv");

  // Add spacer
  const spacer = document.createElement("div");
  spacer.style.height = "12px";

  // Submit buttons
  const { wrapper: buttonsWrapper, editBtn, submitBtn } = createModalButtons();

  // Assemble modal
  modalContent.append(titleWrapper, jsonInput.wrapper, csvInput.wrapper, spacer, buttonsWrapper);
  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);

  // Clicking outside modal closes it
  modalOverlay.onclick = e => { if (e.target === modalOverlay) modalOverlay.style.display = "none"; };

  // --- Attach behavior to buttons ---
  submitBtn.onclick = async () => {
    const loadedData = await loadExternalMapFiles(jsonInput.input.files[0], csvInput.input.files[0]);
    modalOverlay.style.display = "none";
    console.log("Loaded data: ", loadedData);
    if (!loadedData) return;
    if (typeof displayLoadedMap === "function") displayLoadedMap(loadedData);
  };

  editBtn.onclick = async () => {
    const loadedData = await loadExternalMapFiles(jsonInput.input.files[0], csvInput.input.files[0]);
    console.log("Loaded data: ", loadedData);
    modalOverlay.style.display = "none";
    if (!loadedData) return;
    if (typeof editLoadedMap === "function") editLoadedMap(loadedData);
  };

  return {
    modalOverlay,
    jsonInput,
    csvInput,
    editBtn,
    submitBtn,
    open: () => {
      jsonInput.input.value = "";
      csvInput.input.value = "";
      modalOverlay.style.display = "flex";
    }
  };
}