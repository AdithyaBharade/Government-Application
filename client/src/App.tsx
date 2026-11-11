import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { PageLoader } from './components/ui';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ApplicationPage } from './pages/ApplicationPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { NewApplicationPage } from './pages/NewApplicationPage';
import { InsightsPage } from './pages/InsightsPage';
import { CertificatePage } from './pages/CertificatePage';

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={user ? <Layout /> : <Navigate to="/login" replace />}>
        <Route index element={<DashboardPage />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="applications/new" element={user?.role === 'OPERATOR' ? <NewApplicationPage /> : <Navigate to="/" replace />} />
        <Route path="applications/:id" element={<ApplicationPage />} />
        <Route path="applications/:id/certificate" element={<CertificatePage />} />
        <Route path="insights" element={<InsightsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
