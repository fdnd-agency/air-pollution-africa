const dataRAW = document.getElementById("boot-data");
const data = dataRAW ? JSON.parse(dataRAW.textContent) : { keuzes: {}, points: [] };
const pointsNR = data.points.length;

const values = data.points.flatMap(p =>
  p.measurements
    .filter(m => typeof m.value === "number")
    .map(m => m.value)
);

const succeededValues = data.points.flatMap(p =>
  p.measurements
    .filter(m => typeof m.value === "number")
    .map(m => m.value)
);

const failedMeasurements = data.points.flatMap(p =>
  p.measurements.filter(m => m.noMeasurement === true || typeof m.value !== "number")
);

const measurementsNR = succeededValues.length + failedMeasurements.length;
const measurementsGoodNR = succeededValues.length;
const measurementsFaultyNR = failedMeasurements.length;

const lowestMeasurement = Math.min(...values);
const highestMeasurement = Math.max(...values);

const allMeasurements = data.points.flatMap(p =>
  p.measurements
    .filter(m => typeof m.value === "number")
    .map(m => ({
      point_number: p.point_number,
      location: p.location,
      date: m.date,
      value: m.value,
      tube_id: m.tube_id
    }))
);

const minData = allMeasurements.reduce((a, b) => (b.value < a.value ? b : a));
const maxData = allMeasurements.reduce((a, b) => (b.value > a.value ? b : a));

const measurementYears = new Set(
  data.points.flatMap(p =>
    p.measurements.map(m =>
      new Date(m.date).getUTCFullYear()
    )
  )
);

const d = new Date();
document.getElementById("batchYear").value = d.getFullYear();
document.getElementById("batchMonth").value = String(d.getMonth() + 1);

const yearRange = measurementYears.size;

const statPoints = document.getElementById("statPoints")
const statMeasurements = document.getElementById("statMeasurements")
const statMeasurementsGood = document.getElementById("statMeasurementsGood")
const statMeasurementsFaulty = document.getElementById("statMeasurementsFaulty")
const statLow = document.getElementById("statLow")
const statHigh = document.getElementById("statHigh")
const statYears = document.getElementById("statYears")


statPoints.textContent = pointsNR
statMeasurements.textContent = measurementsNR
statMeasurementsGood.textContent = measurementsGoodNR
statMeasurementsFaulty.textContent = measurementsFaultyNR
statLow.textContent = lowestMeasurement
statHigh.textContent = highestMeasurement
statYears.textContent = yearRange

const batchInput = document.getElementById("batchInput")
const measurementPoints = document.getElementById("batchpoints")

data.points.forEach(point => {
  if(point.active == false) {
    return
  }
  const article = document.createElement("article");
  article.dataset.pointNumber = point.point_number;

  const h3 = document.createElement("h3");
  h3.textContent = point.location;

  const labelTubeID = document.createElement("label");
  labelTubeID.textContent = "Tube ID";
  labelTubeID.classList.add("bold")

  const labelValue = document.createElement("label");
  labelValue.textContent = "Value (µg/m³)";
  labelValue.classList.add("bold")

  const inputTube = document.createElement("input");
  inputTube.type = "text";
  inputTube.name = `inputTube_${point.point_number}`;
  inputTube.placeholder = point.measurements?.[0]?.tube_id || "B3";
  inputTube.required = true;

  const inputValue = document.createElement("input");
  inputValue.type = "number";
  inputValue.step = "1";
  inputValue.name = `inputValue_${point.point_number}`;
  inputValue.placeholder = point.measurements?.[0]?.value || "23.35";
  inputValue.required = true;

  const labelNMP = document.createElement("label");
  labelNMP.className = "batchNoMeasurement";

  const inputNMP = document.createElement("input");
  inputNMP.type = "checkbox";
  inputNMP.className = "NMP";
  inputNMP.name = `nmp_${point.point_number}`;

  const spanNMP = document.createElement("span");
  spanNMP.textContent = "No measurement possible";
  spanNMP.classList.add("bold")

  labelNMP.append(inputNMP, spanNMP);

  inputNMP.addEventListener("change", () => {
    inputValue.disabled = inputNMP.checked;
    if (inputNMP.checked) inputValue.value = "";
  });

  article.append(h3, labelTubeID, labelValue, inputTube, inputValue, labelNMP);
  batchInput.append(article);
});

const adminEmails = document.getElementById("adminEmails");

data.users.forEach(user => {
  const article = document.createElement("article");
  article.dataset.user = user.email;

  const p1 = document.createElement("p");
  p1.textContent = user.email;

  const p2 = document.createElement("p");
  p2.textContent = `Created at: ${user.createdAt.slice(0, 10)}`;

  const form = document.createElement("form");
  form.action = `/DelUser?user=${encodeURIComponent(user.email)}`;
  form.method = "post";

  const button = document.createElement("button");
  button.classList.add("saveBatch");
  button.type = "submit";
  button.textContent = "Remove";

  form.append(button);
  article.append(p1, p2, form);
  adminEmails.append(article);
});

