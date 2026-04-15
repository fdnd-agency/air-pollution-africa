const mapButton = document.getElementById("MapButton");
const tableButton = document.getElementById("TableButton");
const tableView = document.getElementById("tableView");
const mapView = document.getElementById("mapView");
const dataRAW = document.getElementById("boot-data");
const data = dataRAW ? JSON.parse(dataRAW.textContent) : { keuzes: {}, points: [] };

let selectedYear;
let selectedMonthIndex;

const delay = 0.5;

let scale = "WHO";
const kleuren = {
  LOW: "rgb(0, 255, 0)",
  MID: "rgb(255, 255, 0)",
  HIGH: "rgb(255, 165, 0)",
  MAX: "rgb(255, 0, 0)",
  ABSOLUTE: "rgb(54, 0, 54)",
  NOMES: "rgb(160, 160, 160)"
};

const SCALE_PRESETS = {
  WHO: { key: "WHO", label: "WHO", annual: 10, colorMax: 20 },
  EU: { key: "EU", label: "EU", annual: 40, colorMax: 80 },
  DATA: { key: "RELATIVE", label: "Relative", annual: null, colorMax: null }
};

let activeScale = { key: "EU", label: "EU", annual: 40, colorMax: 80 };

let legendaControl;
let legendaElements = {};

const points = Array.isArray(data.points) ? data.points : [];
const values = points.flatMap(p =>
  (Array.isArray(p?.measurements) ? p.measurements : [])
    .filter(m => typeof m?.value === "number" && !Number.isNaN(m.value))
    .map(m => m.value)
);

const maxValue = values.length ? Math.max(...values) : null;

let map;

const startCoords =
  (data.keuzes.Coordinaten && data.keuzes.Coordinaten.length === 2)
    ? data.keuzes.Coordinaten
    : [0, 0];

map = L.map("map", { zoomControl: false }).setView(startCoords, 13);
L.control.zoom({ position: "bottomleft" }).addTo(map);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 17 }).addTo(map);
const markerLayer = L.layerGroup().addTo(map);

mapButton.addEventListener("click", (d) => {
  mapButton.classList.add("active");
  tableButton.classList.remove("active");
  tableView.style.display = "none";
  mapView.style.display = "block";
});

tableButton.addEventListener("click", (d) => {
  mapButton.classList.remove("active");
  tableButton.classList.add("active");
  tableView.style.display = "block";
  mapView.style.display = "none";
});

SCALE_PRESETS.DATA.colorMax = maxValue;
SCALE_PRESETS.DATA.annual = Number((maxValue / 2).toFixed(2));

// --- kleur helpers (FIX) ---
function parseRgbString(rgb) {
  // "rgb(0, 255, 0)" -> [0,255,0]
  const nums = String(rgb).match(/\d+/g);
  if (!nums || nums.length < 3) return [0, 0, 0];
  return [Number(nums[0]), Number(nums[1]), Number(nums[2])];
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function getKleuren(value, maxValue) {
  if (!Number.isFinite(value) || !Number.isFinite(maxValue) || maxValue <= 0) {
    return kleuren.LOW;
  }

  // ✅ Extra segment: rood -> zwart tussen max en 5x max
  if (value > maxValue) {
    const tBlack = Math.min(Math.max((value - maxValue) / (maxValue * 4), 0), 1); // 0..1
    const red = parseRgbString(kleuren.MAX);      // [255,0,0]
    const black = parseRgbString(kleuren.ABSOLUTE);

    const r = Math.round(lerp(red[0], black[0], tBlack));
    const g = Math.round(lerp(red[1], black[1], tBlack));
    const b = Math.round(lerp(red[2], black[2], tBlack));

    return `rgb(${r}, ${g}, ${b})`;
  }

  // 🔻 Normale schaal 0..max: groen -> geel -> oranje -> rood
  const t = Math.min(Math.max(value / maxValue, 0), 1);

  let c1, c2, localT;

  if (t <= 0.33) {
    c1 = parseRgbString(kleuren.LOW);
    c2 = parseRgbString(kleuren.MID);
    localT = t / 0.33;
  } else if (t <= 0.66) {
    c1 = parseRgbString(kleuren.MID);
    c2 = parseRgbString(kleuren.HIGH);
    localT = (t - 0.33) / 0.33;
  } else {
    c1 = parseRgbString(kleuren.HIGH);
    c2 = parseRgbString(kleuren.MAX);
    localT = (t - 0.66) / 0.34;
  }

  const r = Math.round(lerp(c1[0], c2[0], localT));
  const g = Math.round(lerp(c1[1], c2[1], localT));
  const b = Math.round(lerp(c1[2], c2[2], localT));

  return `rgb(${r}, ${g}, ${b})`;
}

function getClass(value, max) {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) {
    return { key: "NONE", label: "No data" };
  }

  // zelfde grenzen als je legenda: 0, 0.25*max, 0.5*max, 1*max, daarna "Dangerous"
  if (value <= max * 0.25) return { key: "LOW", label: "Low" };
  if (value <= max * 0.5) return { key: "MID", label: "Medium" };
  if (value <= max) return { key: "HIGH", label: "High" };
  if (value <= max * 5) return { key: "MAX", label: "Dangerous" };

  return { key: "ABSOLUTE", label: "Extreme" };
}

function monthKey(year, monthIndex) {
  return year * 12 + monthIndex; // handig voor vergelijken/sorteren
}

const monthNames = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function formatMonthYear(year, monthIndex) {
  return `${monthNames[monthIndex]} ${year}`;
}

function getSortedMonthlyMeasurements(point) {
  const ms = Array.isArray(point?.measurements) ? point.measurements : [];

  // maak uniforme records: {year, monthIndex, dateKey, value, status}
  const rows = ms.map(m => {
    const d = new Date(m.date);
    if (Number.isNaN(d.getTime())) return null;

    const year = d.getFullYear();
    const monthIndex = d.getMonth();
    const dateKey = monthKey(year, monthIndex);

    if (typeof m.value === "number" && !Number.isNaN(m.value)) {
      return { year, monthIndex, dateKey, status: "value", value: m.value };
    }
    // noMeasurement of value ontbreekt
    return { year, monthIndex, dateKey, status: "noMeasurement", value: null };
  }).filter(Boolean);

  // sort + dedupe (laatste wint als dubbel)
  rows.sort((a, b) => a.dateKey - b.dateKey);
  const dedup = new Map();
  rows.forEach(r => dedup.set(r.dateKey, r));
  return Array.from(dedup.values()).sort((a, b) => a.dateKey - b.dateKey);
}

function findRowForMonth(rows, year, monthIndex) {
  const key = monthKey(year, monthIndex);
  return rows.find(r => r.dateKey === key) || null;
}

