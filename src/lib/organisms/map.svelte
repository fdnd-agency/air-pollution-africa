<script>
	import { onDestroy, onMount } from 'svelte'
	import 'leaflet/dist/leaflet.css'
	import { reshapePoints, computeMaxValue, buildScalePresets, getKleuren, getClass, getMonthValue, buildAvailability, legendValues, sortedMonthly, windowAround, buildSparkline, kleuren, monthNames, monthShort, monthKey } from '$lib/airQuality'

	const { samplingPoints = [], measurements = [], initialView, initialZoom = 13 } = $props()

	let mapElement
	let map
	let markerLayer
	let L
	let overlayEl

	// References to dynamic bits of the imperatively-built Leaflet controls.
	let legendRefs = {}
	let dateRefs = {}
	let scaleButtonEls = []

	// Data + view state (computed once the component mounts).
	let points = []
	let maxValue = null
	let scalePresets = buildScalePresets(null)
	let activeScale = scalePresets.RELATIVE
	let availability = { byYear: {}, years: [], latest: null }
	let selectedYear = new Date().getFullYear()
	let selectedMonthIndex = new Date().getMonth()

	function clampYear(y) {
		const { years } = availability
		if (!years.length) return y
		if (y <= years[0]) return years[0]
		if (y >= years[years.length - 1]) return years[years.length - 1]
		if (years.includes(y)) return y
		return years.reduce((best, yr) => (Math.abs(y - yr) < Math.abs(y - best) ? yr : best), years[0])
	}

	function closestMonth(year, desired) {
		const set = availability.byYear[year]
		if (!set || !set.length) return desired
		if (set.includes(desired)) return desired
		return set
			.slice()
			.sort((a, b) => a - b)
			.reduce((best, mo) => (Math.abs(desired - mo) < Math.abs(desired - best) ? mo : best), set[0])
	}

	// --- markers ---------------------------------------------------------------
	function updateMarkers() {
		if (!markerLayer) return
		markerLayer.clearLayers()
		const max = activeScale?.colorMax ?? maxValue ?? 0
		for (const p of points) {
			if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) continue
			const res = getMonthValue(p, selectedYear, selectedMonthIndex)
			if (res.status === 'missing') continue
			const fill = res.status === 'noMeasurement' ? kleuren.NOMES : getKleuren(res.value, max)

			L.circleMarker([p.lat, p.lon], { radius: 14, stroke: false, fill: true, fillColor: '#000', fillOpacity: 0.25, interactive: false }).addTo(markerLayer)
			const marker = L.circleMarker([p.lat, p.lon], { radius: 10, stroke: true, color: '#FFF', weight: 1, fill: true, fillColor: fill, fillOpacity: 1 }).addTo(markerLayer)
			marker.on('click', () => openOverlay(p))
		}
	}

	// --- Leaflet controls ------------------------------------------------------
	function addControl(position, build) {
		const ctrl = L.control({ position })
		ctrl.onAdd = () => {
			const div = L.DomUtil.create('div', 'leaflet-control-custom')
			L.DomEvent.disableClickPropagation(div)
			L.DomEvent.disableScrollPropagation(div)
			build(div)
			return div
		}
		ctrl.addTo(map)
		return ctrl
	}

	function buildLegend(div) {
		div.innerHTML = `
			<div class="menu" id="legenda">
				<p>Legenda</p>
				<p><span class="legendaDot" style="background-color:${kleuren.LOW}"></span> Low | <span data-legend="low"></span></p>
				<p><span class="legendaDot" style="background-color:${kleuren.MID}"></span> Medium | <span data-legend="mid"></span></p>
				<p><span class="legendaDot" style="background-color:${kleuren.HIGH}"></span> High | <span data-legend="high"></span></p>
				<p><span class="legendaDot" style="background-color:${kleuren.MAX}"></span> Dangerous | <span data-legend="max"></span></p>
				<span style="border-radius:5px;display:block;padding:10px;width:inherit;height:20px;background:linear-gradient(to right, rgb(0,255,0), rgb(255,255,0), rgb(255,165,0), rgb(255,0,0), rgb(54,0,54));"></span>
			</div>`
		legendRefs = {
			low: div.querySelector('[data-legend="low"]'),
			mid: div.querySelector('[data-legend="mid"]'),
			high: div.querySelector('[data-legend="high"]'),
			max: div.querySelector('[data-legend="max"]')
		}
	}

	function updateLegend() {
		const v = legendValues(activeScale?.colorMax)
		if (legendRefs.low) legendRefs.low.textContent = v.LOW
		if (legendRefs.mid) legendRefs.mid.textContent = v.MID
		if (legendRefs.high) legendRefs.high.textContent = v.HIGH
		if (legendRefs.max) legendRefs.max.textContent = v.MAX
	}

	function buildDateMenu(div) {
		div.innerHTML = `
			<div class="menu menuTopRight">
				<section id="selected"><p data-selected-text></p></section>
				<section id="dateOptions">
					<fieldset>
						<legend>Year:</legend>
						<input data-prev type="button" value="-">
						<input data-year type="number">
						<input data-next type="button" value="+">
					</fieldset>
					<hr>
					<fieldset>
						<legend>Month:</legend>
						${monthShort.map((m) => `<input class="inputMonth" type="button" value="${m}">`).join('')}
					</fieldset>
				</section>
			</div>`

		const selected = div.querySelector('#selected')
		const dateOptions = div.querySelector('#dateOptions')
		dateRefs = {
			text: div.querySelector('[data-selected-text]'),
			year: div.querySelector('[data-year]'),
			prev: div.querySelector('[data-prev]'),
			next: div.querySelector('[data-next]'),
			months: Array.from(div.querySelectorAll('.inputMonth'))
		}

		selected.addEventListener('click', () => dateOptions.classList.toggle('open'))
		dateRefs.prev.addEventListener('click', () => {
			selectedYear -= 1
			refreshDate()
		})
		dateRefs.next.addEventListener('click', () => {
			selectedYear += 1
			refreshDate()
		})
		dateRefs.year.addEventListener('input', () => {
			const v = Number(dateRefs.year.value)
			if (Number.isFinite(v)) {
				selectedYear = v
				refreshDate()
			}
		})
		dateRefs.months.forEach((btn, idx) => {
			btn.addEventListener('click', () => {
				if (btn.disabled) return
				selectedMonthIndex = idx
				refreshDate()
			})
		})
	}

	function refreshDate() {
		selectedYear = clampYear(selectedYear)
		selectedMonthIndex = closestMonth(selectedYear, selectedMonthIndex)
		updateDateUI()
		updateMarkers()
	}

	function updateDateUI() {
		if (!dateRefs.text) return
		const { years, byYear } = availability
		dateRefs.text.textContent = `${monthNames[selectedMonthIndex]} ${selectedYear}`
		dateRefs.year.value = selectedYear
		const set = byYear[selectedYear] || []
		dateRefs.months.forEach((btn, idx) => {
			const ok = set.includes(idx)
			btn.disabled = !ok
			btn.classList.toggle('is-disabled', !ok)
			btn.classList.toggle('active', idx === selectedMonthIndex)
			btn.title = ok ? '' : 'No data for this month'
		})
		dateRefs.prev.disabled = years.length ? selectedYear <= years[0] : false
		dateRefs.next.disabled = years.length ? selectedYear >= years[years.length - 1] : false
	}

	function buildScale(div) {
		div.innerHTML = `
			<div class="scale-control" style="position:static;bottom:auto;right:auto;">
				<button class="scaleWHO" type="button" data-preset="WHO">WHO</button>
				<button class="scaleEU" type="button" data-preset="EU">EU</button>
				<button class="scaleRelative" type="button" data-preset="RELATIVE">Relative</button>
			</div>`
		scaleButtonEls = Array.from(div.querySelectorAll('button'))
		scaleButtonEls.forEach((btn) => btn.addEventListener('click', () => setScale(btn.dataset.preset)))
	}

	function syncScaleButtons() {
		scaleButtonEls.forEach((btn) => btn.classList.toggle('is-active', btn.dataset.preset === activeScale.key))
	}

	function setScale(key) {
		const preset = scalePresets[key]
		if (!preset) return
		activeScale = preset
		syncScaleButtons()
		updateLegend()
		updateMarkers()
	}

	// --- marker detail overlay -------------------------------------------------
	function ensureOverlay() {
		if (overlayEl) return
		overlayEl = document.createElement('div')
		overlayEl.className = 'overlay'
		overlayEl.hidden = true
		overlayEl.innerHTML = `
			<div class="overlay__backdrop" data-close></div>
			<div class="overlay__panel" role="dialog" aria-modal="true">
				<button class="overlay__close" type="button" aria-label="Close" data-close>×</button>
				<div data-overlay-content></div>
			</div>`
		overlayEl.addEventListener('click', (e) => {
			if (e.target.closest('[data-close]')) closeOverlay()
		})
		document.addEventListener('keydown', onKeydown)
		document.body.appendChild(overlayEl)
	}

	function onKeydown(e) {
		if (e.key === 'Escape' && overlayEl && !overlayEl.hidden) closeOverlay()
	}

	function closeOverlay() {
		if (!overlayEl) return
		overlayEl.hidden = true
		document.body.classList.remove('overlay-open')
	}

	function openOverlay(point) {
		ensureOverlay()
		const content = overlayEl.querySelector('[data-overlay-content]')
		const max = activeScale?.colorMax ?? maxValue ?? 0
		const rows = sortedMonthly(point)
		const selKey = monthKey(selectedYear, selectedMonthIndex)
		const selected = rows.find((r) => r.dateKey === selKey) || null
		const value = selected?.status === 'value' ? selected.value : null
		const cls = getClass(value, max)
		const chipColor = selected?.status === 'noMeasurement' || value === null ? kleuren.NOMES : getKleuren(value, max)
		const win = windowAround(rows, selectedYear, selectedMonthIndex)

		const tableRows = win
			.map((r) => {
				const sel = r.dateKey === selKey
				const v = r.status === 'value' ? `${r.value.toFixed(2)}` : 'No measurement'
				const level = r.status === 'value' ? getClass(r.value, max).label : '—'
				return `<tr${sel ? ' style="font-weight:700;"' : ''}><td>${monthNames[r.monthIndex]} ${r.year}</td><td>${v}</td><td>${level}</td></tr>`
			})
			.join('')

		const guideline = activeScale?.annual ? `${activeScale.key} guideline (annual): &lt; ${activeScale.annual} µg/m³` : 'Guideline: —'
		const cardValue = value === null ? (selected?.status === 'noMeasurement' ? 'No measurement' : '—') : `${value.toFixed(2)} µg/m³`

		content.innerHTML = `
			<div class="popup">
				<div class="popup__header">
					<h2 class="popup__title">${point.location ?? 'Location'}</h2>
					<p class="popup__desc">${point.description ?? ''}</p>
				</div>
				<div class="popup__meta">
					<div class="popup__metaItem"><div class="popup__metaLabel">MEASURED MONTH</div><div class="popup__metaValue">${monthNames[selectedMonthIndex]} ${selectedYear}</div></div>
					<div class="popup__metaItem"><div class="popup__metaLabel">FREQUENCY</div><div class="popup__metaValue">Monthly</div></div>
				</div>
				<div class="popup__card">
					<div class="popup__cardTop">
						<div class="popup__tiny">Measured using passive diffusion tubes</div>
						<div class="popup__chip" style="background:${chipColor}">${cls.label}</div>
					</div>
					<div class="popup__metricRow">
						<div>
							<div class="popup__metricLabel">NO₂</div>
							<div class="popup__metricValue">${cardValue}</div>
							<div class="popup__metricHint">*Based on monthly average NO₂</div>
						</div>
						<div class="popup__guideline">${guideline}</div>
					</div>
				</div>
				<div class="popup__sectionTitle">MONTHLY VALUES</div>
				<div class="popup__chartPlaceholder" style="height:auto;padding:6px;">${buildSparkline(win, activeScale, maxValue)}</div>
				<div class="popup__tableWrap">
					<table class="popup__table">
						<thead><tr><th>Month</th><th>NO₂ (µg/m³)</th><th>Level</th></tr></thead>
						<tbody>${tableRows || '<tr><td colspan="3">No data</td></tr>'}</tbody>
					</table>
				</div>
			</div>`
		overlayEl.hidden = false
		document.body.classList.add('overlay-open')
	}

	// --- lifecycle -------------------------------------------------------------
	onMount(async () => {
		points = reshapePoints(samplingPoints, measurements)
		maxValue = computeMaxValue(points)
		scalePresets = buildScalePresets(maxValue)
		activeScale = scalePresets.RELATIVE
		availability = buildAvailability(points)
		selectedYear = availability.latest?.year ?? new Date().getFullYear()
		selectedMonthIndex = availability.latest?.monthIndex ?? new Date().getMonth()

		L = await import('leaflet')
		map = L.map(mapElement, { zoomControl: false }).setView(initialView, initialZoom)
		L.control.zoom({ position: 'bottomleft' }).addTo(map)
		L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
			maxZoom: 19,
			attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
		}).addTo(map)
		markerLayer = L.layerGroup().addTo(map)

		addControl('topleft', buildLegend)
		addControl('topright', buildDateMenu)
		addControl('bottomright', buildScale)
		ensureOverlay()

		updateLegend()
		syncScaleButtons()
		updateDateUI()
		updateMarkers()

		setTimeout(() => map.invalidateSize(), 100)
	})

	onDestroy(() => {
		// onDestroy also runs during SSR cleanup, where `document` is undefined.
		if (typeof document !== 'undefined') document.removeEventListener('keydown', onKeydown)
		if (overlayEl) overlayEl.remove()
		if (map) map.remove()
	})
</script>

<section class="map-organism">
	<h2 class="sr-only">Meetpunt</h2>
	<div
		bind:this={mapElement}
		class="map-container"
	></div>
</section>

<style>
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	/* Fills the flex area it is dropped into (e.g. #mapView) rather than a fixed
	   height, so the map page can fill the viewport without scrolling. */
	.map-organism {
		flex: 1;
		min-height: 0;
		width: 100%;
		display: flex;
		position: relative;
		z-index: 1;
	}

	.map-container {
		flex: 1;
		min-height: 0;
		width: 100%;
		height: 100%;
		border-radius: 12px;
		overflow: hidden;
		background-color: #e5e5e5;
	}
</style>
