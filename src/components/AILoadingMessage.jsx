export default function AILoadingMessage({ message }) {
  return (
    <p className="ai-loading" role="status" aria-live="polite">
      <span className="ai-loading__text">{message}</span>
    </p>
  );
}