function buildWindowAround(rows, year, monthIndex, beforeCount = 5, afterCount = 6) {
  const key = monthKey(year, monthIndex);

  // index van selected month in rows (kan ook ontbreken)
  const idx = rows.findIndex(r => r.dateKey === key);

  if (idx === -1) {
    // als selected maand niet bestaat in de point measurements:
    // pak de eerstvolgende maand na selectie als "anchor", anders laatste ervoor
    const nextIdx = rows.findIndex(r => r.dateKey > key);
    const anchor = nextIdx !== -1 ? nextIdx : (rows.length - 1);
    const start = Math.max(0, anchor - beforeCount);
    const end = Math.min(rows.length, anchor + 1 + afterCount);
    return { windowRows: rows.slice(start, end), selectedExists: false };
  }

  const start = Math.max(0, idx - beforeCount);
  const end = Math.min(rows.length, idx + 1 + afterCount);
  return { windowRows: rows.slice(start, end), selectedExists: true };
}

function createMenu(position, html) {
  const control = L.control({ position });

  control.onAdd = function () {
    const container = L.DomUtil.create("div", "leaflet-control-custom");

    // ✅ extra id alleen voor bottomright
    if (position === "bottomright") {
      container.id = "regels";
    }

    container.innerHTML = html;
    return container;
  };

  return control;
}

function maakLegenda() {
  const max = activeScale.colorMax ?? 0;

  const legendValues = berekenLegenda(max);

  legendaControl = createMenu("topleft", `
    <div class="menu" id="legenda">
      <p>Legenda</p>

      <p>
        <span class="legendaDot" style="background-color:${kleuren.LOW}"></span>
        Low | <span id="legend-low">${legendValues.LOW}</span>
      </p>

      <p>
        <span class="legendaDot" style="background-color:${kleuren.MID}"></span>
        Medium | <span id="legend-mid">${legendValues.MID}</span>
      </p>

      <p>
        <span class="legendaDot" style="background-color:${kleuren.HIGH}"></span>
        High | <span id="legend-high">${legendValues.HIGH}</span>
      </p>

      <p>
        <span class="legendaDot" style="background-color:${kleuren.MAX}"></span>
        Dangerous | <span id="legend-max">${legendValues.MAX}</span>
      </p>
      <span
        style="
        border-radius: 5px;
          display: block;
          padding: 10px;
          width: inherit;
          height: 20px;
          background: linear-gradient(
            to right,
            rgb(0, 255, 0),
            rgb(255, 255, 0),
            rgb(255, 165, 0),
            rgb(255, 0, 0),
            rgb(54, 0, 54)
          );
        ">
      </span>
    </div>
  `);

  map.addControl(legendaControl);

  // cache DOM references
  legendaElements = {
    low: document.getElementById("legend-low"),
    mid: document.getElementById("legend-mid"),
    high: document.getElementById("legend-high"),
    max: document.getElementById("legend-max"),
  };
}

function berekenLegenda(max) {
  return {
    LOW: 0,
    MID: Number((max * 0.25).toFixed(2)),
    HIGH: Number((max * 0.5).toFixed(2)),
    MAX: Number(max.toFixed(2))
  };
}

function updateLegenda() {
  const max = activeScale.colorMax ?? 0;
  const legendValues = berekenLegenda(max);

  legendaElements.low.textContent = legendValues.LOW;
  legendaElements.mid.textContent = legendValues.MID;
  legendaElements.high.textContent = legendValues.HIGH;
  legendaElements.max.textContent = legendValues.MAX;
}

function buildAvailability(points) {
  // Map<year, Set<monthIndex>>
  const byYear = new Map();

  (Array.isArray(points) ? points : []).forEach(p => {
    (Array.isArray(p?.measurements) ? p.measurements : []).forEach(m => {
      // Alleen echte metingen meetellen
      if (typeof m?.value !== "number" || Number.isNaN(m.value)) return;

      const d = new Date(m.date);
      if (Number.isNaN(d.getTime())) return;

      const y = d.getFullYear();
      const mo = d.getMonth(); // 0-11

      if (!byYear.has(y)) byYear.set(y, new Set());
      byYear.get(y).add(mo);
    });
  });

  const years = Array.from(byYear.keys()).sort((a, b) => a - b);

  // laatste beschikbare (year, month) vinden
  let latest = null;
  years.forEach(y => {
    const months = Array.from(byYear.get(y)).sort((a, b) => a - b);
    months.forEach(mo => {
      if (!latest) latest = { year: y, monthIndex: mo };
      else {
        const a = y * 12 + mo;
        const b = latest.year * 12 + latest.monthIndex;
        if (a > b) latest = { year: y, monthIndex: mo };
      }
    });
  });

  return { byYear, years, latest };
}

function clampToAvailableYear(years, y) {
  if (!years.length) return y;
  if (y <= years[0]) return years[0];
  if (y >= years[years.length - 1]) return years[years.length - 1];

  // als exact beschikbaar: ok
  if (years.includes(y)) return y;

  // anders: dichtstbijzijnde
  let best = years[0];
  let bestDist = Math.abs(y - best);
  for (const yr of years) {
    const dist = Math.abs(y - yr);
    if (dist < bestDist) {
      bestDist = dist;
      best = yr;
    }
  }
  return best;
}

function closestAvailableMonth(byYear, year, desiredMonthIndex) {
  const set = byYear.get(year);
  if (!set || set.size === 0) return desiredMonthIndex;

  if (set.has(desiredMonthIndex)) return desiredMonthIndex;

  const months = Array.from(set).sort((a, b) => a - b);

  // pak de dichtstbijzijnde maand, liever “lager” (naar links) bij gelijke afstand
  let best = months[0];
  let bestDist = Math.abs(desiredMonthIndex - best);

  for (const mo of months) {
    const dist = Math.abs(desiredMonthIndex - mo);
    if (dist < bestDist || (dist === bestDist && mo < best)) {
      bestDist = dist;
      best = mo;
    }
  }
  return best;
}

function applyMonthAvailability(monthButtons, byYear, year, selectedMonthIndex) {
  const set = byYear.get(year) || new Set();

  monthButtons.forEach((btn, idx) => {
    const ok = set.has(idx);
    btn.disabled = !ok;
    btn.classList.toggle("is-disabled", !ok); // optioneel class voor styling
    btn.title = ok ? "" : "No data for this month";
  });

  // zorg dat selection op iets bestaands staat
  return closestAvailableMonth(byYear, year, selectedMonthIndex);
}

