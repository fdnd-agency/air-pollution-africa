<script>
	import Logo from '$lib/assets/logo.png'

	/** @type {import('./$types').PageProps} */
	const { data } = $props()
</script>

<main class="picker">
	<header class="picker__head">
		<img src={Logo} alt="" height="64" width="64" />
		<h1>Air pollution in Africa</h1>
		<p>Choose a city to view its air quality measurements.</p>
	</header>

	{#if data.cities.length}
		<ul class="picker__list">
			{#each data.cities as city (city.id)}
				<li>
					<a class="picker__city" href="/{city.slug}">
						<span class="picker__name">{city.name}</span>
						<span class="picker__arrow" aria-hidden="true">→</span>
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="picker__empty">No cities are available yet.</p>
	{/if}
</main>

<style>
	.picker {
		max-width: 640px;
		margin: 0 auto;
		padding: 48px 16px;
		text-align: center;
	}

	.picker__head h1 {
		margin: 12px 0 4px;
	}

	.picker__head p {
		color: #475569;
		margin-bottom: 28px;
	}

	.picker__list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 12px;
	}

	.picker__city {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border: 1px solid #dbe5ef;
		border-radius: 12px;
		text-decoration: none;
		color: #0b3d91;
		font-weight: 600;
		transition: background-color 0.15s ease, border-color 0.15s ease;
	}

	.picker__city:hover {
		background: #f4f8ff;
		border-color: #0b3d91;
	}

	.picker__arrow {
		font-size: 1.25rem;
	}

	.picker__empty {
		color: #475569;
	}
</style>
