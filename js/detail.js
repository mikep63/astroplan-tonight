// Per-target detail computation, mirroring the "Tonight" section of the app's
// ObjectDetailView.swift with only the data available client-side here:
// the altitude curve through the night, current altitude, peak (with time),
// tonight's transit, and separation from the Moon. Pure math over altaz.js +
// sunmoon.js — no ranking/filtering (a detail view is shown for whichever
// object was tapped, even one the Tonight list filtered out).
import * as altaz from "./altaz.js";
import { moonEquatorial } from "./sunmoon.js";

const CURVE_STEP_MINUTES = 10;
const DEG2RAD = Math.PI / 180;

/** Great-circle angle (degrees) between two equatorial points. */
function angularSeparation(ra1, dec1, ra2, dec2) {
  const cos =
    Math.sin(dec1 * DEG2RAD) * Math.sin(dec2 * DEG2RAD) +
    Math.cos(dec1 * DEG2RAD) * Math.cos(dec2 * DEG2RAD) * Math.cos((ra1 - ra2) * DEG2RAD);
  return Math.acos(Math.min(Math.max(cos, -1), 1)) / DEG2RAD;
}

/**
 * @param obj    a target record (needs raDegrees/decDegrees)
 * @param state  the computed Tonight state: { window, sunset, sunrise, observer }
 * @returns { curve, spanStart, spanEnd, current, peak, transit, moonSeparation }
 */
export function computeDetail(obj, latDeg, lonDeg, state, now = new Date()) {
  const { window, sunset, sunrise, observer } = state;

  // Plot the whole night the target could be observed, sunset..sunrise, so the
  // curve shows its full rise/culminate/set arc; fall back to padding the
  // darkness window when the sun events aren't available.
  const spanStart = sunset ?? new Date(window.start.getTime() - 3600000);
  const spanEnd = sunrise ?? new Date(window.end.getTime() + 3600000);

  const curve = [];
  for (let t = spanStart.getTime(); t <= spanEnd.getTime(); t += CURVE_STEP_MINUTES * 60000) {
    const d = new Date(t);
    const p = altaz.position(obj.raDegrees, obj.decDegrees, latDeg, lonDeg, d);
    curve.push({ time: d, altitude: p.altitude });
  }

  const current =
    now >= spanStart && now <= spanEnd
      ? altaz.position(obj.raDegrees, obj.decDegrees, latDeg, lonDeg, now)
      : null;

  const peak = altaz.peak(obj.raDegrees, obj.decDegrees, latDeg, lonDeg, window);

  // Same anchoring as rank.js so the reported transit is tonight's, not an
  // arbitrary future one.
  const windowMid = new Date((window.start.getTime() + window.end.getTime()) / 2);
  const transitAnchor = new Date(windowMid.getTime() - 12 * 3600 * 1000);
  const transit = altaz.transit(obj.raDegrees, obj.decDegrees, latDeg, lonDeg, transitAnchor);

  const moonEq = moonEquatorial(transit.date, observer);
  const moonSeparation = angularSeparation(obj.raDegrees, obj.decDegrees, moonEq.ra, moonEq.dec);

  return { curve, spanStart, spanEnd, current, peak, transit, moonSeparation };
}