const menuTopRight = createMenu("topright", `
  <div class="menu menuTopRight">
    <section id="selected"><p id="selectedTekst">Januari</p></section>

    <section id="dateOptions">
      <fieldset>
        <legend>Year:</legend>
        <input id="previous" type="button" value="-">
        <input id="inputYear" type="number">
        <input id="next" type="button" value="+">
      </fieldset>
        <hr>
      <fieldset>
        <legend>Month:</legend>
        <input class="inputMonth" type="button" value="Jan">
        <input class="inputMonth" type="button" value="Feb">
        <input class="inputMonth" type="button" value="Mar">
        <input class="inputMonth" type="button" value="Apr">
        <input class="inputMonth" type="button" value="May">
        <input class="inputMonth" type="button" value="Jun">
        <input class="inputMonth" type="button" value="Jul">
        <input class="inputMonth" type="button" value="Aug">
        <input class="inputMonth" type="button" value="Sep">
        <input class="inputMonth" type="button" value="Okt">
        <input class="inputMonth" type="button" value="Nov">
        <input class="inputMonth" type="button" value="Dec">
      </fieldset>
    </section>
  </div>
`);

map.addControl(menuTopRight);

// init (wacht tot menu in DOM staat)
initMenuTopRight();

function initMenuTopRight() {
  const root = document.querySelector(".menuTopRight");
  if (!root) {
    requestAnimationFrame(initMenuTopRight);
    return;
  }

  const selected = root.querySelector("#selected");
  const selectedTekst = root.querySelector("#selectedTekst");
  const dateOptions = root.querySelector("#dateOptions");

  const yearInput = root.querySelector("#inputYear");
  const prevBtn = root.querySelector("#previous");
  const nextBtn = root.querySelector("#next");
  const monthButtons = root.querySelectorAll(".inputMonth");

  const availability = buildAvailability(points);
  window.__dateMenuRefs = {
    root,
    selectedTekst,
    dateOptions,
    yearInput,
    prevBtn,
    nextBtn,
    monthButtons,
    availability
  };

  const { byYear, years, latest } = availability;

  const now = new Date();
  const fallbackYear = now.getFullYear();
  const fallbackMonth = now.getMonth();

  selectedYear = latest?.year ?? fallbackYear;
  selectedMonthIndex = latest?.monthIndex ?? fallbackMonth;

  yearInput.value = selectedYear;

  const updateYearNavDisabled = () => {
    if (!years.length) {
      prevBtn.disabled = false;
      nextBtn.disabled = false;
      return;
    }
    prevBtn.disabled = (selectedYear <= years[0]);
    nextBtn.disabled = (selectedYear >= years[years.length - 1]);
  };

  selectedMonthIndex = applyMonthAvailability(monthButtons, byYear, selectedYear, selectedMonthIndex);

  setActiveMonthButton(monthButtons, selectedMonthIndex);
  updateSelectedTekst(selectedTekst);
  updateYearNavDisabled();

  selected.addEventListener("click", (e) => {
    e.stopPropagation();
    dateOptions.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".menuTopRight")) {
      dateOptions.classList.remove("open");
    }
  });

  const refreshMenu = () => {
    selectedYear = clampToAvailableYear(years, selectedYear);
    yearInput.value = selectedYear;

    selectedMonthIndex = applyMonthAvailability(monthButtons, byYear, selectedYear, selectedMonthIndex);

    setActiveMonthButton(monthButtons, selectedMonthIndex);
    updateSelectedTekst(selectedTekst);
    updateYearNavDisabled();
    updateMarkers();
    renderTable();
  };

  prevBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    selectedYear -= 1;
    refreshMenu();
  });

  nextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    selectedYear += 1;
    refreshMenu();
  });

  yearInput.addEventListener("input", (e) => {
    e.stopPropagation();
    const val = Number(yearInput.value);
    if (!Number.isFinite(val)) return;
    selectedYear = val;
    refreshMenu();
  });

  monthButtons.forEach((btn, idx) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (btn.disabled) return;
      selectedMonthIndex = idx;
      refreshMenu();
    });
  });
}

function syncDateMenuUIFromState() {
  const refs = window.__dateMenuRefs;
  if (!refs) return;

  const { selectedTekst, yearInput, prevBtn, nextBtn, monthButtons, availability } = refs;
  const { byYear, years } = availability || { byYear: new Map(), years: [] };

  // clamp year
  selectedYear = clampToAvailableYear(years, selectedYear);
  if (yearInput) yearInput.value = selectedYear;

  // apply month availability + active state
  selectedMonthIndex = applyMonthAvailability(monthButtons, byYear, selectedYear, selectedMonthIndex);
  setActiveMonthButton(monthButtons, selectedMonthIndex);
  updateSelectedTekst(selectedTekst);

  // prev/next disabled
  if (prevBtn && nextBtn) {
    if (!years.length) {
      prevBtn.disabled = false;
      nextBtn.disabled = false;
    } else {
      prevBtn.disabled = (selectedYear <= years[0]);
      nextBtn.disabled = (selectedYear >= years[years.length - 1]);
    }
  }
}

function setActiveMonthButton(buttons, activeIndex) {
  buttons.forEach((btn, idx) => {
    btn.classList.toggle("active", idx === activeIndex);
  });
}

function updateSelectedTekst(selectedTekstEl) {
  selectedTekstEl.textContent = `${monthNames[selectedMonthIndex]} ${selectedYear}`;
}

const menuBottomRight = createMenu("bottomright", `
  <div class="scale-control leaflet-control">
    <button class="scaleWHO" type="button" data-preset="WHO">WHO</button>
    <button class="scaleEU" type="button" data-preset="EU">EU</button>
    <button class="scaleRelative is-active" type="button" data-preset="DATA" title="">Relative</button>
  </div>
`);

map.addControl(menuBottomRight);

// Pak ALLE knoppen (staan 2x in DOM: map + table)
const scaleWHOButtons  = document.querySelectorAll(".scaleWHO");
const scaleEUButtons   = document.querySelectorAll(".scaleEU");
const scaleRelativeButtons = document.querySelectorAll(".scaleRelative");

// 1 waarheid: activeScale (gebruik je al)
function setActiveScaleByPreset(presetKey) {
  const preset = SCALE_PRESETS[presetKey]; // "WHO" | "EU" | "DATA"
  if (!preset) return;

  activeScale = preset;

  // sync UI voor ALLE knoppen (beide sets)
  syncScaleButtons();

  // update map visuals
  updateLegenda();
  updateMarkers();
  renderTable();
}

function syncScaleButtons() {
  const key = activeScale?.key;

  scaleWHOButtons.forEach(btn => btn.classList.toggle("is-active", key === "WHO"));
  scaleEUButtons.forEach(btn => btn.classList.toggle("is-active", key === "EU"));
  scaleRelativeButtons.forEach(btn => btn.classList.toggle("is-active", key === "RELATIVE"));
}

// Click handlers voor ALLE instanties
scaleWHOButtons.forEach(btn => btn.addEventListener("click", () => setActiveScaleByPreset("WHO")));
scaleEUButtons.forEach(btn => btn.addEventListener("click", () => setActiveScaleByPreset("EU")));
scaleRelativeButtons.forEach(btn => btn.addEventListener("click", () => setActiveScaleByPreset("DATA")));

