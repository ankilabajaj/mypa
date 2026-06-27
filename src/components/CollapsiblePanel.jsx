export default function CollapsiblePanel({ open, children, className = "" }) {
  return (
    <div
      className={`collapsible-panel${open ? " collapsible-panel--open" : ""}${className ? ` ${className}` : ""}`}
      aria-hidden={!open}
    >
      <div className="collapsible-panel__inner">{children}</div>
    </div>
  );
}
