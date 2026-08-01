import { createBrowserRouter } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import ProfessionalRoute from './ProfessionalRoute';
import AdminRoute from './AdminRoute';

import Layout from '@/components/DashboardLayout';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import CheckoutSimulationPage from '@/pages/CheckoutSimulationPage';
import FaceAnalyzer from '@/components/evaluation/FaceAnalyzer';
import ResultsPage from '@/pages/ResultsPage';
import ReportsPage from '@/pages/ReportsPage';
import PhotoGuidePage from '@/pages/PhotoGuidePage';
import AdminQueuePage from '@/pages/AdminQueuePage';
import AdminEvaluatePage from '@/pages/AdminEvaluatePage';
import AdminDashboardPage from '@/pages/AdminDashboardPage';
import ProgressPage from '@/pages/ProgressPage';
import EvaluationDetailPage from '@/pages/EvaluationDetailPage';
import ProfilePage from '@/pages/ProfilePage';
import ProfessionalLoginPage from '@/pages/ProfessionalLoginPage';
import ProfessionalDashboardPage from '@/pages/ProfessionalDashboardPage';
import ProfessionalEvaluatePage from '@/pages/ProfessionalEvaluatePage';

const router = createBrowserRouter([
  // PUBLIC routes — standalone, no DashboardLayout
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  { path: '/checkout-simulation', element: <CheckoutSimulationPage /> },

  // DASHBOARD routes — wrapped in DashboardLayout + auth guards
  {
    element: <Layout />,
    children: [
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/dashboard', element: <FaceAnalyzer /> },
          { path: '/dashboard/results', element: <ResultsPage /> },
          { path: '/dashboard/reports', element: <ReportsPage /> },
          { path: '/dashboard/photo-guide', element: <PhotoGuidePage /> },
          { path: '/dashboard/progress', element: <ProgressPage /> },
          { path: '/dashboard/evaluation/:id', element: <EvaluationDetailPage /> },
          { path: '/dashboard/profile', element: <ProfilePage /> },
        ],
      },
      {
        element: <AdminRoute />,
        children: [
          { path: '/dashboard/admin', element: <AdminDashboardPage /> },
          { path: '/dashboard/admin/queue', element: <AdminQueuePage /> },
          { path: '/dashboard/admin/evaluate/:id', element: <AdminEvaluatePage /> },
        ],
      },
    ],
  },

  // PROFESSIONAL routes — standalone login, guarded dashboard
  { path: '/professional/login', element: <ProfessionalLoginPage /> },
  {
    element: <ProfessionalRoute />,
    children: [
      { path: '/professional/dashboard', element: <ProfessionalDashboardPage /> },
      { path: '/professional/dashboard/evaluate/:id', element: <ProfessionalEvaluatePage /> },
    ],
  },
]);

export default router;