// Init: zorg dat de UI klopt op load
syncScaleButtons();
maakLegenda();

function updateMarkers() {

  markerLayer.clearLayers();

  const year = selectedYear;
  const monthIndex = selectedMonthIndex;
  if (typeof year !== "number" || typeof monthIndex !== "number") return;

  const max = activeScale?.colorMax ?? maxValue ?? 0;
  if (!max) return;

  points.forEach(p => {
    const lat = p?.coordinates?.lat;
    const lon = p?.coordinates?.lon;
    if (typeof lat !== "number" || typeof lon !== "number") return;

    const res = getMonthValue(p, year, monthIndex);

    // geen record voor deze maand -> geen bolletje (voor nu)
    if (res.status === "missing") return;

    // --- NO MEASUREMENT -> grijs bolletje (met schaduw + click) ---
    if (res.status === "noMeasurement") {
      // schaduw
      L.circleMarker([lat, lon], {
        radius: 14,
        stroke: false,
        fill: true,
        fillColor: "#000",
        fillOpacity: 0.25,
        interactive: false
      }).addTo(markerLayer);

      const marker = L.circleMarker([lat, lon], {
        radius: 10,
        stroke: true,
        color: "#FFF",
        weight: 1,
        fill: true,
        fillColor: kleuren.NOMES,
        fillOpacity: 1
      }).addTo(markerLayer);

      marker.on("click", () => {
        openOverlay({
          title: p.location ?? `Point ${p.point_number ?? ""}`,
          subtitle: `${monthNames[monthIndex]} ${year} • Scale: ${activeScale.key}`,
          rows: [
            { label: "NO₂ (monthly avg)", value: "No measurement" },
            { label: "Tube", value: (p.measurements?.find(m => m?.tube_id)?.tube_id ?? "—") }
          ]
        });
      });

      return;
    }

    // --- NORMALE METING -> kleur + schaduw + click ---
    const fill = getKleuren(res.value, max);

    // schaduw
    L.circleMarker([lat, lon], {
      radius: 14,
      stroke: false,
      fill: true,
      fillColor: "#000",
      fillOpacity: 0.25,
      interactive: false
    }).addTo(markerLayer);

    // echte marker (deze is klikbaar)
    const marker = L.circleMarker([lat, lon], {
      radius: 10,
      stroke: true,
      color: "#FFF",
      weight: 1,
      fill: true,
      fillColor: fill,
      fillOpacity: 1
    }).addTo(markerLayer);

    marker.on("click", () => openPointOverlay(p, year, monthIndex));
  });
}

function getMonthValue(point, year, monthIndex) {
  const ms = Array.isArray(point?.measurements) ? point.measurements : [];

  const m = ms.find(meas => {
    const d = new Date(meas.date);
    return !Number.isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === monthIndex;
  });

  if (!m) return { status: "missing", value: null };

  if (typeof m.value === "number" && !Number.isNaN(m.value)) {
    return { status: "value", value: m.value };
  }

  // noMeasurement true (of waarde ontbreekt)
  return { status: "noMeasurement", value: null };
}

updateMarkers();

function ensureOverlay() {
  if (document.getElementById("markerOverlay")) return;

  const el = document.createElement("div");
  el.id = "markerOverlay";
  el.className = "overlay";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.hidden = true;

  el.innerHTML = `
    <div class="overlay__backdrop" data-close></div>
    <div class="overlay__panel" role="document">
      <button class="overlay__close" type="button" aria-label="Close" data-close>×</button>
      <div class="overlay__content" id="markerOverlayContent"></div>
    </div>
  `;

  document.body.appendChild(el);

  // close on click (backdrop or close button)
  el.addEventListener("click", (e) => {
    if (e.target && e.target.closest("[data-close]")) {
      closeOverlay();
    }
  });

  // close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const overlay = document.getElementById("markerOverlay");
    if (!overlay || overlay.hidden) return;
    closeOverlay();
  });
}

function openOverlay({ title, subtitle, rows = [] }) {
  ensureOverlay();

  const overlay = document.getElementById("markerOverlay");
  const content = document.getElementById("markerOverlayContent");
  if (!overlay || !content) return;

  const rowsHtml = rows
    .map(r => `<div class="overlay__row"><span>${r.label}</span><strong>${r.value}</strong></div>`)
    .join("");

  content.innerHTML = `
    <h2 class="overlay__title">${title ?? ""}</h2>
    ${subtitle ? `<p class="overlay__subtitle">${subtitle}</p>` : ""}
    <div class="overlay__rows">${rowsHtml}</div>
  `;

  overlay.hidden = false;
  document.body.classList.add("overlay-open");
}

function closeOverlay() {
  const overlay = document.getElementById("markerOverlay");
  if (!overlay) return;
  overlay.hidden = true;
  document.body.classList.remove("overlay-open");
}

