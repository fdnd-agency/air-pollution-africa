<script>
	import { Map } from '$lib'
	import { reshapePoints, computeMaxValue, buildScalePresets, buildAvailability, getMonthValue, getClass, getKleuren, sortedMonthly, windowAround, buildSparkline, monthNames, monthKey } from '$lib/airQuality'

	/** @type {import('./$types').PageProps} */
	const { data } = $props()

	// --- view + table state ----------------------------------------------------
	let view = $state('map') // 'map' | 'table'
	let scaleKey = $state('RELATIVE')
	let sort = $state('no2_desc')
	let search = $state('')
	let selected = $state(null) // { year, monthIndex } override, else latest
	const openRows = $state({})

	// --- derived data ----------------------------------------------------------
	const points = $derived(reshapePoints(data.points, data.measurements))
	const maxValue = $derived(computeMaxValue(points))
	const scalePresets = $derived(buildScalePresets(maxValue))
	const activeScale = $derived(scalePresets[scaleKey])
	const availability = $derived(buildAvailability(points))
	const effectiveSel = $derived(selected ?? availability.latest ?? { year: new Date().getFullYear(), monthIndex: new Date().getMonth() })
	const selKey = $derived(monthKey(effectiveSel.year, effectiveSel.monthIndex))
	const selValue = $derived(`${effectiveSel.year}-${String(effectiveSel.monthIndex).padStart(2, '0')}`)

	const monthOptions = $derived.by(() => {
		const out = []
		for (const y of availability.years) {
			for (const mo of (availability.byYear[y] || []).slice().sort((a, b) => a - b)) {
				out.push({ year: y, monthIndex: mo, key: `${y}-${String(mo).padStart(2, '0')}`, label: `${monthNames[mo]} ${y}` })
			}
		}
		out.sort((a, b) => b.year - a.year || b.monthIndex - a.monthIndex)
		return out
	})

	const tableItems = $derived.by(() => {
		const max = activeScale?.colorMax ?? maxValue ?? 0
		let items = points.map((p) => {
			const res = getMonthValue(p, effectiveSel.year, effectiveSel.monthIndex)
			const value = res.status === 'value' ? res.value : null
			const level = res.status === 'value' ? getClass(value, max).label : res.status === 'noMeasurement' ? 'n/a' : 'No data'
			const color = res.status === 'value' ? getKleuren(value, max) : '#94a3b8'
			return { p, location: p.location || `Point ${p.point_number ?? ''}`, value, status: res.status, level, color }
		})
		const q = search.trim().toLowerCase()
		if (q) items = items.filter((i) => i.location.toLowerCase().includes(q))
		const negInf = (v) => (typeof v === 'number' ? v : -Infinity)
		const posInf = (v) => (typeof v === 'number' ? v : Infinity)
		return items.slice().sort((a, b) => {
			if (sort === 'no2_desc') return negInf(b.value) - negInf(a.value)
			if (sort === 'no2_asc') return posInf(a.value) - posInf(b.value)
			if (sort === 'name_desc') return b.location.localeCompare(a.location)
			return a.location.localeCompare(b.location)
		})
	})

	function fmt(v) {
		return typeof v === 'number' && !Number.isNaN(v) ? `${v.toFixed(1)} µg/m³` : '—'
	}

	function onMonthChange(value) {
		const [y, mo] = String(value).split('-').map(Number)
		if (Number.isFinite(y) && Number.isFinite(mo)) selected = { year: y, monthIndex: mo }
	}

	function toggleRow(id) {
		openRows[id] = !openRows[id]
	}
</script>

