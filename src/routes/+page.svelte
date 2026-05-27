<main class="home-layout">
    <section id="controls">
        <span style="display: flex;color: black; justify-content: space-between;">
        <h2>Kumasi Air Quality</h2>
        <a href="/info" class="info-btn" aria-label="Info this project">i</a>
        </span>
        <div class="view-toggle" data-view-toggle>
        <button id="MapButton" class="viewSwitch active" type="button">Map</button>
        <button id="TableButton" class="viewSwitch" type="button">Table</button>
        </div>
    </section>
</main>

<style>
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
  transition: background-color 0.5s ease, color 0.5s ease;
}

.active {
  background: var(--DEF-White);
  color: var(--DEF-Blue-Styling);
  box-shadow: var(--DEF-shadow-Small);
  transition: background-color 0.5s ease, color 0.5s ease;
}

.home-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 10px;
}

.page-home #map {
  flex: 1;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}

#controls {
  flex-shrink: 0;
}

#controls span h2 {
  color: var(--DEF-Blue-Tekst);
}

#view {
  flex: 1;
  display: flex;
  overflow: hidden;
}

#mapView {
  flex: 1;
  display: flex;
  min-height: 320px;
}

#tableView {
  display: none;
  width: 100%;
}

#map {
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 320px;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}
</style>