data.points.forEach(point => {
  const article = document.createElement("article");
  article.dataset.pointNumber = point.point_number;

  const h3 = document.createElement("h3");
  h3.textContent = point.location || "Location unknown";

  const status = document.createElement("span");
  status.textContent = point.active ? "active" : "inactive";

  const p3 = document.createElement("p");
  p3.className = "div3";
  p3.textContent = "Coordinates";
  p3.classList.add("bold")

  const p4 = document.createElement("p");
  p4.className = "div4";
  p4.textContent = "City";
  p4.classList.add("bold")

  const p5 = document.createElement("p");
  p5.className = "div5";
  p5.innerHTML = `<span class="bold">Lat: </span>${point.coordinates.lat.toFixed(4)}`;

  const p6 = document.createElement("p");
  p6.className = "div6";
  p6.innerHTML = `<span class="bold">Lon: </span>${point.coordinates.lon.toFixed(4)}`

  const p7 = document.createElement("p");
  p7.className = "div7";
  p7.textContent = data.keuzes["Gekozen stad"];

  const p8 = document.createElement("p");
  p8.className = "div8";
  p8.textContent = "Measurements";
  p8.classList.add("bold")

  const p9 = document.createElement("p");
  p9.className = "div9";
  p9.textContent = "Period";
  p9.classList.add("bold")

  // aantal geslaagde metingen
  const succeeded = point.measurements.filter(m => typeof m.value === "number");

  const p10 = document.createElement("p");
  p10.className = "div10";
  p10.textContent = succeeded.length;

  // periode bepalen
  const dates = point.measurements
    .map(m => m.date)
    .filter(Boolean)
    .sort((a, b) => new Date(a) - new Date(b));

  const start = dates[0];
  const end = dates[dates.length - 1];

  const p11 = document.createElement("p");
  p11.className = "div11";
  p11.textContent = start && end
    ? `${start.slice(0, 7)} to ${end.slice(0, 7)}`
    : "–";


  const btnEdit = document.createElement("button")
  btnEdit.type = "button"
  btnEdit.textContent = "Edit";
  btnEdit.classList = "saveBatch"
  btnEdit.addEventListener("click", () => window.openEditPointModal?.(point));

  const formDeactivate = document.createElement("form");
  formDeactivate.className = "div13";
  formDeactivate.action = `/togglepoint?point=${point.point_number}`;
  formDeactivate.method = "post";
  formDeactivate.classList = "clean"

  const btnDeactivate = document.createElement("button");
  btnDeactivate.type = "submit";
  btnDeactivate.classList = "saveBatch"
  btnDeactivate.textContent = point.active ? "Deactivate" : "Activate";

  formDeactivate.append(btnDeactivate);


  article.append(
    h3,
    status,
    p3, p4, p5, p6, p7,
    p8, p9, p10, p11,
    btnEdit,
    formDeactivate
  );

  measurementPoints.append(article);
});


function toDateInputValue(d) {
  if (!d) return "";
  const dt = (d instanceof Date) ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 10);
}

function addMeasurementRow(rowsEl, m = {}, index = 0) {
  const row = document.createElement("div");
  row.className = "measurementRow";

  const hasNoMeas = Boolean(m.noMeasurement);

  row.innerHTML = `
    <input type="date" name="measurements[${index}][date]" value="${toDateInputValue(m.date)}" required />

    <label class="noMeasToggle">
      <input type="checkbox" name="measurements[${index}][noMeasurement]" ${hasNoMeas ? "checked" : ""} />
      <span>No measurement</span>
    </label>

    <input type="text" name="measurements[${index}][tube_id]" value="${m.tube_id ?? ""}" placeholder="tube id" />
    <input type="number" step="any" name="measurements[${index}][value]" value="${m.value ?? ""}" placeholder="value" />

    <button type="button" class="removeRow" aria-label="Remove measurement">×</button>
  `;

  const cb = row.querySelector('input[type="checkbox"][name^="measurements"]');
  const tube = row.querySelector('input[name$="[tube_id]"]');
  const val = row.querySelector('input[name$="[value]"]');

  const applyNoMeasState = () => {
    const on = cb.checked;
    if (on) {
      // disable + clear value (en desgewenst tube_id)
      val.value = "";
      val.disabled = true;

      tube.value = "";
      tube.disabled = true;
    } else {
      val.disabled = false;
      tube.disabled = false;
    }
  };

  cb.addEventListener("change", applyNoMeasState);
  applyNoMeasState();

  row.querySelector(".removeRow").addEventListener("click", () => {
    row.remove();
    reindexMeasurementRows(rowsEl);
  });

  rowsEl.appendChild(row);
}


function reindexMeasurementRows(rowsEl) {
  const rows = Array.from(rowsEl.querySelectorAll(".measurementRow"));
  rows.forEach((row, idx) => {
    row.querySelectorAll("input").forEach((inp) => {
      inp.name = inp.name.replace(/measurements\[\d+\]/, `measurements[${idx}]`);
    });
  });
}

