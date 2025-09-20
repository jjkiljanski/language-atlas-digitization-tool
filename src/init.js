// Load globals
import AppState from "./appState.js";

// The rest of imports
import { showWelcomePopup } from "./ui/components/welcomePopup.js";
import { loadAtlas } from './io.js';
import { preloadAllSymbols } from './ui/map-display/symbolLoader.js';
import { createEmptyLegendDiv } from "./ui/components/legend.js";
import { renderSidebar } from "./ui/components/sidebar.js";

////////////////////////////////////////////// Initial load of all data and layout setup //////////////////////////////////////////////////

export default async function init() {
  // set global variables
  window.AppState = AppState;

  showWelcomePopup();

  // Load all symbols used in the visualization
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
  createEmptyLegendDiv(window.AppState.map);

  /**************************** Load Atlas ****************************/
  window.AppState.selectedAtlas = "kashubian_atlas";

  // define data, points, metadata, clippingGeometry, clipppingGeometryLayer,
  // and boundingBox attributes of window.AppState with loadAtlas().
  await loadAtlas();

  /**************************** Render UI ****************************/
  renderSidebar();
}