function openPointOverlay(point, year, monthIndex) {
  ensureOverlay();

  const overlay = document.getElementById("markerOverlay");
  const content = document.getElementById("markerOverlayContent");
  if (!overlay || !content) return;

  const max = activeScale?.colorMax ?? maxValue ?? 0;

  const allRows = getSortedMonthlyMeasurements(point);
  const selectedRow = findRowForMonth(allRows, year, monthIndex);

  // waarde + class voor het kaartje
  const value = selectedRow?.status === "value" ? selectedRow.value : null;
  const cls = getClass(value, max);
  const color = (selectedRow?.status === "noMeasurement")
    ? kleuren.NOMES
    : (value == null ? kleuren.NOMES : getKleuren(value, max));

  // tabelwindow (5 vóór + 6 na)
  const { windowRows } = buildWindowAround(allRows, year, monthIndex, 5, 6);

  const tableHtml = windowRows.map(r => {
    const isSelected = r.year === year && r.monthIndex === monthIndex;
    let v = "—";
    let level = "—";

    if (r.status === "noMeasurement") {
      v = "No measurement";
      level = "—";
    } else if (r.status === "value") {
      v = `${r.value.toFixed(2)}`;
      level = getClass(r.value, max).label;
    }

    return `
      <tr class="${isSelected ? "is-selected" : ""}">
        <td>${formatMonthYear(r.year, r.monthIndex)}</td>
        <td>${v}</td>
        <td>${level}</td>
      </tr>
    `;
  }).join("");

  const measuredMonthText = formatMonthYear(year, monthIndex);
  const freqText = "Monthly";

  // status tekst voor het kaartje
  let cardStatusText = "Measured using passive diffusion tubes";
  let cardValueText = value == null ? "—" : `${value.toFixed(2)} µg/m³`;
  if (selectedRow?.status === "noMeasurement") {
    cardStatusText = "No measurement possible this month";
    cardValueText = "No measurement";
  } else if (!selectedRow) {
    cardStatusText = "No record for this month";
    cardValueText = "—";
  }

  const guidelineText = activeScale?.annual
    ? `${activeScale.key} guideline (annual): < ${activeScale.annual} µg/m³`
    : "Guideline: —";

  content.innerHTML = `
    <div class="popup">
      <!-- Header -->
      <div class="popup__header">
        <div>
          <h2 class="popup__title">${point.location ?? "Location"}</h2>
          <p class="popup__desc">${point.description ?? ""}</p>
        </div>
      </div>

      <!-- Meta row -->
      <div class="popup__meta">
        <div class="popup__metaItem">
          <div class="popup__metaLabel">MEASURED MONTH</div>
          <div class="popup__metaValue">${measuredMonthText}</div>
        </div>
        <div class="popup__metaItem">
          <div class="popup__metaLabel">FREQUENCY</div>
          <div class="popup__metaValue">${freqText}</div>
        </div>
      </div>

      <!-- Card -->
      <div class="popup__card">
        <div class="popup__cardTop">
          <div class="popup__tiny">${cardStatusText}</div>
          <div class="popup__chip" style="background:${color}">${cls.label}</div>
        </div>

        <div class="popup__metricRow">
          <div>
            <div class="popup__metricLabel">NO₂</div>
            <div class="popup__metricValue">${cardValueText}</div>
            <div class="popup__metricHint">*Based on monthly average NO₂</div>
          </div>

          <div class="popup__guideline">
            ${guidelineText}
          </div>
        </div>
      </div>

      <!-- Details -->
      <details class="popup__details">
        <summary>Details</summary>
        <div class="popup__detailsBody">
          <div><strong>Scale:</strong> ${activeScale.key}</div>
          <div><strong>Color max:</strong> ${max ? max.toFixed(2) : "—"} µg/m³</div>
          <div><strong>Coordinates:</strong> lat ${point.coordinates?.lat ?? "—"}, lon ${point.coordinates?.lon ?? "—"}</div>
          <div><strong>Tube:</strong> ${(point.measurements?.find(m => m?.tube_id)?.tube_id ?? "—")}</div>
        </div>
      </details>

      <!-- What does this mean? -->
      <details class="popup__details">
        <summary>What does this mean?</summary>
        <div class="popup__detailsBody">
          <h2>Air quality level</h2>
          <p>
            This NO₂ level is high. <br>
            It is higher than what is recommended for long-term health.
          </p>
          <h2>Health effects</h2>
          <p>Long-term exposure to high NO₂ levels can:</p>
          <ul style="margin-left: 16px;">
            <li>
              Irritate the lungs
            </li>
            <li>
              Worsen asthma or breathing problems
            </li>
            <li>
              Increase health risks for children and elderly people
            </li>
          </ul>
          <h2>What you can do?</h2>
          <ul style="margin-left: 16px;">
            <li>
              Limit time spent near busy roads and junctions
            </li>
            <li>
              Reduce outdoor activities during heavy traffic hours
            </li>
            <li>
              Children, elderly people and people with asthma should be extra careful
            </li>
          </ul>
        </div>
      </details>

      <!-- Chart placeholder (D3 later) -->
      <div class="popup__sectionTitle">MONTHLY VALUES ${year}</div>
      <div id="overlayChart" class="popup__chartPlaceholder">
        <!-- D3 chart goes here -->
      </div>

      <!-- Table -->
      <div class="popup__tableWrap">
        <table class="popup__table">
          <thead>
            <tr>
              <th>Month</th>
              <th>NO₂ (µg/m³)</th>
              <th>Level</th>
            </tr>
          </thead>
          <tbody>
            ${tableHtml || `<tr><td colspan="3">No data</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;

  overlay.hidden = false;
  document.body.classList.add("overlay-open");

  drawOverlayChart({ point, year, monthIndex });
}

function formatShortMonth(row) {
  const mon = monthNames[row.monthIndex].slice(0, 3);
  return `${mon} ${String(row.year).slice(2)}`;
}

/**
 * ✅ NEW: generieke chart renderer (overlay + table)
 * - gebruikt exact jouw bestaande overlay-chart code
 * - alleen host + before/after zijn nu parameters
 */
