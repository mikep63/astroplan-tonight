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
    <a class="target-row" href="#/${encodeURIComponent(obj.name)}">
      <div class="row-line">
        <span class="header"><strong>${escapeHtml(obj.displayName)}</strong> ${secondary}</span>
        <span class="chevron muted">›</span>
      </div>
      <div class="row-line caption">
        <span class="truncate">${escapeHtml(captionParts(obj))}</span>
        <span class="transit">T ${timeStr(row.transitDate)} · ${Math.round(row.transitAltitude)}°</span>
      </div>
    </a>
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

// --- Detail view ---------------------------------------------------------

function formatRA(deg) {
  const hours = deg / 15;
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const s = Math.round(((hours - h) * 60 - m) * 60);
  return `${h}h ${m}m ${s}s`;
}

function formatDec(deg) {
  const sign = deg < 0 ? "−" : "+";
  const a = Math.abs(deg);
  const d = Math.floor(a);
  const m = Math.floor((a - d) * 60);
  const s = Math.round(((a - d) * 60 - m) * 60);
  return `${sign}${d}° ${m}′ ${s}″`;
}

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
function compassPoint(azimuth) {
  return COMPASS[Math.round(azimuth / 45) % 8];
}

/** "NGC7822" -> "NGC 7822", "IC0434" -> "IC 434", "B033" -> "B 33". */
function prettyDesignation(name) {
  return name.replace(/^([A-Za-z]+)0*(\d.*)$/, "$1 $2");
}

function designations(obj) {
  const list = [];
  if (obj.messierNumber != null) list.push(`M${obj.messierNumber}`);
  if (obj.caldwellNumber != null) list.push(`C${obj.caldwellNumber}`);
  if (obj.sharplessNumber != null) list.push(`Sh2-${obj.sharplessNumber}`);
  list.push(prettyDesignation(obj.name));
  return [...new Set(list)];
}

function infoRow(label, value) {
  return `<div class="info-row"><span class="info-label">${label}</span><span class="info-value">${value}</span></div>`;
}

function renderAltitudeChart(detail, state) {
  const { curve, spanStart, spanEnd, peak, transit } = detail;
  const { window } = state;
  const now = new Date();

  const W = 320, H = 180, x0 = 30, y0 = 8, x1 = 312, y1 = 150;
  const pw = x1 - x0, ph = y1 - y0;
  const t0 = spanStart.getTime(), t1 = spanEnd.getTime();
  const tx = (d) => x0 + ((d instanceof Date ? d.getTime() : d) - t0) / (t1 - t0) * pw;
  const ty = (a) => y1 - Math.min(Math.max(a, 0), 90) / 90 * ph;

  const bx0 = tx(window.start), bx1 = tx(window.end);
  const band = `<rect x="${bx0.toFixed(1)}" y="${y0}" width="${Math.max(0, bx1 - bx0).toFixed(1)}" height="${ph}" fill="rgba(120,120,128,0.18)"/>`;

  const grid = [30, 60]
    .map((a) => {
      const y = ty(a);
      const dash = a === 30 ? ' stroke-dasharray="3 3"' : "";
      return (
        `<line x1="${x0}" y1="${y.toFixed(1)}" x2="${x1}" y2="${y.toFixed(1)}" stroke="rgba(120,120,128,0.35)" stroke-width="0.6"${dash}/>` +
        `<text x="${x0 - 4}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#8e8e93">${a}°</text>`
      );
    })
    .join("");

  const base =
    `<line x1="${x0}" y1="${y1}" x2="${x1}" y2="${y1}" stroke="rgba(120,120,128,0.5)" stroke-width="0.75"/>` +
    `<text x="${x0 - 4}" y="${(y1 + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#8e8e93">0°</text>`;

  const pts = curve.map((p) => `${tx(p.time).toFixed(1)},${ty(p.altitude).toFixed(1)}`).join(" ");
  const line = `<polyline points="${pts}" fill="none" stroke="#007aff" stroke-width="1.5" stroke-linejoin="round"/>`;

  let peakDot = "";
  if (peak.date >= spanStart && peak.date <= spanEnd) {
    peakDot = `<circle cx="${tx(peak.date).toFixed(1)}" cy="${ty(peak.altitude).toFixed(1)}" r="2.5" fill="#007aff"/>`;
  }

  let nowLine = "";
  if (now >= spanStart && now <= spanEnd) {
    const nx = tx(now).toFixed(1);
    nowLine = `<line x1="${nx}" y1="${y0}" x2="${nx}" y2="${y1}" stroke="#ff9500" stroke-width="1" stroke-dasharray="2 2"/>`;
  }

  const label = (d, anchor, x) =>
    `<text x="${x.toFixed(1)}" y="${H - 4}" text-anchor="${anchor}" font-size="9" fill="#8e8e93">${timeStr(d)}</text>`;
  let timeLabels = label(spanStart, "start", x0) + label(spanEnd, "end", x1);
  if (transit.date > spanStart && transit.date < spanEnd) {
    timeLabels += label(transit.date, "middle", tx(transit.date));
  }

  return `
    <svg class="alt-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Altitude through the night">
      ${band}${grid}${base}${line}${peakDot}${nowLine}${timeLabels}
    </svg>
    <p class="muted small chart-legend">Altitude through the night · shaded band = astronomical darkness · dashed line = 30° minimum${nowLine ? " · orange = now" : ""}</p>
  `;
}

