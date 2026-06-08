<script>
	import { onDestroy, onMount } from 'svelte';
	import { tick } from 'svelte';

	let {
		mapAddresses,
		activeMapAddresses = [],
		mapClass = '',
		initialZoom = 15,
		maxZoom = 21,
		initialView = [6.695534, -1.621604]
	} = $props();
	let mapElement = $state(null);
	let map = $state(null);
	let leaflet = $state(null);

	async function initializeMap() {
		leaflet = await import('leaflet');

		const mapStyle = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
		const attribution =
			'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

		map = leaflet.map(mapElement).setView(initialView, initialZoom);

		leaflet
			.tileLayer(mapStyle, {
				attribution
			})
			.addTo(map);

		updateMarkers();
	}

	onMount(async () => {
		await initializeMap();
	});

	$effect(() => {
		updateMarkers();
	});

	onDestroy(() => {
		if (map) map.remove();
	});
</script>

<section class={[javascript.enabled && 'js-enabled', 'map']}>
	<h2 class="sr-only">Adressen op de kaart</h2>

	<div bind:this={mapElement} class={mapClass}></div>
</section>

<style>
	@import 'leaflet/dist/leaflet.css';
	section {
		display: none;
		width: 100%;
		position: relative;
		z-index: 1;
	}

	section.js-enabled {
		display: block;
	}

	div {
		height: 60vh;
	}
</style>