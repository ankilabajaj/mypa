import { useAuth } from "../context/AuthContext";

const FEATURES = [
  "🤖 AI Daily Planner",
  "🚨 AI Rescue Mode",
  "✨ Smart Task Breakdown",
  "📅 Tasks & Events",
  "☁️ Cloud Sync",
];

export default function WelcomeScreen() {
  const { loginWithGoogle } = useAuth();

  return (
    <div className="welcome">
      <div className="welcome__content">
        <h1 className="welcome__title">MyPA</h1>
        <p className="welcome__subtitle">Your AI Productivity Assistant</p>

        <div className="welcome__taglines">
          <p>Plan smarter.</p>
          <p>Stay ahead of deadlines.</p>
          <p>Never miss what matters.</p>
        </div>

        <button
          type="button"
          className="btn btn-primary welcome__google-btn"
          onClick={loginWithGoogle}
        >
          Continue with Google
        </button>

        <ul className="welcome__features">
          {FEATURES.map((feature) => (
            <li key={feature} className="welcome__feature">
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
