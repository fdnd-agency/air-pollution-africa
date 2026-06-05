<script>
	import { invalidateAll } from '$app/navigation'

	/** @type {import('./$types').PageProps} */
	const { data } = $props()

	const now = new Date()

	// ---- Batch entry state ----
	let year = $state(now.getFullYear())
	let month = $state(now.getMonth() + 1)
	let batchStatus = $state('')
	/** per-point row state, keyed by point id */
	let rows = $state({})

	const activePoints = $derived(data.points.filter((p) => p.active))
	// Phased-out tubes stay in the data (and on historical measurements) but aren't
	// offered for new entries.
	const activeTubes = $derived(data.tubes.filter((t) => t.active !== false))

	// Ensure every active point has a row (without clobbering edits).
	$effect(() => {
		for (const p of activePoints) {
			if (!rows[p.id]) {
				const lastTube = p.measurements.at(-1)?.tubeId ?? activeTubes[0]?.id ?? ''
				rows[p.id] = { tubeId: lastTube, value: '', noMeasurement: false }
			}
		}
	})

	// ---- Points search ----
	let search = $state('')
	const filteredPoints = $derived(
		data.points.filter((p) => (p.location ?? '').toLowerCase().includes(search.trim().toLowerCase()))
	)

	// ---- New point modal ----
	let showNew = $state(false)
	let newStatus = $state('')
	let newPoint = $state({ location: '', lat: '', lon: '', description: '', month: now.getMonth(), year: now.getFullYear(), active: true })

	function openNew() {
		newStatus = ''
		newPoint = { location: '', lat: '', lon: '', description: '', month: now.getMonth(), year: now.getFullYear(), active: true }
		showNew = true
	}

	// ---- Edit point modal ----
	let showEdit = $state(false)
	let editStatus = $state('')
	let editPoint = $state(null)
	let editMeasurements = $state([])
	let deletedMeasurementIds = $state([])
	let rowKeySeq = 0

	function snapshot(row) {
		return JSON.stringify({ date: row.date, tubeId: row.tubeId, value: row.value, noMeasurement: row.noMeasurement })
	}

	function measurementRow(m = {}) {
		const row = {
			key: `r${rowKeySeq++}`,
			id: m.id ?? null,
			date: m.date ? String(m.date).slice(0, 10) : '',
			tubeId: m.tubeId ?? activeTubes[0]?.id ?? '',
			value: m.value === null || m.value === undefined ? '' : String(m.value),
			noMeasurement: m.id ? m.value === null : false
		}
		row.original = snapshot(row)
		return row
	}

	function openEdit(p) {
		editStatus = ''
		editPoint = { id: p.id, point_number: p.point_number, location: p.location ?? '', lat: p.latitude ?? '', lon: p.longitude ?? '', description: p.description ?? '' }
		editMeasurements = p.measurements.map((m) => measurementRow(m))
		deletedMeasurementIds = []
		showEdit = true
	}

	function addMeasurement() {
		editMeasurements = [...editMeasurements, measurementRow()]
	}

	function removeMeasurement(row) {
		if (row.id) deletedMeasurementIds = [...deletedMeasurementIds, row.id]
		editMeasurements = editMeasurements.filter((r) => r.key !== row.key)
	}

	// ---- Tubes ----
	let newTubeCode = $state('')
	let tubeStatus = $state('')

	async function createTube() {
		const code = newTubeCode.trim()
		if (!code) return
		tubeStatus = 'Adding…'
		const { ok, out } = await postJSON('/api/admin/tubes', 'POST', { code })
		if (!ok) {
			tubeStatus = out.error || 'Could not add tube.'
			return
		}
		newTubeCode = ''
		tubeStatus = ''
		await invalidateAll()
	}

	async function toggleTubeActive(t) {
		const { ok } = await postJSON(`/api/admin/tubes/${t.id}/active`, 'PATCH', { active: t.active === false })
		if (ok) await invalidateAll()
	}

	// ---- Users ----
	let newUserEmail = $state('')
	let newUserRole = $state('researcher')
	let userStatus = $state('')

	function monthName(i) {
		return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][i]
	}

	async function postJSON(path, method, body) {
		// All admin endpoints live under the current city, e.g. /<city>/api/admin/...
		const res = await fetch(`/${data.citySlug}${path}`, {
			method,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		})
		const out = await res.json().catch(() => ({}))
		return { ok: res.ok, out }
	}

	async function saveBatch() {
		const entries = []
		for (const p of activePoints) {
			const r = rows[p.id]
			if (!r) continue
			const hasValue = String(r.value ?? '').trim() !== ''
			if (!hasValue && !r.noMeasurement) continue // skip blank rows
			if (!r.tubeId) {
				batchStatus = `Pick a tube for "${p.location}".`
				return
			}
			entries.push({ pointId: p.id, tube_id: r.tubeId, value: r.noMeasurement ? '' : r.value, noMeasurement: !!r.noMeasurement })
		}

		if (!entries.length) {
			batchStatus = 'Enter at least one value (or mark a point as no measurement).'
			return
		}

		batchStatus = 'Saving…'
		const { ok, out } = await postJSON('/api/admin/measurements/batch', 'POST', { year, month, entries })
		if (!ok) {
			batchStatus = out.error || 'Save failed.'
			return
		}
		batchStatus = `Saved ${entries.length} measurement(s) for ${monthName(month - 1)} ${year}.`
		rows = {}
		await invalidateAll()
	}

	async function createPoint() {
		const startDate = `${String(newPoint.year).padStart(4, '0')}-${String(newPoint.month + 1).padStart(2, '0')}-01`
		newStatus = 'Saving…'
		const { ok, out } = await postJSON('/api/admin/points', 'POST', {
			location: newPoint.location,
			description: newPoint.description,
			lat: newPoint.lat,
			lon: newPoint.lon,
			startDate,
			active: newPoint.active
		})
		if (!ok) {
			newStatus = out.error || 'Could not create point.'
			return
		}
		showNew = false
		await invalidateAll()
	}

	async function updatePoint() {
		// Validate the measurement rows before sending anything.
		for (const row of editMeasurements) {
			if (!row.date || !row.tubeId) {
				editStatus = 'Each measurement needs a date and a tube.'
				return
			}
			if (!row.noMeasurement && String(row.value).trim() === '') {
				editStatus = 'Enter a value or tick “n/a” for every measurement.'
				return
			}
		}

		editStatus = 'Saving…'

		const point = await postJSON(`/api/admin/points/${editPoint.id}`, 'PATCH', {
			location: editPoint.location,
			description: editPoint.description,
			lat: editPoint.lat,
			lon: editPoint.lon
		})
		if (!point.ok) {
			editStatus = point.out.error || 'Could not save point.'
			return
		}

		// Reconcile measurements: delete removed, create new, update changed.
		const ops = []
		for (const id of deletedMeasurementIds) {
			ops.push(postJSON(`/api/admin/measurements/${id}`, 'DELETE'))
		}
		for (const row of editMeasurements) {
			const payload = { date: row.date, tube: row.tubeId, value: row.value, noMeasurement: row.noMeasurement }
			if (!row.id) {
				ops.push(postJSON('/api/admin/measurements', 'POST', { samplingPoint: editPoint.id, ...payload }))
			} else if (snapshot(row) !== row.original) {
				ops.push(postJSON(`/api/admin/measurements/${row.id}`, 'PATCH', payload))
			}
		}

		const results = await Promise.all(ops)
		const failed = results.find((r) => !r.ok)
		if (failed) {
			editStatus = failed.out?.error || 'Some measurements could not be saved.'
			await invalidateAll()
			return
		}

		showEdit = false
		await invalidateAll()
	}

	async function toggleActive(p) {
		const { ok } = await postJSON(`/api/admin/points/${p.id}/active`, 'PATCH', { active: !p.active })
		if (ok) await invalidateAll()
	}

	async function addUser() {
		const email = newUserEmail.trim()
		if (!email) return
		userStatus = 'Adding…'
		const { ok, out } = await postJSON('/api/admin/users', 'POST', { email, role: newUserRole })
		if (!ok) {
			userStatus = out.error || 'Could not add user.'
			return
		}
		newUserEmail = ''
		userStatus = ''
		await invalidateAll()
	}

	async function toggleUserActive(u) {
		const { ok } = await postJSON(`/api/admin/users/${u.id}`, 'PATCH', { active: !u.active })
		if (ok) await invalidateAll()
	}

	async function removeUser(id) {
		const res = await fetch(`/${data.citySlug}/api/admin/users/${id}`, { method: 'DELETE' })
		if (res.ok) await invalidateAll()
	}

	function onKeydown(e) {
		if (e.key === 'Escape') {
			showNew = false
			showEdit = false
		}
	}
