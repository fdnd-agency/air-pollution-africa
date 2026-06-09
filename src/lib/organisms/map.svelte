<script>
	import { onDestroy, onMount } from 'svelte'
	import 'leaflet/dist/leaflet.css'

	let {
		// grab sampling_points, measurements and tubes from the API
		sampling_points,
		measurements,
		tubes,
		initialZoom = 14,
		initialView = [6.69438, -1.61915]
	} = $props();

	let mapElement;
	let map;
	let L

	async function initializeMap() {
		L = await import ('leaflet')

		const mapStyle = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
		const attribution = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

		// Initialize map on the bound DOM element
		map = L.map(mapElement).setView(initialView, initialZoom)
		L.tileLayer(mapStyle, { attribution }).addTo(map)
		
		// 
		sampling_points.forEach(coord => {  
			// searches if the id in measurements is the same as is in sampling_points. We use Coord as shorthand for Coordinates
			const matchedMeasurement = measurements.find(m => m.sampling_point === coord.id)
			// We make a new variable named 'value' because out of measurements we only need the value. If there is no data to be collected we show a message
			const value = matchedMeasurement ? matchedMeasurement.value : 'No measurement collected yet'
            // content that is inside the popup
			const popupHTML = `
				<div style="min-width: 100px;">
                    <h3>${coord.location}</h3> 
                    <p>${coord.description}</p>
                    <p><strong>Measurement:</strong> ${value}</p> 
                </div>
            `
			// create the marker, chain .bindPopup(), then add to map
			// Now each marker will be placed according to their longitude and latitude
            L.marker([coord.latitude, coord.longitude])
			// bind the content that we made in variable popupHTML
             .bindPopup(popupHTML)
			//  add the data to the map
             .addTo(map)
        })
		
		setTimeout(() => {
			map.invalidateSize();
		}, 100)
	}
	
	
	onMount(() => {
		// once the page has been build on the browser initialize the map.
		initializeMap()
	});

	onDestroy(() => {
		// clean up the map instance when navigating away to prevent memory leaks
		if (map) map.remove()
	})
</script>

<section class="map-organism">
	<h2 class="sr-only">Meetpunt</h2>
	<div bind:this={mapElement} class="map-container" style="min-height: 500px; width: 100%; display: block;"></div>
</section>

<style>
	.map-organism {
		width: 100%;
		position: relative;
		z-index: 1;
	}

	.map-container {
		height: 60vh;
		width: 100%;
		background-color: #e5e5e5; 
	}
</style>