function renderPointChart({ host, point, year, monthIndex, beforeCount = 5, afterCount = 5 }) {
  if (!host) return;

  // cleanup vorige chart + outside-click handler
  if (host._chartCleanup) {
    host._chartCleanup();
    host._chartCleanup = null;
  }

  host.innerHTML = "";

  if (typeof d3 === "undefined") {
    host.textContent = "D3 is not loaded";
    return;
  }

  const max = activeScale?.colorMax ?? maxValue ?? 0;
  if (!max) {
    host.textContent = "No scale max available";
    return;
  }

  // --- tooltip helpers (werkt voor desktop + mobiel) ---
  const ensureChartTooltip = () => {
    let tip = document.getElementById("chartTooltip");
    if (tip) return tip;

    tip = document.createElement("div");
    tip.id = "chartTooltip";
    tip.style.position = "fixed";
    tip.style.zIndex = "10000";
    tip.style.pointerEvents = "none";
    tip.style.padding = "6px 8px";
    tip.style.borderRadius = "10px";
    tip.style.background = "rgba(15, 23, 42, 0.92)";
    tip.style.color = "#fff";
    tip.style.fontSize = "12px";
    tip.style.lineHeight = "1.2";
    tip.style.boxShadow = "0 10px 30px rgba(0,0,0,.25)";
    tip.style.opacity = "0";
    tip.style.transform = "translate(-50%, -120%)";
    tip.style.transition = "opacity 120ms ease";
    document.body.appendChild(tip);

    return tip;
  };

  const showChartTooltip = (text, clientX, clientY) => {
    const tip = ensureChartTooltip();
    tip.textContent = text;

    const x = clientX;
    const y = clientY;

    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
    tip.style.opacity = "1";
  };

  const hideChartTooltip = () => {
    const tip = document.getElementById("chartTooltip");
    if (!tip) return;
    tip.style.opacity = "0";
  };

  let tooltipPinned = false;

  const onDocPointerDown = (e) => {
    // klik/tap buiten de chart => sluit tooltip
    if (!tooltipPinned) return;
    if (host.contains(e.target)) return;
    tooltipPinned = false;
    hideChartTooltip();
  };

  document.addEventListener("pointerdown", onDocPointerDown, { passive: true });

  host._chartCleanup = () => {
    document.removeEventListener("pointerdown", onDocPointerDown);
  };

  // --- Data window: before + selected + after ---
  const allRows = getSortedMonthlyMeasurements(point);
  const { windowRows } = buildWindowAround(allRows, year, monthIndex, beforeCount, afterCount);

  if (!windowRows.length) {
    host.textContent = "No data";
    return;
  }

  // --- Sizes ---
  let W = Math.floor(host.getBoundingClientRect().width);

  // Soms is width 0 direct na render (accordion anim/DOM). Dan 1 frame later opnieuw proberen.
  if (!W || W < 10) {
    requestAnimationFrame(() => {
      const w2 = Math.floor(host.getBoundingClientRect().width);
      if (w2 && w2 >= 10) {
        renderPointChart({ host, point, year, monthIndex, beforeCount, afterCount });
      }
    });
    return;
  }
  const H = 140;
  const margin = { top: 10, right: 10, bottom: 26, left: 34 };
  const innerW = W - margin.left - margin.right;
  const innerH = H - margin.top - margin.bottom;

  // --- Tight y-domain (annual zichtbaar) ---
  const annual = Number.isFinite(activeScale?.annual) ? activeScale.annual : null;

  const windowVals = windowRows
    .filter(d => d.status === "value" && Number.isFinite(d.value))
    .map(d => d.value);

  const windowMin = windowVals.length ? d3.min(windowVals) : 0;
  const windowMax = windowVals.length ? d3.max(windowVals) : 1;

  const minWithAnnual = annual != null ? Math.min(windowMin, annual) : windowMin;
  const maxWithAnnual = annual != null ? Math.max(windowMax, annual) : windowMax;

  const pad = (maxWithAnnual - minWithAnnual) * 0.15 || 5;

  let yMin = Math.max(0, minWithAnnual - pad);
  let yMax = maxWithAnnual + pad;
  if (yMax - yMin < 10) yMax = yMin + 10;

  const x = d3.scalePoint()
    .domain(windowRows.map((_, i) => i))
    .range([0, innerW])
    .padding(0.45);

  const y = d3.scaleLinear()
    .domain([yMin, yMax])
    .nice()
    .range([innerH, 0]);

  const svg = d3.select(host)
    .append("svg")
    .attr("width", W)
    .attr("height", H);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // gridlines
  g.append("g")
    .attr("opacity", 0.18)
    .call(d3.axisLeft(y).ticks(4).tickSize(-innerW).tickFormat(""))
    .call(s => s.select(".domain").remove());

  // x ticks (om en om) + altijd begin/eind
  const tickIdx = windowRows.map((_, i) => i).filter(i => i % 2 === 0);
  if (!tickIdx.includes(0)) tickIdx.unshift(0);
  const last = windowRows.length - 1;
  if (!tickIdx.includes(last)) tickIdx.push(last);

  g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(
      d3.axisBottom(x)
        .tickValues(tickIdx)
        .tickFormat(i => formatShortMonth(windowRows[i]))
    )
    .call(s => s.select(".domain").attr("opacity", 0.2))
    .call(s => s.selectAll("text").attr("font-size", 10));

  g.append("g")
    .call(d3.axisLeft(y).ticks(4))
    .call(s => s.select(".domain").attr("opacity", 0.2))
    .call(s => s.selectAll("text").attr("font-size", 10));

  // annual guideline
  if (annual != null) {
    const yA = y(annual);

    g.append("line")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", yA)
      .attr("y2", yA)
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "4 4")
      .attr("opacity", 0.55);

    g.append("text")
      .attr("x", innerW)
      .attr("y", Math.max(10, yA - 6))
      .attr("text-anchor", "end")
      .attr("font-size", 10)
      .attr("fill", "#0f172a")
      .attr("opacity", 0.7)
      .text(`${activeScale.key} annual: ${annual} µg/m³`);
  }

  // line with gaps
  const line = d3.line()
    .defined(d => d.status === "value" && Number.isFinite(d.value))
    .x((d, i) => x(i))
    .y(d => y(d.value));

  g.append("path")
    .datum(windowRows)
    .attr("d", line)
    .attr("fill", "none")
    .attr("stroke", "#334155")
    .attr("stroke-width", 2)
    .attr("opacity", 0.6);

  // --- Tooltip handler for dots (tap-friendly) ---
  const attachDotTooltip = (sel, getText) => {
    sel
      .style("cursor", "pointer")
      .on("pointerdown", (event, d) => {
        tooltipPinned = true;
        const text = getText(d);
        showChartTooltip(text, event.clientX, event.clientY);
        event.stopPropagation();
      })
      .on("pointermove", (event, d) => {
        if (!tooltipPinned) return;
        const text = getText(d);
        showChartTooltip(text, event.clientX, event.clientY);
      })
      .on("pointerleave", () => {
        if (tooltipPinned) return;
        hideChartTooltip();
      })
      .on("pointerenter", (event, d) => {
        if (tooltipPinned) return;
        const text = getText(d);
        showChartTooltip(text, event.clientX, event.clientY);
      });
  };

  // noMeasurement dots (op yMin baseline)
  const nomDots = g.selectAll("circle.nom-dot")
    .data(windowRows.map((d, i) => ({ ...d, i })).filter(d => d.status === "noMeasurement"))
    .enter()
    .append("circle")
    .attr("class", "nom-dot")
    .attr("cx", d => x(d.i))
    .attr("cy", y(yMin))
    .attr("r", 3.5)
    .attr("fill", kleuren.NOMES)
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5)
    .attr("opacity", 0.9);

  attachDotTooltip(nomDots, d => `${formatShortMonth(d)}: No measurement`);

  // value dots
  const valDots = g.selectAll("circle.val-dot")
    .data(windowRows.map((d, i) => ({ ...d, i })).filter(d => d.status === "value"))
    .enter()
    .append("circle")
    .attr("class", "val-dot")
    .attr("cx", d => x(d.i))
    .attr("cy", d => y(d.value))
    .attr("r", 4)
    .attr("fill", d => getKleuren(d.value, max))
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5);

  attachDotTooltip(valDots, d => `${formatShortMonth(d)}: ${d.value.toFixed(2)} µg/m³`);

  // highlight selected month
  const selectedKey = monthKey(year, monthIndex);
  const selIndex = windowRows.findIndex(r => r.dateKey === selectedKey);

  if (selIndex !== -1) {
    const sel = windowRows[selIndex];
    const selCy = (sel.status === "value" && Number.isFinite(sel.value)) ? y(sel.value) : y(yMin);
    const selFill = (sel.status === "value" && Number.isFinite(sel.value)) ? getKleuren(sel.value, max) : kleuren.NOMES;

    g.append("circle")
      .attr("cx", x(selIndex))
      .attr("cy", selCy)
      .attr("r", 7.5)
      .attr("fill", "none")
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 2)
      .attr("opacity", 0.65);

    g.append("circle")
      .attr("cx", x(selIndex))
      .attr("cy", selCy)
      .attr("r", 4.8)
      .attr("fill", selFill)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);
  }
}

function drawOverlayChart({ point, year, monthIndex }) {
  const host = document.getElementById("overlayChart");
  if (!host) return;

  // overlay blijft 5/5
  renderPointChart({ host, point, year, monthIndex, beforeCount: 5, afterCount: 5 });
}

