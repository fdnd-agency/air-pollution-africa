<script>
	/** @type {import('./$types').PageProps} */
	let { data } = $props()
</script>

<main>
  <section>
    <h2>Data & API</h2>
    <p>
      This page provides access to the Kumasi measurement dataset. 
      Download the full dataset or use the public API for research, analysis, and integration.
    </p>
    <article>
      <a href="/">Back to map</a>
      <a href="/api-key">Request API</a>
    </article>
  </section>
  <section>
    <h2>Donwload</h2>
    <p>
      Downloads always return the full dataset and do not accept filters.
    </p>
    <div class="downloadRow">
      <a href="/downloads/data.json">Download JSON</a>
      <a href="/downloads/data.csv">Download CSV</a>
      <a href="/downloads/data.xlsx">Download XLSX</a>
    </div>
  </section>
  <section>
    <h2>API Documentation</h2>
    <h3>Base endpoint</h3>
    <p class="copyCode">
      GET <span class="endpoint" data-path="/api/public/"></span>
    </p>
<!--  -->
    <h3>Authentication</h3>
    <p>
      All API requests require an API key.        
    </p>
    <p>Code line: <span class="codeBlock">?apikey=YOUR_KEY</span></p>
    <p class="copyCode">
      GET <span class="endpoint" data-path="/api/public/data?apiKey=YOUR_KEY"></span>
    </p>
<!--  -->
    <h3>Pagination</h3>
    <p>
      Results are paginated to limit response size.        
    </p>
    <p>Code line: <span class="codeBlock">&page=2&limit=5</span></p>
    <p><span class="codeBlock">&page=X</span> Page number (default: 1)</p>
    <p><span class="codeBlock">&limit=X</span> Points per page (default: 50 max: 200)</p>
    <p>- For page 2 with a max of 5 points per page</p>
    <p class="copyCode">
      GET <span class="endpoint" data-path="/api/public/data?apiKey=YOUR_KEY&page=2&limit=5"></span>
    </p>
<!--  -->
    <h3>Filtering by activity status</h3>
    <p>
      Filter points by whether they are active.     
    </p>
    <p>Code line: <span class="codeBlock">&active=true</span></p>
    <p><span class="codeBlock">&active=true</span> Only active points</p>
    <p><span class="codeBlock">&active=false</span> Only inactive points</p>
    <p><span class="codeBlock">&active=all</span> All points (default)</p>
    <p>- For only the active points</p>
    <p class="copyCode">
      GET <span class="endpoint" data-path="/api/public/data?apiKey=YOUR_KEY&active=true"></span>
    </p>
<!--  -->
    <h3>Filtering by point number</h3>
    <p>
      Retrieve one or more specific measurement points.
    </p>
    <p>Code line: <span class="codeBlock">&point=14</span></p>
    <p>Code line: <span class="codeBlock">&pointMin=5&pointMax=10</span></p>
    <p><span class="codeBlock">&point=X</span> For an exact point number.</p>
    <p><span class="codeBlock">&pointMin=X</span> Minimum point number.</p>
    <p><span class="codeBlock">&pointMax=X</span> Maximum point number.</p>
    <p>- For point 14</p>
    <p class="copyCode">
      GET <span class="endpoint" data-path="/api/public/data?apiKey=YOUR_KEY&point=14"></span>
    </p>
    <p>- For the points 5, 6, 7, 8, 9 and 10</p>
    <p class="copyCode">
      GET <span class="endpoint" data-path="/api/public/data?apiKey=YOUR_KEY&pointMin=5&pointMax=10"></span>
    </p>
<!--  -->
    <h3>Including measurements</h3>
    <p>
      By default, measurement data is not included to save data traffic. 
    </p>
    <p>Code line: <span class="codeBlock">&includeMeasurements=true</span></p>
    <p>- To include measurements</p>
    <p class="copyCode">
      GET <span class="endpoint" data-path="/data?apiKey=YOUR_KEY&includeMeasurements=true"></span>
    </p>
