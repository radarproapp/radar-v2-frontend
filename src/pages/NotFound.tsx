import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="r-page">
      <div className="r-empty">
        <h3>Not built yet</h3>
        <p>This part of Radar hasn't been ported to the new frontend yet.</p>
        <Link to="/" className="btn btn--primary btn--sm" style={{ marginTop: 16 }}>
          Back to Today
        </Link>
      </div>
    </div>
  );
}
