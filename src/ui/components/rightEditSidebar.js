import { preloadAllSymbols, getSymbol, getAllSymbolNames } from '../map-display/symbolLoader.js';
import { borderStyles } from '../map-display/borderFillStyleConfig.js';
import { areaFillStyles } from '../map-display/areaFillStyleConfig.js';
import { cleanEditingEnv, removeLayerFromEditedMap } from "../../cleaning.js";
import { saveEditedLayer, loadPointCoordsWithData } from '../../io.js';
import { addEditPointsLayer } from '../map-display/mapDisplayUtils.js';
import { createLegendIcon } from './legend.js'

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

function drawEditMap(preselectedPoints = []) {
  const features = loadPointCoordsWithData();

  // Add symbols to the map
  const layerControl = addEditPointsLayer(features, preselectedPoints);

  window.AppState.symbolLayer = layerControl.layer;

  return layerControl
}

/************************************************* Layer editing sidebar *******************************************/

export function createRightEditSidebar(layerMetadata, preselectedPoints) {

  console.log("createRightEditSidebar:preselectedPoints", preselectedPoints);

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
      const layerControl = drawEditMap(preselectedPoints = preselectedPoints);
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