// src/ui/components/sidebarBackButton.js

/**
 * Creates a back button for the sidebar
 * @param {Object} props - Configuration object
 * @param {Function} props.onClick - Callback to run when button is clicked
 * @param {string} [props.text] - Button label (default: "← Powrót")
 * @param {Object} [props.styles] - Optional CSS styles (camelCase keys)
 * @returns {HTMLButtonElement} - The button element
 */
export function createSidebarBackButton({ onClick, text = "← Powrót", styles = {} }) {
  const button = document.createElement("button");
  button.textContent = text;
  button.id = "back-button";
  button.className = "sidebar-back-button";

  // Apply custom styles if provided
  Object.entries(styles).forEach(([key, value]) => {
    button.style[key] = value;
  });

  // Set click behavior
  button.addEventListener("click", () => {
    if (typeof onClick === "function") onClick();
  });

  return button;
}

///////////// UI creation functions /////////////
/**
 * Creates a labeled input element
 * @param {string} labelText - Text for the label
 * @param {string} id - ID for the input element
 * @param {string} [placeholder=""] - Placeholder text for the input
 * @returns {Object} - { label: HTMLLabelElement, input: HTMLInputElement }
 */
export function createLabeledTextInput(labelText, id, placeholder = "") {
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