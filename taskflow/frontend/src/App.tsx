import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { LabPage } from './pages/LabPage';
import { Spinner } from './components/ui/Feedback';

function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const { user, initializing } = useAuth();
  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Loading session" />
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/lab"
        element={
          <ProtectedRoute>
            <LabPage />
          </ProtectedRoute>
        }
      />
      <Route path="/dashboard" element={<Navigate to="/lab" replace />} />
      <Route path="*" element={<Navigate to="/lab" replace />} />
    </Routes>
  );
}
