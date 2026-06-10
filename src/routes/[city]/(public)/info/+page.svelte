<script>
	/** @type {import('./$types').PageProps} */
	let { data } = $props()

	import tubes from '$lib/assets/tubes.png'
</script>

<main>
	<h2>NO₂</h2>
    <h3>Nitrogen Dioxide</h3>
    <br>
    <h3>What is NO₂?</h3>
    <p>
      Nitrogen dioxide (NO₂) is a harmful air pollutant mainly produced by road traffic, 
      generators, and industrial activities.
    </p>
    <h3>What do the colours mean?</h3>
    <p>
      The colours on the map indicate air quality levels. 
      They are based on measurements of nitrogen dioxide (NO₂), 
      a common air pollutant mainly caused by traffic and burning fuels.
    </p>
    <div>
      <div class="Kleur k1"> </div>
      <p class="div2">
        Health warning of emergency conditions. Everyone is more likely to be affected, and serious health effects can occur with continued exposure.
      </p>
      <div class="Kleur k2"> </div>
      <p class="div4">
        Health alert. The risk of health effects is increased for everyone, especially with longer exposure.
      </p>
      <div class="Kleur k3"> </div>
      <p class="div6">
        Some members of the general public may experience health effects.Sensitive groups are more likely to experience more serious health effects.
      </p>
      <div class="Kleur k4"> </div>
      <p class="div8">
        People who are sensitive to air pollution may experience health effects. The general public is less likely to be affected. 
      </p>
      <div class="Kleur k5"> </div>
      <p class="div10">
        Air quality is acceptable. However, there may be a small health risk for people who are unusually sensitive to air pollution.
      </p>
      <div class="Kleur k6"> </div>
      <p class="div12">
        Air quality is satisfactory and air pollution poses little or no risk to health.
      </p>
    </div>
    <p>
      The colour scale ranges from Good (green) to Hazardous (dark purple). 
      Darker colours indicate higher pollution levels and a greater potential impact on health.
    </p>
    <details class="accordion">
      <summary><h3>WHO guidelines</h3></summary>
      <p>
        The World Health Organization (WHO) provides international health-based air quality guidelines. 
        These values indicate levels above which air pollution may harm health. 
        They are not legally binding, but are widely used as a global health reference.
      </p>
    </details>
    <details class="accordion">
      <summary><h3>EU limit values</h3></summary>
      <p>
        The European Union (EU) sets legally binding air quality limits. 
        These limits are used to assess compliance with environmental regulations 
        and are generally less strict than WHO guidelines.
      </p>
    </details>
    <details class="accordion">
      <summary><h3>Measured data</h3></summary>
      <p>
        The values shown on this platform are measured NO₂ concentrations at specific locations. 
        They represent average concentrations over a defined period (for example, monthly averages).
      </p>
    </details>
    <br>
    <h3>Why does this matter for health?</h3>
    <p>
      Long-term exposure to elevated NO₂ levels can:
    </p>
      <ul>
        <li>
          Irritate the lungs
        </li>
        <li>
          Worsen asthma symptoms
        </li>
        <li>
          Increase the risk of respiratory and cardiovascular diseases
        </li>
      </ul>
    <p>
      Especially in busy urban areas.
    </p>
    <h3>How are these measurements taken?</h3>
    <p>
      NO₂ levels are measured using passive diffusion tubes placed at multiple locations across the city, 
      including roadside, residential, and industrial areas.
    </p>
    <img alt="Afbeelding van de meetbuisjes" src={tubes} height="450" width="375">
    <p>Site created by Jamie Buffing</p>
</main>

<style>
	main {
		height: 82%;
		align-items: center;
		padding: 20px;
		color: var(--DEF-Blue-Tekst);
		max-width: 750px;
		margin: auto;
	}

	main > p {
		margin-bottom: 10px;
	}

	main ul {
		margin-top: -10px;
		margin-left: 20px;
	}

	main > div {
		width: 100%;
		height: auto;
		display: grid;
		justify-self: center;
		grid-template-columns: auto 1fr;
		grid-template-rows: repeat(6, 1fr);
		grid-column-gap: 0px;
		grid-row-gap: 0px;
		margin-bottom: 10px;
	}

	main > div p {
		padding: 10px;
	}

	.Kleur {
		width: 50px;
	}

	.k1 {
		background-color: rgb(54, 0, 54);
	}
	.k2 {
		background-color: rgb(150, 0, 150);
	}
	.k3 {
		background-color: rgb(255, 0, 0);
	}
	.k4 {
		background-color: rgb(255, 165, 0);
	}
	.k5 {
		background-color: rgb(255, 255, 0);
	}
	.k6 {
		background-color: rgb(0, 255, 0);
	}

	main img {
		width: 50%;
		display: flex;
		justify-self: center;
		border: solid 1px var(--DEF-Border);
		border-radius: 15px;
		margin: 10px;
	}

	main img:last-of-type {
		width: 80%;
	}

	.accordion summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		cursor: pointer;
	}

	.accordion summary::marker {
		content: '';
	}

	.accordion summary::after {
		content: '';
		width: 8px;
		height: 8px;
		border-right: 2px solid currentColor;
		border-bottom: 2px solid currentColor;
		transform: rotate(45deg);
		transition: transform 0.2s ease;
		margin-left: 8px;
	}

	.accordion[open] summary::after {
		transform: rotate(-135deg);
	}
</style>
