import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import WelcomeScreen from "./components/WelcomeScreen";
import WelcomeToast from "./components/WelcomeToast";
import Dashboard from "./Dashboard";
import "./App.css";

function AppContent() {
  const { user, loading } = useAuth();
  const [showWelcomeToast, setShowWelcomeToast] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    if (sessionStorage.getItem("mypa_show_welcome") !== "1") return;

    sessionStorage.removeItem("mypa_show_welcome");
    setShowWelcomeToast(true);

    const timer = setTimeout(() => {
      setShowWelcomeToast(false);
    }, 3500);

    return () => clearTimeout(timer);
  }, [loading, user]);

  if (loading) {
    return (
      <div className="auth-loading">
        <p className="auth-loading__text">Loading MyPA...</p>
      </div>
    );
  }

  if (!user) {
    return <WelcomeScreen />;
  }

  return (
    <>
      <WelcomeToast visible={showWelcomeToast} />
      <Dashboard />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
