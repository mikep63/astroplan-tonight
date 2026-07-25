// Static reference list of every curated ("popular") target the app tracks,
// so anyone can check whether an object is included. Reads the same
// data/targets.json the Tonight view uses; no geolocation required.

import { loadTargets } from "./data.js";

const root = document.getElementById("app");

/** "NGC2237" -> "NGC 2237", "Mel022" -> "Mel 22", "B033" -> "B 33".
 * Sh2- designations already carry their own separator. */
function prettifyName(name) {
  if (name.startsWith("Sh2-")) return name;
  const m = name.match(/^([A-Za-z]+)0*(\d.*)$/);
  return m ? `${m[1]} ${m[2]}` : name;
}

/** Collapses a designation/name to a comparison key: lowercase, alphanumerics
 * only, so "Sh2-155", "sh2 155" and "SH2155" all match. */
function norm(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Every catalog designation this object can be found under, de-duplicated. */
function designations(obj) {
  const out = [];
  const seen = new Set();
  const add = (s) => {
    if (!s) return;
    const key = norm(s);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(s);
    }
  };
  if (obj.messierNumber != null) add(`M${obj.messierNumber}`);
  add(prettifyName(obj.name));
  if (obj.caldwellNumber != null) add(`C${obj.caldwellNumber}`);
  if (obj.sharplessNumber != null) add(`Sh2-${obj.sharplessNumber}`);
  return out;
}

function commonNamesList(obj) {
  if (!obj.commonNames) return [];
  return obj.commonNames.split(",").map((s) => s.trim()).filter(Boolean);
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function rowHtml(obj) {
  const alts = designations(obj).filter((d) => norm(d) !== norm(obj.displayName));
  const commons = commonNamesList(obj);
  // Everything a visitor might search by, folded into one lowercased key.
  const haystack = norm([obj.displayName, ...alts, ...commons].join(" "));
  const caption = [obj.typeLabel, obj.constellation].filter(Boolean).join(" · ");
  const secondary = commons.length
    ? ` <span class="secondary">${escapeHtml(commons.join(", "))}</span>`
    : "";
  const altLine = alts.length
    ? `<div class="designations small muted">${escapeHtml(alts.join(" · "))}</div>`
    : "";
  return `
    <div class="catalog-row" data-search="${escapeHtml(haystack)}">
      <div class="row-line">
        <span class="header"><strong>${escapeHtml(obj.displayName)}</strong>${secondary}</span>
      </div>
      <div class="caption small muted">${escapeHtml(caption)}</div>
      ${altLine}
    </div>
  `;
}

/** Alphabetical, but with embedded numbers ordered numerically (M2 before M13). */
function sortKey(obj) {
  return obj.displayName.replace(/\d+/g, (n) => n.padStart(6, "0")).toLowerCase();
}

async function run() {
  let targets;
  try {
    targets = await loadTargets();
  } catch (err) {
    root.innerHTML = `<p class="error centered">Couldn't load the target list. Please reload.</p>`;
    return;
  }
  targets.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

  root.innerHTML = `
    <input id="filter" class="filter-box" type="search" autocomplete="off" autocapitalize="none"
           placeholder="Filter ${targets.length} targets by name…" aria-label="Filter targets" />
    <p id="count" class="filter-summary" aria-live="polite"></p>
    <div id="list" class="card">${targets.map(rowHtml).join("")}</div>
    <p id="empty" class="muted centered" hidden>No targets match “<span id="empty-q"></span>”.</p>
  `;

  const filter = document.getElementById("filter");
  const list = document.getElementById("list");
  const rows = Array.from(list.querySelectorAll(".catalog-row"));
  const count = document.getElementById("count");
  const empty = document.getElementById("empty");
  const emptyQ = document.getElementById("empty-q");

  function apply() {
    const raw = filter.value.trim();
    const q = norm(raw);
    let shown = 0;
    for (const row of rows) {
      const match = !q || row.dataset.search.includes(q);
      row.hidden = !match;
      if (match) shown++;
    }
    count.textContent = q ? `${shown} of ${rows.length} targets` : `${rows.length} curated targets`;
    list.hidden = shown === 0;
    empty.hidden = shown !== 0;
    emptyQ.textContent = raw;
  }

  filter.addEventListener("input", apply);
  apply();
}

run();