<main class="home-layout">
	<section id="controls">
		<span style="display: flex; color: black; justify-content: space-between;">
			<h2>{data.city.name} Air Quality</h2>
			<a
				href="/{data.citySlug}/info"
				class="info-btn"
				aria-label="Info this project">i</a
			>
		</span>
		<div
			class="view-toggle"
			data-view-toggle
		>
			<button
				id="MapButton"
				class="viewSwitch"
				class:active={view === 'map'}
				type="button"
				onclick={() => (view = 'map')}>Map</button
			>
			<button
				id="TableButton"
				class="viewSwitch"
				class:active={view === 'table'}
				type="button"
				onclick={() => (view = 'table')}>Table</button
			>
		</div>
	</section>

	<section id="view">
		<div
			id="mapView"
			class:hidden={view !== 'map'}
		>
			<Map
				samplingPoints={data.points}
				measurements={data.measurements}
				initialView={[data.keuzes.Coordinaten[0], data.keuzes.Coordinaten[1]]}
			/>
		</div>

		<div
			id="tableView"
			class:hidden={view !== 'table'}
		>
			<section
				id="tableControl"
				class="tableControl"
			>
				<select
					id="tableMonth"
					class="tcSelect"
					aria-label="Select month"
					value={selValue}
					onchange={(e) => onMonthChange(e.currentTarget.value)}
				>
					{#each monthOptions as opt (opt.key)}
						<option value={opt.key}>{opt.label}</option>
					{/each}
				</select>

				<select
					id="tableSort"
					class="tcSelect"
					aria-label="Select sort"
					bind:value={sort}
				>
					<option value="no2_desc">Sort: highest NO₂</option>
					<option value="no2_asc">Sort: lowest NO₂</option>
					<option value="name_asc">Sort: a → z</option>
					<option value="name_desc">Sort: z → a</option>
				</select>

				<input
					id="tableSearch"
					class="tcSearch"
					type="search"
					placeholder="Search location..."
					aria-label="Search location"
					bind:value={search}
				/>
			</section>

			<section
				id="tableList"
				class="tableList"
			>
				{#if tableItems.length === 0}
					<div class="muted">No results</div>
				{:else}
					{#each tableItems as item (item.p.id)}
						{@const open = openRows[item.p.id] === true}
						<article class="table-card">
							<button
								type="button"
								class="table-card__header"
								aria-expanded={open}
								onclick={() => toggleRow(item.p.id)}
							>
								<div class="table-card__title">
									<span
										class="table-dot"
										style="background:{item.color}"
									></span>
									<span>{item.location}</span>
								</div>
								<div class="table-card__metric">
									NO₂ : <strong>{fmt(item.value)}</strong>
									· <span
										class="table-level"
										style="color:{item.color}">{item.level}</span
									>
								</div>
								<div class="table-card__meta">{data.city.name} · {monthNames[effectiveSel.monthIndex]} {effectiveSel.year}</div>
							</button>

							{#if open}
								{@const win = windowAround(sortedMonthly(item.p), effectiveSel.year, effectiveSel.monthIndex, 5, 5)}
								<div class="table-panel">
									{#if item.p.description}
										<div class="table-panel__desc">{item.p.description}</div>
									{/if}
									<div class="table-pointChart">
										<!-- eslint-disable-next-line svelte/no-at-html-tags -- locally generated SVG, no user input -->
										{@html buildSparkline(win, activeScale, maxValue)}
									</div>
									<ul class="measureList">
										{#each win as r (r.dateKey)}
											<li
												class="measureRow"
												class:is-selected={r.dateKey === selKey}
											>
												<span class="measureMonth">{monthNames[r.monthIndex]} {r.year}</span>
												<span class="measureVal">{r.status === 'value' ? `${r.value.toFixed(1)} µg/m³` : 'No measurement'}</span>
											</li>
										{/each}
									</ul>
								</div>
							{/if}
						</article>
					{/each}
				{/if}
			</section>

			<div class="scale-control-table">
				<button
					class="scaleWHO"
					class:is-active={scaleKey === 'WHO'}
					type="button"
					onclick={() => (scaleKey = 'WHO')}>WHO</button
				>
				<button
					class="scaleEU"
					class:is-active={scaleKey === 'EU'}
					type="button"
					onclick={() => (scaleKey = 'EU')}>EU</button
				>
				<button
					class="scaleRelative"
					class:is-active={scaleKey === 'RELATIVE'}
					type="button"
					onclick={() => (scaleKey = 'RELATIVE')}>Relative</button
				>
			</div>
		</div>
	</section>
</main>

<style>
	/* Fills the viewport below the header (main is flex:1 in the body's flex
	   column) and clips, so the map page itself never scrolls. */
	.home-layout {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 10px;
		overflow: hidden;
		border-bottom: none;
		min-height: 0;
	}

	#controls {
		flex-shrink: 0;
	}

	#controls span h2 {
		color: var(--DEF-Blue-Tekst);
	}

	.info-btn {
		width: 32px;
		height: 32px;
		padding: 0;
		border-radius: 50%;
		border: 1px solid var(--DEF-Border);
		background: var(--DEF-Background);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 14px;
		color: var(--DEF-Blue-Styling);
		text-decoration: none;
	}

	.view-toggle {
		display: inline-flex;
		background: var(--DEF-Background);
		border-radius: 999px;
		padding: 4px;
		margin-top: 10px;
		gap: 4px;
		width: 100%;
	}

	.viewSwitch {
		width: 50%;
		padding: 6px 50px;
		border-radius: 999px;
		border: none;
		background: transparent;
		cursor: pointer;
		font-size: 13px;
		font-weight: 600;
		color: var(--DEF-Grey-Tekst);
		transition:
			background-color 0.5s ease,
			color 0.5s ease;
	}

	.active {
		background: var(--DEF-White);
		color: var(--DEF-Blue-Styling);
		box-shadow: var(--DEF-shadow-Small);
		transition:
			background-color 0.5s ease,
			color 0.5s ease;
	}

	/* The map/table area takes the remaining height; min-height:0 lets it shrink
	   so the map fills (and the table scrolls) instead of overflowing. */
	#view {
		flex: 1;
		display: flex;
		min-height: 0;
		overflow: hidden;
	}

	#mapView {
		flex: 1;
		display: flex;
		min-height: 0;
	}

	#tableView {
		flex: 1;
		min-height: 0;
		width: 100%;
		overflow: auto;
	}

	.hidden {
		display: none !important;
	}

	/* Reset the accordion toggle button to look like the card header row. */
	.table-card__header {
		display: block;
		width: 100%;
		text-align: left;
		background: none;
		border: 0;
		padding: 0;
		font: inherit;
		color: inherit;
		cursor: pointer;
	}

	.table-panel__desc {
		color: #475569;
		font-size: 12px;
		margin-bottom: 8px;
	}

	.muted {
		padding: 10px;
		color: var(--DEF-Blue-Tekst);
		font-weight: 600;
	}
</style>
