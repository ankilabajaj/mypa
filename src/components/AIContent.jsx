export default function AIContent({ title, children, className = "" }) {
  return (
    <div className={`ai-content${className ? ` ${className}` : ""}`}>
      {title && <strong className="ai-content__title">{title}</strong>}
      <div className="ai-content__scroll">
        <pre className="ai-content__text">{children}</pre>
      </div>
    </div>
  );
}
