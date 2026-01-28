import React from 'react';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import { SavedEventsProvider } from './context/SavedEventsContext';

// Components
import ScrollToTop from './components/ScrollToTop';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';

// Public Pages
import LandingPage from './pages/LandingPage';
import EventsPage from './pages/EventsPage';
import EventDetails from "./pages/events/EventDetails";
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage'
import ResetPasswordPage from './pages/ResetPasswordPage';
import GenericCategoryPage from './pages/categories/GenericCategoryPage';
import CategoryBrowsePage from './pages/categories/CategoryBrowsePage';
import CampusEventsPage from './pages/categories/CampusEventsPage';
import UniversityEventsPage from "./pages/categories/UniversityEventsPage";
import WebinarEventsPage from './pages/categories/WebinarEventsPage';
import ContactUs from './pages/ContactUs';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import CookiePolicy from './pages/CookiePolicy';
import FAQ from './pages/FAQ';
import AboutUs from './pages/AboutUs';

// User Dashboard Pages
import UserDashboard from './pages/dashboard/UserDashboard';
import SavedEvents from './pages/dashboard/SavedEvents';
import Settings from './pages/dashboard/Settings';
import GenericCategory from './pages/dashboard/GenericCategory';
import WebinarEvents from './pages/dashboard/WebinarEvents';
import CategoryBrowse from './pages/dashboard/CategoryBrowse';
import CampusEvents from './pages/dashboard/CampusEvents';

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminEvents from './pages/admin/AdminEvents';
import AdminEventForm from './pages/admin/AdminEventForm';
import AdminUsers from './pages/admin/AdminUsers';
import AdminCategories from './pages/admin/AdminCategories';
import AdminUniversities from './pages/admin/Adminuniversities';
import AdminSavedEventsAnalytics from './pages/admin/AdminSavedEventsAnalytics'; // NEW


function App() {
  return (
    <SavedEventsProvider>
      <Router>
        <ScrollToTop />
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ResetPasswordPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/category/:slug" element={<GenericCategoryPage />} />
            <Route path="/categories" element={<CategoryBrowsePage />} />
            <Route path="/campus-events" element={<CampusEventsPage />} />
            <Route path="/webinar-events" element={<WebinarEventsPage />} />
            <Route path="/campus" element={<UniversityEventsPage />} />
            <Route path="/event/:id" element={<EventDetails />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/cookies" element={<CookiePolicy />} />
            <Route path="/faqs" element={<FAQ />} />
            <Route path="/about" element={<AboutUs />} />
            
            {/* User Dashboard Routes (for logged-in users) */}
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/dashboard/categories" element={<CategoryBrowse />} />
            <Route path="/dashboard/uni-events" element={<CampusEvents />} />
            <Route path="/dashboard/web-events" element={<WebinarEvents />} />
            <Route path="/dashboard/category/:slug" element={<GenericCategory />} />
            <Route path="/saved-events" element={<SavedEvents />} />
            <Route path="/settings" element={<Settings />} />

            {/* Admin Routes (Protected) */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route 
              path="/admin" 
              element={
                <ProtectedAdminRoute>
                  <AdminDashboard />
                </ProtectedAdminRoute>
              } 
            />
            <Route 
              path="/admin/events" 
              element={
                <ProtectedAdminRoute>
                  <AdminEvents />
                </ProtectedAdminRoute>
              } 
            />
            <Route 
              path="/admin/events/create" 
              element={
                <ProtectedAdminRoute>
                  <AdminEventForm />
                </ProtectedAdminRoute>
              } 
            />
            <Route 
              path="/admin/events/edit/:id" 
              element={
                <ProtectedAdminRoute>
                  <AdminEventForm />
                </ProtectedAdminRoute>
              } 
            />
            <Route 
              path="/admin/users" 
              element={
                <ProtectedAdminRoute>
                  <AdminUsers />
                </ProtectedAdminRoute>
              } 
            />
            <Route 
              path="/admin/categories" 
              element={
                <ProtectedAdminRoute>
                  <AdminCategories />
                </ProtectedAdminRoute>
              } 
            />
            <Route 
              path="/admin/universities" 
              element={
                <ProtectedAdminRoute>
                  <AdminUniversities />
                </ProtectedAdminRoute>
              } 
            />
            {/* NEW: Saved Events Analytics Route */}
            <Route 
              path="/admin/saved-events-analytics" 
              element={
                <ProtectedAdminRoute>
                  <AdminSavedEventsAnalytics />
                </ProtectedAdminRoute>
              } 
            />
          </Routes>
        </div>
      </Router>
    </SavedEventsProvider>
  );
}

export default App;