/* =========================================================
   -------------------------- Table (dropdowns + card list + accordion)
========================================================= */

let tableInited = false;
const openRows = new Map(); // point_number -> boolean

const tableState = {
  sort: "no2_asc", // no2_desc | no2_asc | name_asc | name_desc
  search: ""
};

// ✅ NEW: globale settings (alleen bewerkbaar als card open is)
const tableWindowSettings = { before: 5, after: 5 };
let tableSettingsOpen = false;

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fmtValue(v) {
  return (typeof v === "number" && !Number.isNaN(v)) ? `${v.toFixed(1)} µg/m³` : "—";
}

// Label + accent kleur (zoals screenshot: Low/Medium/High/Very high)
function getLevelMetaForTable(value, isNoMeasurement) {
  if (isNoMeasurement || typeof value !== "number" || Number.isNaN(value)) {
    return { label: "n/a", accent: "#94A3B8" };
  }

  const a = activeScale?.annual;
  const h = activeScale?.high;

  if (typeof a !== "number" || typeof h !== "number") {
    // fallback als scale incompleet is
    const max = activeScale?.colorMax ?? maxValue ?? 0;
    const cls = getClass(value, max);
    return { label: cls.label, accent: getKleuren(value, max) };
  }

  const highUpper = h + (h - a);

  if (value <= a) return { label: "Low", accent: "#22C55E" };
  if (value <= h) return { label: "Medium", accent: "#EAB308" };
  if (value <= highUpper) return { label: "High", accent: "#F97316" };
  return { label: "Very high", accent: "#EF4444" };
}

function buildTableMonthOptions(selectEl) {
  const availability = buildAvailability(points);
  const { byYear, years, latest } = availability;

  // alle beschikbare months flattenen
  const flat = [];
  years.forEach(y => {
    const set = byYear.get(y);
    if (!set) return;
    Array.from(set).forEach(mo => flat.push({ y, mo, key: `${y}-${String(mo).padStart(2, "0")}` }));
  });

  flat.sort((a, b) => (b.y - a.y) || (b.mo - a.mo));

  selectEl.innerHTML = "";
  flat.forEach(({ y, mo, key }) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = `${monthNames[mo]} ${y}`;
    selectEl.appendChild(opt);
  });

  // default = huidige globale selectie, anders latest
  const desiredKey = `${selectedYear}-${String(selectedMonthIndex).padStart(2, "0")}`;
  const exists = flat.some(x => x.key === desiredKey);

  if (exists) selectEl.value = desiredKey;
  else if (latest) selectEl.value = `${latest.year}-${String(latest.monthIndex).padStart(2, "0")}`;
  else if (flat.length) selectEl.value = flat[0].key;
}

function parseMonthKey(key) {
  const [y, mo] = String(key || "").split("-");
  return { year: Number(y), monthIndex: Number(mo) };
}

function initTableView() {
  if (tableInited) return;

  const monthSelect = document.getElementById("tableMonth");
  const sortSelect = document.getElementById("tableSort");
  const searchInput = document.getElementById("tableSearch");
  const listEl = document.getElementById("tableList");

  if (!monthSelect || !sortSelect || !searchInput || !listEl) return;

  // fill month dropdown (based on your data)
  buildTableMonthOptions(monthSelect);

  // set sort default
  sortSelect.value = tableState.sort;

  monthSelect.addEventListener("change", () => {
    const { year, monthIndex } = parseMonthKey(monthSelect.value);
    if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) return;

    selectedYear = year;
    selectedMonthIndex = monthIndex;

    // sync top-right date menu UI
    syncDateMenuUIFromState();

    // refresh visuals
    updateMarkers();
    renderTable();
  });

  sortSelect.addEventListener("change", () => {
    tableState.sort = sortSelect.value;
    renderTable();
  });

  searchInput.addEventListener("input", () => {
    tableState.search = searchInput.value.trim().toLowerCase();
    renderTable();
  });

  // ✅ UPDATED: single-open accordion + settings + +/- buttons
  listEl.addEventListener("click", (e) => {
    // 1) toggle accordion (only header)
    const header = e.target.closest("[data-accordion-toggle]");
    if (header) {
      const card = header.closest(".table-card");
      if (!card) return;

      const id = Number(card.dataset.pointNumber);
      const isOpen = openRows.get(id) === true;

      // ✅ only one open: close all others
      openRows.clear();

      // toggle current
      if (!isOpen) {
        openRows.set(id, true);
      } else {
        tableSettingsOpen = false; // closing => settings dicht
      }

      renderTable();
      return;
    }

    // 2) settings toggle
    const settingsBtn = e.target.closest("[data-table-settings]");
    if (settingsBtn) {
      e.preventDefault();
      e.stopPropagation();
      tableSettingsOpen = !tableSettingsOpen;
      renderTable();
      return;
    }

    // 3) +/- controls (global)
    const decBefore = e.target.closest("[data-before-dec]");
    const incBefore = e.target.closest("[data-before-inc]");
    const decAfter = e.target.closest("[data-after-dec]");
    const incAfter = e.target.closest("[data-after-inc]");

    if (decBefore || incBefore || decAfter || incAfter) {
      e.preventDefault();
      e.stopPropagation();

      if (decBefore) tableWindowSettings.before = Math.max(0, tableWindowSettings.before - 1);
      if (incBefore) tableWindowSettings.before = Math.min(12, tableWindowSettings.before + 1);

      if (decAfter) tableWindowSettings.after = Math.max(0, tableWindowSettings.after - 1);
      if (incAfter) tableWindowSettings.after = Math.min(12, tableWindowSettings.after + 1);

      tableSettingsOpen = true; // open houden tijdens aanpassen
      renderTable();
      return;
    }
  });

  // ✅ input-listener is niet meer nodig (we gebruiken +/- knoppen)
  tableInited = true;
}

