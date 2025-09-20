import { cleanEditingEnv, removeLayerFromEditedMap } from "../../cleaning.js";
import {createRightEditSidebar } from "./rightEditSidebar.js"

// src/ui/components/addLayerButton.js
export function createAddLayerButton({ onAdd, title = "Dodaj nową warstwę" }) {
  const addBtn = document.createElement("span");
  addBtn.textContent = "+";
  addBtn.title = title;
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
  addBtn.onclick = onAdd;

  return addBtn;
}

// src/ui/components/headingWrapper.js
export function createHeadingWrapper({ headingText, buttonElement }) {
  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.justifyContent = "space-between";
  wrapper.style.alignItems = "center";
  wrapper.style.marginTop = "10px";

  const heading = document.createElement("strong");
  heading.textContent = headingText;

  wrapper.appendChild(heading);
  if (buttonElement) wrapper.appendChild(buttonElement);

  return wrapper;
}

// =====================================
// Layer box in the editing mode
// =====================================

function getSelectedPointIds(allLayersCsvData, selectedColumn) {
  return allLayersCsvData.filter(row => row[selectedColumn] === 1).map(row => row.point_id);
}

function handleLayerBoxEdit(layerMetadata, box, cleanEditingEnv, createRightEditSidebar) {
  cleanEditingEnv();
  const preselected = getSelectedPointIds(window.AppState.editedMapAllLayersCsvData, layerMetadata.layer_id);
  console.log("handleLayerBoxEdit:preselected: ", preselected)
  createRightEditSidebar(layerMetadata, preselected);
  document.querySelectorAll(".layer-box").forEach(b => b.style.backgroundColor = "#fff");
  box.style.backgroundColor = "#f8d7da";
}

function handleLayerBoxDelete(layerMetadata, box, cleanEditingEnv) {
  removeLayerFromEditedMap(layerMetadata.layer_id);
  box.remove();
  cleanEditingEnv();
}

/**
 * Creates a Layer Box component
 * @param {Object} props
 * @param {Object} props.layerMetadata - Layer data ({ layer_id, name })
 * @param {boolean} [props.isEditing=false] - Whether this layer is currently being edited
 * @param {Function} props.onEdit - Callback for edit action: (layerMetadata, box) => void
 * @param {Function} props.onDelete - Callback for delete action: (layerMetadata, box) => void
 * @returns {HTMLDivElement} - The container div for the layer box
 */
export function createLayerBox({ layerId, layerMetadata, onEdit, onDelete }) {
  console.log("createLayerBox with:")
  console.log("layerMedata: ", layerMetadata);
  console.log("layerId: ", layerId);
  
  // Container box
  const box = document.createElement("div");
  box.className = "layer-box";
  box.id = `layer-box-${layerId}`;
  box.style.display = "flex";
  box.style.justifyContent = "space-between";
  box.style.alignItems = "center";
  box.style.padding = "6px 10px";
  box.style.margin = "6px 0";
  box.style.border = "1px solid black";
  box.style.borderRadius = "4px";
  box.style.backgroundColor = "#fff";
  box.style.cursor = "default";

  // Label
  const label = document.createElement("span");
  label.textContent = `Warstwa ${layerId}`;
  label.style.flex = "1";
  box.appendChild(label);

  // Controls container
  const controls = document.createElement("div");
  controls.style.display = "flex";
  controls.style.gap = "6px";

  // Edit icon
  const editIcon = document.createElement("span");
  editIcon.innerHTML = "✎";
  editIcon.title = "Edytuj";
  editIcon.style.cursor = "pointer";
  editIcon.onclick = () => {
    if (typeof onEdit === "function") onEdit(layerMetadata, box);
  };

  // Delete icon
  const deleteIcon = document.createElement("span");
  deleteIcon.innerHTML = "✕";
  deleteIcon.title = "Usuń";
  deleteIcon.style.cursor = "pointer";
  deleteIcon.onclick = () => {
    if (typeof onDelete === "function") onDelete(layerMetadata, box);
  };

  controls.append(editIcon, deleteIcon);
  box.appendChild(controls);

  return box;
}

export function createLayerList({ layers = [], smallestFreeLayerId, cleanEditingEnv, createRightEditSidebar }) {
  const layerList = document.createElement("ul");
  layerList.id = "layer-list";

  layers.forEach(layer => {
    const layerId = window.AppState.smallestFreeLayerId;
    window.AppState.smallestFreeLayerId++;
    const box = createLayerBox({
      layerMetadata: layer,
      layerId: layerId,
      onEdit: (metadata, box) => handleLayerBoxEdit(metadata, box, cleanEditingEnv, createRightEditSidebar),
      onDelete: (metadata, box) => handleLayerBoxDelete(metadata, box, cleanEditingEnv)
    });
    layerList.appendChild(box);
  });

  return { layerList, nextFreeLayerId: smallestFreeLayerId };
}

export function renderLayersSidebar({ sidebar, cleanEditingEnv }) {
  window.AppState.smallestFreeLayerId = 0;
  // --- ADD BUTTON ---
  const addBtn = createAddLayerButton({
    onAdd: () => {
      const layerId = window.AppState.smallestFreeLayerId;
      window.AppState.smallestFreeLayerId++;
      const newLayerMetadata = { layer_id: layerId, name: `Warstwa ${layerId}` };
      const box = createLayerBox({
        layerMetadata: newLayerMetadata,
        layerId: layerId,
        onEdit: (metadata, box) => handleLayerBoxEdit(metadata, box, cleanEditingEnv, createRightEditSidebar),
        onDelete: (metadata, box) => handleLayerBoxDelete(metadata, box, cleanEditingEnv)
      });
      document.getElementById("layer-list")?.appendChild(box);
    }
  });

  // --- HEADING WRAPPER ---
  const headingWrapper = createHeadingWrapper({
    headingText: "Istniejące warstwy",
    buttonElement: addBtn
  });
  sidebar.appendChild(headingWrapper);

  // --- LAYER LIST ---
  const existingLayers = window.AppState.editedMapMetadata?.layers || [];
  const { layerList, nextFreeLayerId } = createLayerList({
    layers: existingLayers,
    cleanEditingEnv,
    createRightEditSidebar
  });
  sidebar.appendChild(layerList);

  return nextFreeLayerId; // Return updated free layer ID
}