import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { PageLoader } from './components/ui';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ApplicationPage } from './pages/ApplicationPage';

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={user ? <Layout /> : <Navigate to="/login" replace />}>
        <Route index element={<DashboardPage />} />
        <Route path="applications/:id" element={<ApplicationPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
