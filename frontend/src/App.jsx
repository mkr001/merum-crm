// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Tasks from './pages/Tasks';
import Compliance from './pages/Compliance';
import Invoices from './pages/Invoices';
import Documents from './pages/Documents';
import Reports from './pages/Reports';
import Partners from './pages/Partners';
import Contacts from './pages/Contacts';
import Tickets from './pages/Tickets';
import Revenue from './pages/Revenue';
import Workload from './pages/Workload';
import Contracts from './pages/Contracts';
import Team from './pages/Team';
import OnboardingList from './pages/OnboardingList';
import OnboardingForm from './pages/OnboardingForm';
import AgreementEditor from './pages/AgreementEditor';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard"      element={<Dashboard />} />
              <Route path="leads"          element={<Leads />} />
              <Route path="onboarding"     element={<OnboardingList />} />
              <Route path="onboarding/:id" element={<OnboardingForm />} />
              <Route path="onboarding/:id/agreement" element={<AgreementEditor />} />
              <Route path="clients"        element={<Clients />} />
              <Route path="clients/:id"    element={<ClientDetail />} />
              <Route path="tasks"          element={<Tasks />} />
              <Route path="compliance"     element={<Compliance />} />
              <Route path="invoices"       element={<Invoices />} />
              <Route path="documents"      element={<Documents />} />
              <Route path="reports"        element={<Reports />} />
              <Route path="partners"       element={<Partners />} />
              <Route path="contacts"       element={<Contacts />} />
              <Route path="tickets"        element={<Tickets />} />
              <Route path="revenue"        element={<Revenue />} />
              <Route path="workload"       element={<Workload />} />
              <Route path="contracts"      element={<Contracts />} />
              <Route path="team"           element={<Team />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

