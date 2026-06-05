<script>
	/** @type {import('./$types').PageProps} */
	const { data } = $props()
</script>

<main class="admin">
	<section class="admin__intro">
		<h2>Admin dashboard</h2>
		<p>
			You are signed in as <strong>{data.user.email}</strong>. This area is restricted to authorized researchers.
		</p>
	</section>

	<section class="admin__overview">
		<h2>Overview</h2>
		{#await Promise.all([data.points, data.tubes, data.users])}
			<p>Loading…</p>
		{:then [points, tubes, users]}
			<div class="stats-grid">
				<div class="stat">
					<span class="stat__label">Measurement points</span>
					<span class="stat__value">{points?.length ?? 0}</span>
				</div>
				<div class="stat">
					<span class="stat__label">Tubes</span>
					<span class="stat__value">{tubes?.length ?? 0}</span>
				</div>
				<div class="stat">
					<span class="stat__label">Authorized users</span>
					<span class="stat__value">{users?.length ?? 0}</span>
				</div>
			</div>
		{:catch}
			<p class="admin__error">Could not load data.</p>
		{/await}
	</section>

	<p class="admin__note">The full management interface (measurement entry, point editing, user management) is still being migrated.</p>
</main>

<style>
	.admin {
		max-width: 960px;
		margin: 0 auto;
		padding: 2rem 1.5rem;
	}

	.admin section {
		margin-bottom: 2rem;
	}

	.admin h2 {
		margin-bottom: 0.5rem;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 1rem;
	}

	.stat {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 1rem 1.25rem;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		background: #fafafa;
	}

	.stat__label {
		font-size: 0.85rem;
		color: #555;
	}

	.stat__value {
		font-size: 1.75rem;
		font-weight: 700;
		color: #0b3d91;
	}

	.admin__error {
		color: #b00020;
	}

	.admin__note {
		font-size: 0.9rem;
		color: #666;
		font-style: italic;
	}
</style>