<!--  -->
    <h3>Filtering measurements by month</h3>
    <p>
      Filter measurements using a month range (YYYY-MM).    
    </p>
    <p>Code line: <span class="codeBlock"></span>&mFrom=2025-9&mTo=2025-11</p>
    <p><span class="codeBlock">&mFrom=2025-X</span> </p>
    <p><span class="codeBlock">mTo=2025-X</span> </p>
    <p>- For the measurements from 9-2025 till 11-2025</p>
    <p class="copyCode">
      GET <span class="endpoint" data-path="/api/public/data?apiKey=YOUR_KEY&includeMeasurements=true&mFrom=2025-9&mTo=2025-11"></span>
    </p>
    <p>- For the measurements from 11-2025</p>
    <p class="copyCode">
      GET <span class="endpoint" data-path="/api/public/data?apiKey=YOUR_KEY&includeMeasurements=true&mFrom=2025-11&mTo=2025-11"></span>
    </p>
<!--  -->
    <h3>Latest measurement only</h3>
    <p>
      Return only the most recent measurement per point.
    </p>
    <p>Code line: <span class="codeBlock">&latestOnly=true</span></p>
    <p>- To only return the latest measurementsa.</p>
    <p class="copyCode">
      GET <span class="endpoint" data-path="/api/public/data?apiKey=YOUR_KEY&includeMeasurements=true&latestOnly=true"></span>
    </p>
<!--  -->
    <h3>Limit measurements per point</h3>
    <p>
      Restrict the number of measurements returned per point.<br>
      It always picks the latest X measurements.
    </p>
    <p>Code line: <span class="codeBlock">&mLimit=6</span></p>
    <p><span class="codeBlock">&mLimit=X</span> </p>
    <p>- To only get 6 measurements per point</p>
    <p class="copyCode">
      GET <span class="endpoint" data-path="/api/public/data?apiKey=YOUR_KEY&includeMeasurements=true&mLimit=6"></span>
    </p>
  </section>
  <section>
    <details class="accordion">
      <summary><h2>Disclaimer</h2></summary>
      <p>
        use this data at your own risk. We aim for quality, 
        but we cannot guarantee completeness, accuracy, or fitness for a particular purpose. 
        This is not an official monitoring network and should not be used as legal or medical evidence.
      </p>
    </details>
  </section>
</main>

<style>
	main {
  height: 82%;
  align-items: center;
  padding: 10px;
  color: var(--DEF-Blue-Tekst);
  max-width: 750px;
  margin: auto;
}
p {
  margin-bottom: 10px;
}
main section {
  padding: 10px;
  margin: 10px 0px;
  border: solid 1px var(--DEF-Border);
  border-radius: 10px;
}
main section article {
  display: flex;
  gap: 12px;
}
main section article a {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 18px;
  border: solid 1px var(--DEF-Border);
  border-radius: 999px;
  color: var(--DEF-Blue-Tekst);
  text-decoration: none;
  font-weight: bold;
}
.downloadRow a {
  display: block;
  margin-bottom: 10px;
  width: 100%;
  padding: 10px 18px;
  border: solid 1px var(--DEF-Border);
  border-radius: 10px;
  color: var(--DEF-Blue-Tekst);
  text-decoration: none;
  font-weight: bold;
}
.downloadRow :first-child {
  background-color: var(--DEF-Blue-Styling);
  color: var(--DEF-White);
}
main section article :last-child {
  background-color: var(--DEF-Blue-Styling);
  color: var(--DEF-White);
}

.codeBlock {
  background-color: var(--DEF-Background);
  padding: 3px 5px;
  border-radius: 10px;
  border: solid 1px grey;
  color: var(--DEF-Blue-Tekst);
}

.copyCode {
  background-color: var(--DEF-Code-Copy);
  padding: 6px 10px;
  border-radius: 10px;
  border: solid 1px var(--DEF-Border);
  color: var(--DEF-White);
  line-break: anywhere;
}

.accordion summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}

.accordion summary::marker {
  content: "";
}

.accordion summary::after {
  content: "";
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