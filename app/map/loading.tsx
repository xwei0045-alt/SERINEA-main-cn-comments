export default function MapLoading() {
  return (
    <div className="tool">
      <div className="map-shell" aria-busy="true">
        <div className="map-stage" />
        <aside className="panel">
          <div className="panel-head">
            <h1>Looking up places</h1>
            <p className="window-fixed">
              <span>Places you can walk to in 15 minutes.</span>
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
