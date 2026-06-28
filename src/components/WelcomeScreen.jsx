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

  const handleGoogleLogin = () => {
    sessionStorage.setItem("mypa_show_welcome", "1");
    loginWithGoogle();
  };

  return (
    <div className="welcome">
      <div className="welcome__content">
        <h1 className="welcome__title">
          <span className="welcome__brand-name">MyPA</span>
          <span className="welcome__brand-separator"> – </span>
          <span className="welcome__brand-full">Your AI Personal Assistant</span>
        </h1>

        <div className="welcome__taglines">
          <p>Plan smarter.</p>
          <p>Stay ahead of deadlines.</p>
          <p>Never miss what matters.</p>
        </div>

        <button
          type="button"
          className="btn btn-primary welcome__google-btn"
          onClick={handleGoogleLogin}
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
