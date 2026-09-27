export default function TableSkeleton({ rows = 5 }) {
  return (
    <div className="table-skeleton" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} className="skeleton" style={{ height: 44 }} />
      ))}
    </div>
  );
}
