import { AuthProvider, useAuth } from "./context/AuthContext";
import WelcomeScreen from "./components/WelcomeScreen";
import Dashboard from "./Dashboard";
import "./App.css";

function AppContent() {
  const { user, loading } = useAuth();

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

  return <Dashboard />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
