import { getPosition } from "./geolocation.js";
import { loadTargets } from "./data.js";
import { computeTonight, MIN_ALTITUDE, MAX_MAGNITUDE, MAX_TRANSIT_OFFSET_HOURS } from "./rank.js";
import { renderAll, renderStatus, renderError } from "./render.js";

const root = document.getElementById("app");

async function run() {
  renderStatus(root, "Requesting your location…");
  let coord;
  try {
    coord = await getPosition();
  } catch (err) {
    renderError(
      root,
      "AstroPlan Tonight needs your location to compute which targets are up tonight. " +
        "Please allow location access and reload the page."
    );
    return;
  }

  renderStatus(root, "Loading targets…");
  let targets;
  try {
    targets = await loadTargets();
  } catch (err) {
    renderError(root, "Couldn't load the target list. Please reload the page.");
    return;
  }

  const state = computeTonight(targets, coord.lat, coord.lon);
  renderAll(root, {
    ...state,
    minAltitude: MIN_ALTITUDE,
    maxMagnitude: MAX_MAGNITUDE,
    maxTransitOffsetHours: MAX_TRANSIT_OFFSET_HOURS,
  });
}

run();
