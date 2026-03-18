import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';

import LoginPage          from './pages/auth/LoginPage';
import RegisterPage       from './pages/auth/RegisterPage';
import TechnicianDashboard from './pages/technician/TechnicianDashboard';
import SupervisorDashboard from './pages/supervisor/SupervisorDashboard';
import ProtectedRoute     from './components/auth/ProtectedRoute';
import PaymentPage from './pages/payment/PaymentPage';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login"    element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route path="/technician/*" element={
              <ProtectedRoute requiredRole="technician">
                <TechnicianDashboard />
              </ProtectedRoute>
            }/>

            <Route path="/supervisor/*" element={
              <ProtectedRoute requiredRole="supervisor">
                <SupervisorDashboard />
              </ProtectedRoute>
            }/>

            <Route path="/pay/:token" element={<PaymentPage />} />

            <Route path="/" element={<Navigate to="/login" replace />} />

            <Route path="*" element={
              <div className="min-h-screen flex items-center justify-center bg-gray-50"
                style={{fontFamily:"'DM Sans',system-ui,sans-serif"}}>
                <div className="text-center">
                  <p className="text-6xl font-bold text-slate-900 mb-3">404</p>
                  <p className="text-gray-400 mb-6">Page not found</p>
                  <a href="/login" className="text-amber-600 font-semibold hover:text-amber-700 underline">
                    Back to login
                  </a>
                </div>
              </div>
            }/>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