</script>

<svelte:window on:keydown={onKeydown} />

<main class="admin">
	<section>
		<h2>Admin dashboard</h2>
		<p>Overview of measurement points, users and new measurements for <strong>{data.city}</strong>.</p>
	</section>

	<!-- Statistics -->
	<section>
		<h2>Statistics</h2>
		<div class="stats">
			<div class="stat"><span class="stat__label">Measurement points</span><span class="stat__value">{data.stats.points}</span></div>
			<div class="stat"><span class="stat__label">Total measurements</span><span class="stat__value">{data.stats.measurements}</span></div>
			<div class="stat"><span class="stat__label">Succeeded</span><span class="stat__value">{data.stats.succeeded}</span></div>
			<div class="stat"><span class="stat__label">No measurement</span><span class="stat__value">{data.stats.failed}</span></div>
			<div class="stat"><span class="stat__label">Lowest value</span><span class="stat__value">{data.stats.low ?? '–'}</span></div>
			<div class="stat"><span class="stat__label">Highest value</span><span class="stat__value">{data.stats.high ?? '–'}</span></div>
			<div class="stat"><span class="stat__label">Years covered</span><span class="stat__value">{data.stats.years}</span></div>
		</div>
	</section>

	<!-- New measurements -->
	<section>
		<h2>New measurements</h2>
		<p>Enter a value for each point, or tick “No measurement”. Blank rows are skipped.</p>

		<div class="period">
			<label>Year <input type="number" min="2000" max="2100" step="1" bind:value={year} /></label>
			<label>Month
				<select bind:value={month}>
					{#each Array(12) as _, i (i)}
						<option value={i + 1}>{monthName(i)}</option>
					{/each}
				</select>
			</label>
		</div>

		{#if activePoints.length === 0}
			<p class="muted">No active measurement points.</p>
		{:else}
			<div class="batch-list">
				{#each activePoints as p (p.id)}
					{#if rows[p.id]}
						<article class="batch-row">
							<h3>{p.location}</h3>
							<label>Tube
								<select bind:value={rows[p.id].tubeId}>
									<option value="" disabled>Select tube…</option>
									{#each activeTubes as t (t.id)}
										<option value={t.id}>{t.code}</option>
									{/each}
								</select>
							</label>
							<label>Value (µg/m³)
								<input type="number" step="any" bind:value={rows[p.id].value} disabled={rows[p.id].noMeasurement} placeholder="e.g. 23.4" />
							</label>
							<label class="checkbox">
								<input type="checkbox" bind:checked={rows[p.id].noMeasurement} />
								No measurement possible
							</label>
						</article>
					{/if}
				{/each}
			</div>
			<button class="btn btn--primary" onclick={saveBatch}>Save measurements</button>
			{#if batchStatus}<p class="status" aria-live="polite">{batchStatus}</p>{/if}
		{/if}
	</section>

	<!-- Measurement points -->
	<section>
		<div class="section-head">
			<h2>Measurement points</h2>
			<button class="btn" onclick={openNew}>New point</button>
		</div>
		<input class="search" type="search" placeholder="Search by location…" bind:value={search} />

		{#if filteredPoints.length === 0}
			<p class="muted">No measurement points found.</p>
		{:else}
			<div class="point-list">
				{#each filteredPoints as p (p.id)}
					<article class="point" class:point--inactive={!p.active}>
						<header>
							<h3>{p.location || 'Location unknown'}</h3>
							<span class="badge">{p.active ? 'active' : 'inactive'}</span>
						</header>
						<dl>
							<div><dt>Lat</dt><dd>{Number(p.latitude).toFixed(4)}</dd></div>
							<div><dt>Lon</dt><dd>{Number(p.longitude).toFixed(4)}</dd></div>
							<div><dt>City</dt><dd>{data.city}</dd></div>
							<div><dt>Measurements</dt><dd>{p.succeededCount}</dd></div>
							<div><dt>Period</dt><dd>{p.period}</dd></div>
						</dl>
						<div class="point__actions">
							<button class="btn" onclick={() => openEdit(p)}>Edit</button>
							<button class="btn" onclick={() => toggleActive(p)}>{p.active ? 'Deactivate' : 'Activate'}</button>
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Tubes -->
	<section>
		<h2>Tubes</h2>
		<p>Tubes belong to <strong>{data.city}</strong>. Add the tubes used when entering measurements here.</p>
		<form class="add-user" onsubmit={(e) => { e.preventDefault(); createTube() }}>
			<input type="text" placeholder="Tube code (e.g. B17)" bind:value={newTubeCode} required />
			<button class="btn" type="submit">Add tube</button>
		</form>
		{#if tubeStatus}<p class="status">{tubeStatus}</p>{/if}

		{#if data.tubes.length === 0}
			<p class="muted">No tubes yet.</p>
		{:else}
			<div class="tube-list">
				{#each data.tubes as t (t.id)}
					<article class="tube" class:tube--inactive={t.active === false}>
						<span class="tube__code">{t.code}</span>
						<button class="btn" onclick={() => toggleTubeActive(t)}>{t.active === false ? 'Activate' : 'Deactivate'}</button>
					</article>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Authorized users (admin only) -->
	{#if data.isAdmin}
	<section>
		<h2>Authorized users</h2>
		<form class="add-user" onsubmit={(e) => { e.preventDefault(); addUser() }}>
			<input type="email" placeholder="name@example.com" bind:value={newUserEmail} required />
			<select bind:value={newUserRole} aria-label="Role">
				<option value="researcher">Researcher</option>
				<option value="admin">Admin</option>
			</select>
			<button class="btn" type="submit">Add</button>
		</form>
		{#if userStatus}<p class="status">{userStatus}</p>{/if}

		<div class="user-list">
			{#each data.users as u (u.id)}
				<article class="user" class:user--inactive={u.active === false}>
					<div>
						<p class="user__email">{u.email}</p>
						<p class="muted">{u.role ?? '—'} · <span class="badge">{u.active === false ? 'inactive' : 'active'}</span></p>
					</div>
					{#if u.id === data.user?.id}
						<span class="muted">(you)</span>
					{:else}
						<div class="user__actions">
							<button class="btn" onclick={() => toggleUserActive(u)}>{u.active === false ? 'Activate' : 'Deactivate'}</button>
							<button class="btn btn--danger" onclick={() => removeUser(u.id)}>Remove</button>
						</div>
					{/if}
				</article>
			{/each}
		</div>
	</section>
	{/if}
</main>

<!-- New point modal -->
{#if showNew}
	<div class="modal">
		<button type="button" class="modal__backdrop" aria-label="Close dialog" onclick={() => (showNew = false)}></button>
		<div class="popup" role="dialog" aria-modal="true" aria-label="New point" tabindex="-1">
			<header class="popup__head">
				<h2>New point</h2>
				<button class="close" aria-label="Close" onclick={() => (showNew = false)}>×</button>
			</header>
			<form class="popup__body" onsubmit={(e) => { e.preventDefault(); createPoint() }}>
				<label class="field"><span>Location</span><input type="text" bind:value={newPoint.location} required /></label>
				<label class="field"><span>City</span><input type="text" value={data.city} readonly /></label>
				<div class="field-row">
					<label class="field"><span>Latitude</span><input type="number" step="any" bind:value={newPoint.lat} required /></label>
					<label class="field"><span>Longitude</span><input type="number" step="any" bind:value={newPoint.lon} required /></label>
				</div>
				<label class="field"><span>Description</span><textarea rows="3" bind:value={newPoint.description}></textarea></label>
				<div class="field-row">
					<label class="field"><span>Start month</span>
						<select bind:value={newPoint.month}>
							{#each Array(12) as _, i (i)}<option value={i}>{monthName(i)}</option>{/each}
						</select>
					</label>
					<label class="field"><span>Start year</span><input type="number" min="2000" max="2100" bind:value={newPoint.year} /></label>
				</div>
				<label class="checkbox"><input type="checkbox" bind:checked={newPoint.active} /> Active</label>
				{#if newStatus}<p class="status">{newStatus}</p>{/if}
				<div class="popup__actions">
					<button type="button" class="btn" onclick={() => (showNew = false)}>Cancel</button>
					<button type="submit" class="btn btn--primary">Create</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Edit point modal -->
{#if showEdit && editPoint}
	<div class="modal">
		<button type="button" class="modal__backdrop" aria-label="Close dialog" onclick={() => (showEdit = false)}></button>
		<div class="popup" role="dialog" aria-modal="true" aria-label="Edit point" tabindex="-1">
			<header class="popup__head">
				<h2>Edit point {editPoint.point_number}</h2>
				<button class="close" aria-label="Close" onclick={() => (showEdit = false)}>×</button>
			</header>
			<form class="popup__body" onsubmit={(e) => { e.preventDefault(); updatePoint() }}>
				<label class="field"><span>Location</span><input type="text" bind:value={editPoint.location} required /></label>
				<div class="field-row">
					<label class="field"><span>Latitude</span><input type="number" step="any" bind:value={editPoint.lat} required /></label>
					<label class="field"><span>Longitude</span><input type="number" step="any" bind:value={editPoint.lon} required /></label>
				</div>
				<label class="field"><span>Description</span><textarea rows="3" bind:value={editPoint.description}></textarea></label>

				<div class="measurements">
					<div class="measurements__head">
						<span>Measurements</span>
						<button type="button" class="btn" onclick={addMeasurement}>Add measurement</button>
					</div>
					{#if editMeasurements.length === 0}
						<p class="muted">No measurements yet.</p>
					{:else}
						{#each editMeasurements as row (row.key)}
							<div class="m-row">
								<input type="date" bind:value={row.date} aria-label="Date" />
								<select bind:value={row.tubeId} aria-label="Tube">
									<option value="" disabled>Tube…</option>
									{#each data.tubes as t (t.id)}<option value={t.id}>{t.code}</option>{/each}
								</select>
								<input type="number" step="any" bind:value={row.value} disabled={row.noMeasurement} placeholder="value" aria-label="Value" />
								<label class="m-row__nm"><input type="checkbox" bind:checked={row.noMeasurement} /> n/a</label>
								<button type="button" class="m-row__del" aria-label="Remove measurement" onclick={() => removeMeasurement(row)}>×</button>
							</div>
						{/each}
					{/if}
				</div>

				{#if editStatus}<p class="status">{editStatus}</p>{/if}
				<div class="popup__actions">
					<button type="button" class="btn" onclick={() => (showEdit = false)}>Cancel</button>
					<button type="submit" class="btn btn--primary">Save</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.admin {
		max-width: 760px;
		margin: 0 auto;
		padding: 1.5rem 1rem;
		color: #0b3d91;
	}

	.admin > section {
		padding: 1rem 1.25rem;
		margin: 1.25rem 0;
		border: 1px solid #d0d7e2;
		border-radius: 10px;
	}

	h2 {
		margin: 0 0 0.5rem;
		font-size: 1.1rem;
	}

	h3 {
		margin: 0;
		font-size: 1rem;
	}

	.muted {
		color: #6b7280;
		font-size: 0.9rem;
	}

	.section-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	/* Buttons */
	.btn {
		border: 1px solid #d0d7e2;
		border-radius: 8px;
		background: #f4f7fb;
		color: #0b3d91;
		padding: 0.45rem 0.8rem;
		font: inherit;
		cursor: pointer;
	}
	.btn:hover {
		background: #e8eef7;
	}
	.btn--primary {
		background: #0b3d91;
		color: #fff;
		border-color: #0b3d91;
	}
	.btn--primary:hover {
		background: #092e6e;
	}
	.btn--danger {
		color: #b00020;
		border-color: #e6b8bf;
		background: #fdf2f3;
	}

	/* Stats */
	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 0.75rem;
	}
	.stat {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding: 0.75rem;
		background: #fafafa;
		border: 1px solid #eef1f6;
		border-radius: 10px;
	}
	.stat__label {
		font-size: 0.75rem;
		color: #6b7280;
	}
	.stat__value {
		font-size: 1.4rem;
		font-weight: 700;
	}

	/* Batch */
	.period {
		display: flex;
		gap: 1rem;
		margin-bottom: 0.75rem;
	}
	.period label,
	.field span {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.85rem;
	}
	.batch-list {
		max-height: 60vh;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		margin-bottom: 0.75rem;
	}
	.batch-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem 1rem;
		padding: 0.6rem 0.75rem;
		border: 1px solid #d0d7e2;
		border-radius: 10px;
	}
	.batch-row h3 {
		grid-column: 1 / 3;
	}
	.batch-row label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.85rem;
	}
	.batch-row label.checkbox {
		grid-column: 1 / 3;
		flex-direction: row;
		align-items: center;
		gap: 0.5rem;
	}

	input,
	select,
	textarea {
		border: 1px solid #d0d7e2;
		border-radius: 8px;
		padding: 0.4rem 0.5rem;
		font: inherit;
	}
	textarea {
		resize: vertical;
	}

	.checkbox {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
	}
	.checkbox input {
		width: 1.1rem;
		height: 1.1rem;
	}

	/* Points */
	.search {
		width: 100%;
		margin: 0.75rem 0;
	}
	.point-list {
		max-height: 65vh;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.point {
		border: 1px solid #d0d7e2;
		border-radius: 10px;
		padding: 0.6rem 0.75rem;
	}
	.point--inactive {
		opacity: 0.6;
	}
	.point header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.badge {
		font-size: 0.7rem;
		text-transform: uppercase;
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
		background: #eef1f6;
		color: #6b7280;
	}
	.point dl {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
		gap: 0.4rem 0.75rem;
		margin: 0.5rem 0;
	}
	.point dl div {
		display: flex;
		flex-direction: column;
	}
	.point dt {
		font-size: 0.7rem;
		color: #6b7280;
	}
	.point dd {
		margin: 0;
		font-size: 0.9rem;
	}
	.point__actions {
		display: flex;
		gap: 0.5rem;
	}
	.point__actions .btn {
		flex: 1;
	}

	/* Users */
	.add-user {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}
	.add-user input {
		flex: 1;
	}
	.tube-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}
	.tube {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.6rem;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
	}
	.tube--inactive {
		opacity: 0.6;
	}
	.tube__code {
		font-weight: 600;
	}
	.user-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.user {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		border: 1px solid #d0d7e2;
		border-radius: 10px;
		padding: 0.5rem 0.75rem;
	}
	.user__email {
		margin: 0;
		font-weight: 600;
	}
	.user p {
		margin: 0;
	}

	.status {
		font-size: 0.85rem;
		color: #0b3d91;
		margin: 0.5rem 0 0;
	}

	/* Modal */
	.modal {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		z-index: 1000;
	}
	.modal__backdrop {
		position: absolute;
		inset: 0;
		border: none;
		padding: 0;
		background: transparent;
		cursor: default;
	}
	.popup {
		position: relative;
		z-index: 1;
		background: #fff;
		width: min(640px, 100%);
		max-height: 90vh;
		border-radius: 14px;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
	}
	.popup__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.9rem 1.1rem;
		border-bottom: 1px solid #d0d7e2;
	}
	.popup__head h2 {
		margin: 0;
	}
	.close {
		border: none;
		background: none;
		font-size: 1.4rem;
		line-height: 1;
		cursor: pointer;
		color: #6b7280;
	}
	.popup__body {
		padding: 1.1rem;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		font-size: 0.85rem;
	}
	.field-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}
	.popup__actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.add-user select {
		border: 1px solid #d0d7e2;
		border-radius: 8px;
		padding: 0.4rem 0.5rem;
		font: inherit;
	}

	.user__actions {
		display: flex;
		gap: 0.5rem;
	}
	.user--inactive {
		opacity: 0.6;
	}

	.measurements {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.measurements__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.85rem;
		font-weight: 600;
	}
	.m-row {
		display: grid;
		grid-template-columns: 1.3fr 1fr 1fr auto auto;
		gap: 0.4rem;
		align-items: center;
	}
	.m-row input,
	.m-row select {
		width: 100%;
		min-width: 0;
	}
	.m-row__nm {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.8rem;
		white-space: nowrap;
	}
	.m-row__del {
		border: none;
		background: none;
		font-size: 1.2rem;
		line-height: 1;
		cursor: pointer;
		color: #b00020;
	}

	@media (max-width: 600px) {
		.field-row {
			grid-template-columns: 1fr;
		}
		.batch-row {
			grid-template-columns: 1fr;
		}
		.m-row {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