export function renderDetail(root, obj, detail, state) {
  const secondary = obj.secondaryName
    ? ` <span class="secondary">${escapeHtml(obj.secondaryName)}</span>`
    : "";

  const info = [
    infoRow("Type", escapeHtml(obj.typeLabel)),
    obj.constellation ? infoRow("Constellation", escapeHtml(obj.constellation)) : "",
    obj.vMagnitude != null ? infoRow("Visual Mag", obj.vMagnitude.toFixed(1)) : "",
    sizeStr(obj.majorAxisArcmin) ? infoRow("Size", sizeStr(obj.majorAxisArcmin)) : "",
    infoRow("RA (J2000)", formatRA(obj.raDegrees)),
    infoRow("Dec (J2000)", formatDec(obj.decDegrees)),
    infoRow("Designations", escapeHtml(designations(obj).join(" · "))),
  ].join("");

  const namesCard = obj.commonNames
    ? `<section class="card"><h2>Common Names</h2><p>${escapeHtml(obj.commonNames)}</p></section>`
    : "";

  const tonight = [
    detail.current
      ? infoRow("Current altitude", `${Math.round(detail.current.altitude)}° ${compassPoint(detail.current.azimuth)}`)
      : "",
    infoRow("Peak altitude", `${Math.round(detail.peak.altitude)}° at ${timeStr(detail.peak.date)}`),
    infoRow("Transit", `${timeStr(detail.transit.date)} · ${Math.round(detail.transit.altitude)}°`),
    infoRow("Separation from Moon", `${Math.round(detail.moonSeparation)}°`),
  ].join("");

  root.innerHTML = `
    <p><a class="back-link" href="#">‹ Tonight</a></p>
    <header class="detail-header">
      <h1>${escapeHtml(obj.displayName)}${secondary}</h1>
      <p class="muted">${escapeHtml(captionParts(obj))}</p>
    </header>
    <section class="card">
      <h2>Details</h2>
      ${info}
    </section>
    ${namesCard}
    <section class="card">
      <h2>Tonight</h2>
      ${tonight}
      ${renderAltitudeChart(detail, state)}
    </section>
  `;
}

export function renderStatus(root, message) {
  root.innerHTML = `<p class="muted centered">${escapeHtml(message)}</p>`;
}

export function renderError(root, message) {
  root.innerHTML = `<p class="error centered">${escapeHtml(message)}</p>`;
}
