import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';

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
import EmailConfirmadoPage from '@/pages/EmailConfirmadoPage';
import ChangePasswordPage from '@/pages/ChangePasswordPage';

import ProtectedRoute from '@/routes/ProtectedRoute';
import ProfessionalRoute from '@/routes/ProfessionalRoute';
import AdminRoute from '@/routes/AdminRoute';

export default function App() {
  return (
    <>
      <Routes>
        {/* PUBLIC routes — standalone, no DashboardLayout */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/checkout-simulation" element={<CheckoutSimulationPage />} />
        <Route path="/checkout-success" element={<CheckoutSuccessPage />} />
        <Route path="/checkout-pending" element={<CheckoutPendingPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verificar-email" element={<VerificarEmailPage />} />
        <Route path="/email-confirmado" element={<EmailConfirmadoPage />} />

        {/* DASHBOARD routes — wrapped in DashboardLayout + auth guards */}
        <Route element={<Layout />}>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<FaceAnalyzer />} />
            <Route path="/dashboard/results" element={<ResultsPage />} />
            <Route path="/dashboard/reports" element={<ReportsPage />} />
            <Route path="/dashboard/photo-guide" element={<PhotoGuidePage />} />
            <Route path="/dashboard/progress" element={<ProgressPage />} />
            <Route path="/dashboard/evaluation/:id" element={<EvaluationDetailPage />} />
            <Route path="/dashboard/profile" element={<ProfilePage />} />
            <Route path="/dashboard/change-password" element={<ChangePasswordPage />} />
          </Route>

          <Route element={<AdminRoute />}>
            <Route path="/dashboard/admin" element={<AdminDashboardPage />} />
            <Route path="/dashboard/admin/queue" element={<AdminQueuePage />} />
            <Route path="/dashboard/admin/evaluate/:id" element={<AdminEvaluatePage />} />
          </Route>
        </Route>

        {/* PROFESSIONAL routes — standalone login, guarded dashboard */}
        <Route path="/professional/login" element={<ProfessionalLoginPage />} />
        <Route element={<ProfessionalRoute />}>
          <Route path="/professional/dashboard" element={<ProfessionalDashboardPage />} />
          <Route path="/professional/dashboard/evaluate/:id" element={<ProfessionalEvaluatePage />} />
        </Route>
      </Routes>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#141414',
            border: '1px solid rgba(211, 171, 57, 0.3)',
            color: '#fff',
            fontSize: '13px',
          },
        }}
      />
    </>
  );
}