function renderTable() {
  initTableView();

  const monthSelect = document.getElementById("tableMonth");
  const sortSelect = document.getElementById("tableSort");
  const searchInput = document.getElementById("tableSearch");
  const listEl = document.getElementById("tableList");
  if (!monthSelect || !sortSelect || !searchInput || !listEl) return;

  // keep dropdown in sync if month changed via map menu
  const desiredKey = `${selectedYear}-${String(selectedMonthIndex).padStart(2, "0")}`;
  if (monthSelect.value !== desiredKey) {
    const has = Array.from(monthSelect.options).some(o => o.value === desiredKey);
    if (!has) buildTableMonthOptions(monthSelect);
    monthSelect.value = desiredKey;
  }

  const year = selectedYear;
  const monthIndex = selectedMonthIndex;

  const q = tableState.search;

  // Build items for current month
  let items = points.map(pt => {
    const location = pt?.location || `Point ${pt?.point_number ?? ""}`;
    const city = (window?.bootData?.keuzes?.["Gekozen stad"]) ? window.bootData.keuzes["Gekozen stad"] : "Kumasi";

    const res = getMonthValue(pt, year, monthIndex);

    const isNo = (res?.status === "noMeasurement");
    const value = (res?.status === "value") ? res.value : null;

    const meta = getLevelMetaForTable(value, isNo);

    const max = activeScale?.colorMax ?? maxValue ?? 0;
    const dot = isNo ? "#94A3B8" : (value == null ? "#94A3B8" : getKleuren(value, max));

    return {
      pt,
      location,
      city,
      value,
      isNo,
      level: meta.label,
      levelColor: meta.accent,
      dot
    };
  });

  // search
  if (q) {
    items = items.filter(item => item.location.toLowerCase().includes(q));
  }

  // sort
  const valueOrNegInf = (v) => (typeof v === "number" && !Number.isNaN(v)) ? v : -Infinity;
  const valueOrPosInf = (v) => (typeof v === "number" && !Number.isNaN(v)) ? v : Infinity;

  items.sort((a, b) => {
    if (tableState.sort === "no2_desc") return valueOrNegInf(b.value) - valueOrNegInf(a.value);
    if (tableState.sort === "no2_asc") return valueOrPosInf(a.value) - valueOrPosInf(b.value);
    if (tableState.sort === "name_desc") return b.location.localeCompare(a.location);
    return a.location.localeCompare(b.location);
  });

  if (!items.length) {
    listEl.innerHTML = `<div style="padding:10px; color:#0b3d4d; font-weight:600;">No results</div>`;
    return;
  }

  const monthLabel = (Number.isFinite(monthIndex) && monthNames[monthIndex]) ? monthNames[monthIndex] : "";
  const metaText = `${escapeHtml("Kumasi")} · ${escapeHtml(monthLabel)} ${escapeHtml(String(year))}`;

  const selectedKey = monthKey(year, monthIndex);

  listEl.innerHTML = items.map(item => {
    const p = item.pt;
    const id = p.point_number;
    const open = openRows.get(id) === true;

    // ✅ windowed rows i.p.v. alle rows
    const allRowsSorted = getSortedMonthlyMeasurements(p);
    const { windowRows } = buildWindowAround(
      allRowsSorted,
      year,
      monthIndex,
      tableWindowSettings.before,
      tableWindowSettings.after
    );

    const measuresHtml = windowRows.map(r => {
      const isSel = r.dateKey === selectedKey;

      let v = "No measurement";
      if (r.status === "value") v = `${r.value.toFixed(1)} µg/m³`;

      return `
        <li class="measureRow ${isSel ? "is-selected" : ""}">
          <span class="measureMonth">${escapeHtml(formatMonthYear(r.year, r.monthIndex))}</span>
          <span class="measureVal">${escapeHtml(v)}</span>
        </li>
      `;
    }).join("");

    const settingsHtml = `
      <div class="table-panel__top" style="display:flex; justify-content:flex-end; align-items:center; position:relative; margin: 6px 0 10px 0;">
        <button type="button" class="table-settings-btn" data-table-settings aria-label="Window settings"
          style="border:1px solid #dbe5ef; background:#fff; border-radius:10px; padding:6px 8px; cursor:pointer;">
          ⚙
        </button>

        <div class="table-settings-popover" ${tableSettingsOpen ? "" : "hidden"}
          style="position:absolute; top:38px; right:0; width:min(280px,100%); background:#fff; border:1px solid #dbe5ef; border-radius:12px; padding:10px; box-shadow:0 14px 40px rgba(15,23,42,.16); z-index:5;">

          <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; font-size:12px; color:#0f172a; margin:8px 0;">
            <span>Months before</span>
            <div style="display:flex; align-items:center; gap:8px;">
              <button type="button" data-before-dec
                style="width:32px;height:32px;border-radius:10px;border:1px solid #dbe5ef;background:#fff;cursor:pointer;font-weight:700;">−</button>

              <strong style="min-width:22px;text-align:center; display:inline-block;">${escapeHtml(String(tableWindowSettings.before))}</strong>

              <button type="button" data-before-inc
                style="width:32px;height:32px;border-radius:10px;border:1px solid #dbe5ef;background:#fff;cursor:pointer;font-weight:700;">+</button>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; font-size:12px; color:#0f172a; margin:8px 0;">
            <span>Months after</span>
            <div style="display:flex; align-items:center; gap:8px;">
              <button type="button" data-after-dec
                style="width:32px;height:32px;border-radius:10px;border:1px solid #dbe5ef;background:#fff;cursor:pointer;font-weight:700;">−</button>

              <strong style="min-width:22px;text-align:center; display:inline-block;">${escapeHtml(String(tableWindowSettings.after))}</strong>

              <button type="button" data-after-inc
                style="width:32px;height:32px;border-radius:10px;border:1px solid #dbe5ef;background:#fff;cursor:pointer;font-weight:700;">+</button>
            </div>
          </div>

        </div>
      </div>
    `;

    return `
      <div class="table-card" data-point-number="${escapeHtml(id)}" aria-expanded="${open ? "true" : "false"}">
        <div class="table-card__header" data-accordion-toggle role="button" tabindex="0">
          <div class="table-card__title">
            <span class="table-dot" style="background:${escapeHtml(item.dot)}"></span>
            <span>${escapeHtml(item.location)}</span>
          </div>

          <div class="table-card__metric">
            NO₂ : <strong>${escapeHtml(fmtValue(item.value))}</strong>
            · <span class="table-level" style="color:${escapeHtml(item.levelColor)}">${escapeHtml(item.level)}</span>
          </div>

          <div class="table-card__meta">${metaText}</div>
        </div>

        ${open ? `
          <div class="table-panel">
            ${p.description ? `<div style="color:#475569; font-size:12px; margin-bottom:8px;">${escapeHtml(p.description)}</div>` : ""}

            ${settingsHtml}

            <!-- ✅ Chart for this point -->
            <div id="tableChart-${escapeHtml(id)}" class="table-pointChart" style="width:100%; min-height:150px; background:#fff; border:1px solid #e6eef6; border-radius:12px; padding:6px 6px 2px 6px;"></div>

            <ul class="measureList">${measuresHtml}</ul>
          </div>
        ` : ""}
      </div>
    `;
  }).join("");

  // ✅ draw charts for open panels
  items.forEach(item => {
    const id = item.pt.point_number;
    if (openRows.get(id) !== true) return;

    const host = document.getElementById(`tableChart-${id}`);
    if (!host) return;

    renderPointChart({
      host,
      point: item.pt,
      year,
      monthIndex,
      beforeCount: tableWindowSettings.before,
      afterCount: tableWindowSettings.after
    });
  });
}

// initial render
renderTable();

setActiveScaleByPreset("DATA")