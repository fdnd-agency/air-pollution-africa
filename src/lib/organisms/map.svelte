<script>
	import { onDestroy, onMount } from 'svelte';
	import 'leaflet/dist/leaflet.css';

	let {
		sampling_points,
		mapAddresses = [],
		activeMapAddresses = [],
		mapClass = '',
		initialZoom = 15,
		initialView = [6.69438, -1.61915]
	} = $props();

	let mapElement;
	let map;
	let leaflet;
	let L

	async function initializeMap() {
		// Dynamic import ensures this only runs in the browser, preventing Server-Side Rendering (SSR) crashes
		L = await import ('leaflet')
		leaflet = await import('leaflet');

		const mapStyle = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
		const attribution = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

		// Initialize map on the bound DOM element
		map = leaflet.map(mapElement).setView(initialView, initialZoom);

		
		leaflet.tileLayer(mapStyle, { attribution }).addTo(map);
		
		sampling_points.forEach(coord => {	
			var circle = L.circle([coord.latitude, coord.longitude], {
				color: 'red',
				fillColor: '#f03',
				fillOpacity: 0.5,
				radius: 500
			}).addTo(map);
		});

		// Failsafe: Forces Leaflet to recalculate the container size
		setTimeout(() => {
			map.invalidateSize();
		}, 100);
	}
	
	
	onMount(() => {
		initializeMap();
	});

	onDestroy(() => {
		// Clean up the map instance when navigating away to prevent memory leaks
		if (map) map.remove();
	});
</script>

<section class="map-organism">
	<h2 class="sr-only">Adressen op de kaart</h2>
	<div bind:this={mapElement} class="map-container {mapClass}" style="min-height: 500px; width: 100%; display: block;"></div>
</section>

<style>
	.map-organism {
		width: 100%;
		position: relative;
		z-index: 1;
	}

	.map-container {
		/* A strict height is absolutely required for Leaflet to work */
		height: 60vh;
		width: 100%;
		background-color: #e5e5e5; /* Light grey fallback while loading */
	}
</style>