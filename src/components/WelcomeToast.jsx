export default function WelcomeToast({ visible }) {
  if (!visible) return null;

  return (
    <div className="welcome-toast" role="status" aria-live="polite">
      Welcome back! 👋
    </div>
  );
}
