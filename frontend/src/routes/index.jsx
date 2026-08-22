import { Outlet } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import ProfessionalRoute from './ProfessionalRoute';
import AdminRoute from './AdminRoute';

import Layout from '@/components/DashboardLayout';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import CheckoutSimulationPage from '@/pages/CheckoutSimulationPage';
import CheckoutSuccessPage from '@/pages/CheckoutSuccessPage';
import CheckoutPendingPage from '@/pages/CheckoutPendingPage';
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
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import VerificarEmailPage from '@/pages/VerificarEmailPage';
import ChangePasswordPage from '@/pages/ChangePasswordPage';

const router = [
  // PUBLIC routes — standalone, no DashboardLayout
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  { path: '/checkout-simulation', element: <CheckoutSimulationPage /> },
  { path: '/checkout-success', element: <CheckoutSuccessPage /> },
  { path: '/checkout-pending', element: <CheckoutPendingPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/verificar-email', element: <VerificarEmailPage /> },

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
          { path: '/dashboard/change-password', element: <ChangePasswordPage /> },
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
];

export default router;