function initEditPointModal() {
  const modal = document.getElementById("editPointModal");
  const form = document.getElementById("editPointForm");
  const btnClose = document.getElementById("editPointClose");
  const btnCancel = document.getElementById("editPointCancel");
  const rowsEl = document.getElementById("measurementRows");

  if (!modal || !form || !btnClose || !btnCancel || !rowsEl) return;

  const close = () => {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    rowsEl.innerHTML = "";
  };

  const open = (point) => {
    document.getElementById("editPointTitle").textContent = `Edit point ${point.point_number}`;
    document.getElementById("editPointNumber").value = point.point_number ?? "";

    document.getElementById("editLocation").value = point.location ?? "";
    document.getElementById("editLat").value = point.coordinates?.lat ?? "";
    document.getElementById("editLon").value = point.coordinates?.lon ?? "";
    document.getElementById("editDescription").value = point.description ?? "";

    form.action = `/editpoint?point=${encodeURIComponent(point.point_number)}`;

    rowsEl.innerHTML = "";
    const ms = Array.isArray(point.measurements) ? point.measurements : [];
    ms.forEach((m, i) => addMeasurementRow(rowsEl, m, i));

    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    setTimeout(() => document.getElementById("editLocation")?.focus(), 0);
  };

  btnClose.addEventListener("click", close);
  btnCancel.addEventListener("click", close);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) close();
  });

  window.openEditPointModal = open;
}

function initNewPointModal() {
  const modal = document.getElementById("newPointModal");
  const form = document.getElementById("newPointForm");
  const btnOpen = document.getElementById("newPointBtn");
  const btnClose = document.getElementById("newPointClose");
  const btnCancel = document.getElementById("newPointCancel");

  if (!modal || !form || !btnOpen || !btnClose || !btnCancel) return;

  const close = () => {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    form.reset();
  };

  const open = () => {
    // next point number = max + 1 (alleen UI; server bepaalt uiteindelijk)
    const maxNr = (data.points || []).reduce(
      (m, p) => Math.max(m, Number(p.point_number) || 0),
      0
    );
    document.getElementById("newPointNumber").value = String(maxNr + 1);

    // defaults
    document.getElementById("newPointCity").value = data.keuzes?.["Gekozen stad"] || "";
    document.getElementById("newPointActive").checked = true;

    // start_date: alleen 1e van de maand selectable via maand+jaar
    const monthEl = document.getElementById("newPointStartMonth");
    const yearEl = document.getElementById("newPointStartYear");
    const hiddenEl = document.getElementById("newPointStartDate"); // wordt gepost
    const previewEl = document.getElementById("newPointStartDatePreview"); // UI

    if (monthEl && yearEl && hiddenEl && previewEl) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayYear = today.getFullYear();
      const todayMonth = today.getMonth(); // 0-11

      // default = huidige maand/jaar
      monthEl.value = String(todayMonth);
      yearEl.value = String(todayYear);

      const updateMonthOptionLocks = () => {
        const yy = Number(yearEl.value);

        // als jaar in de toekomst -> terug naar dit jaar
        if (yy > todayYear) yearEl.value = String(todayYear);

        const finalYear = Number(yearEl.value);

        // future maanden uitzetten als jaar == dit jaar
        Array.from(monthEl.options).forEach(opt => {
          const m = Number(opt.value); // 0-11
          opt.disabled = (finalYear === todayYear) ? (m > todayMonth) : false;
        });

        // als huidige selectie future is geworden -> terug naar laatste geldige maand
        if (finalYear === todayYear && Number(monthEl.value) > todayMonth) {
          monthEl.value = String(todayMonth);
        }
      };

      const syncStartDate = () => {
        updateMonthOptionLocks();

        const yy = Number(yearEl.value);
        const mm = Number(monthEl.value);

        const yyyy = String(yy).padStart(4, "0");
        const mm2 = String(mm + 1).padStart(2, "0");
        const value = `${yyyy}-${mm2}-01`;

        hiddenEl.value = value;   // wordt gepost
        previewEl.value = value;  // UI
        previewEl.max = today.toISOString().slice(0, 10);
      };

      // init + listeners
      syncStartDate();
      monthEl.onchange = syncStartDate;
      yearEl.oninput = syncStartDate;
    }


    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    setTimeout(() => document.getElementById("newPointLocation")?.focus(), 0);
  };


  btnOpen.addEventListener("click", open);
  btnClose.addEventListener("click", close);
  btnCancel.addEventListener("click", close);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) close();
  });
}

initNewPointModal();
initEditPointModal();




const searchInput = document.getElementById("searchPoints");
const batchPoints = document.getElementById("batchpoints");


if (!searchInput || !batchPoints) {
  console.warn("Search or batchpoints not found (script runs too early?)");
} else {
  const noResults = document.createElement("p");
  noResults.textContent = "No measurement points found";
  noResults.style.display = "none";
  batchPoints.after(noResults);

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase().trim();

    let visibleCount = 0;

    for (const item of batchPoints.children) {
      const locationEl = item.querySelector(".location");
      const locationText = (locationEl ? locationEl.textContent : "").toLowerCase();

      // leeg -> alles tonen
      const match = query === "" || locationText.includes(query);

      item.style.display = match ? "" : "none";
      if (match) visibleCount++;
    }

    noResults.style.display = visibleCount === 0 ? "block" : "none";
  });
}
