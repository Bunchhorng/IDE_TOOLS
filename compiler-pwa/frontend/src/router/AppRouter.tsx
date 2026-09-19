import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TopNav } from '../components/TopNav';
import { OfflineBanner } from '../components/OfflineBanner';
import { AppStatusBar } from '../components/AppStatusBar';
import { LoadingScreen } from '../components/LoadingScreen';
import Home from '../pages/Home/Home';
import Login from '../pages/Login/Login';
import Register from '../pages/Register/Register';
import Dashboard from '../pages/Dashboard/Dashboard';
import EditorPage from '../pages/Editor/EditorPage';
import History from '../pages/History/History';
import Settings from '../pages/Settings/Settings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isGuest, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (isAuthenticated && !isGuest) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <div className="flex min-h-dvh flex-col">
              <TopNav />
              <Home />
              <AppStatusBar />
            </div>
          }
        />
        <Route
          path="/login"
          element={
            <GuestRoute>
              <Login />
            </GuestRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestRoute>
              <Register />
            </GuestRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div className="flex min-h-dvh flex-col">
                <TopNav />
                <OfflineBanner />
                <Dashboard />
                <AppStatusBar />
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <div className="flex min-h-dvh flex-col">
                <TopNav />
                <OfflineBanner />
                <History />
                <AppStatusBar />
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <div className="flex min-h-dvh flex-col">
                <TopNav />
                <OfflineBanner />
                <Settings />
                <AppStatusBar />
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/editor/:projectSlug"
          element={
            <ProtectedRoute>
              <div className="flex h-dvh flex-col">
                <OfflineBanner />
                <EditorPage />
              </div>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}