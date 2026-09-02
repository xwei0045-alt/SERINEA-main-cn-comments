export default function MapLoading() {
  return (
    <div className="tool">
      <div className="map-shell" aria-busy="true">
        <div className="map-stage" />
        <aside className="panel">
          <div className="panel-head">
            <h1>Loading the map</h1>
            <p className="window-fixed">
              <b>15</b>
              <span>minutes round trip, public transport</span>
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
