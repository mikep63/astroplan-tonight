// DOM rendering — sun/moon summary card and the ranked target list.
// Text/formatting mirrors TonightView.swift's sun/moon section and
// ObjectRow.swift's header/caption layout.

function timeStr(date) {
  if (!date) return "—";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function durationStr(startDate, endDate) {
  const minutes = Math.round((endDate - startDate) / 60000);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function sizeStr(arcmin) {
  if (arcmin == null) return null;
  return arcmin < 10 ? `${arcmin.toFixed(1)}′` : `${Math.round(arcmin)}′`;
}

function captionParts(obj) {
  const parts = [obj.typeLabel];
  if (obj.constellation) parts.push(obj.constellation);
  if (obj.vMagnitude != null) parts.push(`mag ${obj.vMagnitude.toFixed(1)}`);
  const size = sizeStr(obj.majorAxisArcmin);
  if (size) parts.push(size);
  return parts.join(" · ");
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderSunMoon({ window, sunset, sunrise, moon }) {
  return `
    <section class="card">
      <h2>Sun / Moon</h2>
      <div class="row-line">
        <span>☀️↓ ${timeStr(sunset)}</span>
        <span>☀️↑ ${timeStr(sunrise)}</span>
      </div>
      <div class="row-line muted small">
        <span>Astro darkness ${timeStr(window.start)} – ${timeStr(window.end)}</span>
        <span>${durationStr(window.start, window.end)}</span>
      </div>
      <div class="row-line" style="margin-top:8px">
        <span>${moon.emoji} ${escapeHtml(moon.phaseName)}</span>
        <span class="muted">${Math.round(moon.illuminatedFraction * 100)}% lit</span>
      </div>
      <div class="row-line muted small">
        <span>↑ ${timeStr(moon.rise)}</span>
        <span>↓ ${timeStr(moon.set)}</span>
      </div>
    </section>
  `;
}

function renderFilterSummary(minAltitude, maxMagnitude, maxTransitOffsetHours) {
  return `<div class="filter-summary">Alt ≥ ${minAltitude}° · mag ≤ ${maxMagnitude.toFixed(1)} ` +
    `· transit ±${maxTransitOffsetHours.toFixed(1)}h of mid-darkness · 🔥 popular</div>`;
}

function renderTargetRow(row) {
  const obj = row.object;
  const secondary = obj.secondaryName
    ? `<span class="secondary">${escapeHtml(obj.secondaryName)}</span>`
    : "";
  return `
    <div class="target-row">
      <div class="row-line">
        <span class="header"><strong>${escapeHtml(obj.displayName)}</strong> ${secondary}</span>
      </div>
      <div class="row-line caption">
        <span class="truncate">${escapeHtml(captionParts(obj))}</span>
        <span class="transit">T ${timeStr(row.transitDate)} · ${Math.round(row.transitAltitude)}°</span>
      </div>
    </div>
  `;
}

export function renderAll(root, state) {
  if (!state.window) {
    root.innerHTML = `
      <p class="muted centered">No astronomical night in the next 24 hours (polar summer?).</p>
    `;
    return;
  }

  const rows = state.targets.map(renderTargetRow).join("");
  root.innerHTML = `
    ${renderSunMoon(state)}
    ${renderFilterSummary(state.minAltitude, state.maxMagnitude, state.maxTransitOffsetHours)}
    <section class="card">
      <h2>Targets — ${state.targets.length}</h2>
      ${rows || '<p class="muted">Nothing visible tonight at the default settings.</p>'}
    </section>
  `;
}

export function renderStatus(root, message) {
  root.innerHTML = `<p class="muted centered">${escapeHtml(message)}</p>`;
}

export function renderError(root, message) {
  root.innerHTML = `<p class="error centered">${escapeHtml(message)}</p>`;
}
