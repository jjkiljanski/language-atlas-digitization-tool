///////////// UI creation functions /////////////
export function createInput(labelText, id, placeholder = "") {
  const label = document.createElement("label");
  label.textContent = labelText;

  const input = document.createElement("input");
  input.id = id;
  input.placeholder = placeholder;
  input.style.width = "100%";

  return { label, input };
}

export function createButton(text, onClick, styles = {}) {
  const btn = document.createElement("button");
  btn.textContent = text;
  Object.assign(btn.style, styles);
  btn.onclick = onClick;
  return btn;
}

// =====================================
// Layer box in the editing mode
// =====================================

export function createLayerBox(layerMetadata, smallestFreeLayerId, cleanEditingEnv, layerRightSidebar) {
  const layerId = layerMetadata.layer_id;
  if (layerId >= smallestFreeLayerId) smallestFreeLayerId = layerId + 1;

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
  box.style.backgroundColor = "#fff"; // optional
  box.style.cursor = "default";

  // Label
  const label = document.createElement("span");
  label.textContent = layerMetadata.name || `Warstwa ${layerId}`;
  label.style.flex = "1";
  box.appendChild(label);

  // Controls container
  const controls = document.createElement("div");
  controls.style.display = "flex";
  controls.style.gap = "6px"; // spacing between icons

  // Edit icon
  const editIcon = document.createElement("span");
  editIcon.innerHTML = "✎";
  editIcon.title = "Edytuj";
  editIcon.style.cursor = "pointer";
  editIcon.onclick = () => {
    cleanEditingEnv();
    const preselected = getSelectedPointIds(window.AppState.editedMapAllLayersCsvData, layerId);
    layerRightSidebar(saveEditedLayer, layerMetadata, preselected);
    // Highlight the currently edited layer
    document.querySelectorAll(".layer-box").forEach(b => b.style.backgroundColor = "#fff");
    box.style.backgroundColor = "#f8d7da";
  };

  // Delete icon
  const deleteIcon = document.createElement("span");
  deleteIcon.innerHTML = "✕";
  deleteIcon.title = "Usuń";
  deleteIcon.style.cursor = "pointer";
  deleteIcon.onclick = () => {
    removeLayerFromEditedMap(layerId);
    box.remove();
    cleanEditingEnv();
  };

  controls.append(editIcon, deleteIcon);
  box.appendChild(controls);

  return box;
}

// =====================================
// Create file input for load map modal
// =====================================
export function createFileInput(labelText, inputId, accept) {
  const wrapper = document.createElement("div");
  const label = document.createElement("label");
  label.textContent = labelText;
  const input = document.createElement("input");
  input.type = "file";
  input.id = inputId;
  input.accept = accept;
  wrapper.append(label, input);
  wrapper.style.display = "flex";
  wrapper.style.flexDirection = "column";
  return { wrapper, input };
}

// ==========================================
// Create load map modal buttons
// ==========================================
export function createModalButtons() {
  const submitWrapper = document.createElement("div");
  submitWrapper.style.display = "flex";
  submitWrapper.style.justifyContent = "space-between";

  const editWrapper = document.createElement("div");
  const submitWrapperRight = document.createElement("div");

  const editBtn = document.createElement("button");
  editBtn.textContent = "Edytuj mapę";
  editBtn.style.cursor = "pointer";
  editWrapper.appendChild(editBtn);

  const submitBtn = document.createElement("button");
  submitBtn.textContent = "Wyświetl mapę";
  submitBtn.style.cursor = "pointer";
  submitWrapperRight.appendChild(submitBtn);

  submitWrapper.append(editWrapper, submitWrapperRight);

  return { wrapper: submitWrapper, editBtn, submitBtn };
}