// Placeholder for pages not built yet
export default function PagePlaceholder({ title, children }) {
  return (
    <section className="placeholder">
      <h2>{title}</h2>
      <p>{children}</p>
    </section>
  );
}
