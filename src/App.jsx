// ✅ IMPORTS - ONLY AT THE TOP (Lines 1-50)
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SavedEventsProvider } from './context/SavedEventsContext';
import ToastContainer from './components/ToastContainer';

// Layouts
import UserLayout from './layouts/UserLayout';

// Components
import ScrollToTop from './components/ScrollToTop';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import AdminRoute from './components/AdminRoute';

// Public Pages
import LandingPage from './pages/LandingPage';
import EventsPage from './pages/EventsPage';
import EventDetails from "./pages/events/EventDetails";
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import GenericCategoryPage from './pages/categories/GenericCategoryPage';
import CategoryBrowsePage from './pages/categories/CategoryBrowsePage';
import CampusEventsPage from './pages/categories/CampusEventsPage';
import WebinarEventsPage from './pages/categories/WebinarEventsPage';
import ContactUs from './pages/ContactUs';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import CityEventsPage from './pages/events/CityEventsPage';
import CookiePolicy from './pages/CookiePolicy';
import FAQ from './pages/FAQ';
import AboutUs from './pages/AboutUs';
import HowItWorks from './pages/HowItWorks';
import SubmitEventPage from './pages/SubmitEventPage';
import NotificationsPage from './pages/notifications/NotificationsPage';

// User Dashboard Pages
import UserDashboard from './pages/dashboard/UserDashboard';
import SavedEvents from './pages/dashboard/SavedEvents';
import Settings from './pages/dashboard/Settings';
import GenericCategory from './pages/dashboard/GenericCategory';
import WebinarEvents from './pages/dashboard/WebinarEvents';
import CategoryBrowse from './pages/dashboard/CategoryBrowse';
import CampusEvents from './pages/dashboard/CampusEvents';

// Event Management
import ManageEvent from './pages/EventManage/ManageEvent';

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminEvents from './pages/admin/AdminEvents';
import AdminEventForm from './pages/admin/AdminEventForm';
import AdminUsers from './pages/admin/AdminUsers';
import AdminCategories from './pages/admin/AdminCategories';
import AdminUniversities from './pages/admin/Adminuniversities';
import AdminTickets from './pages/admin/AdminTickets';
import AdminSavedEventsAnalytics from './pages/admin/AdminSavedEventsAnalytics';
import EventSubmissionsPage from './pages/admin/EventSubmissionsPage';
import AdminNotifications from './pages/admin/AdminNotifications';

// ✅ FUNCTION STARTS HERE (NOT IMPORTS!)
function App() {
  return (
    <AuthProvider>
      <SavedEventsProvider>
        <Router>
          <ScrollToTop />
          <div className="App">
            <ToastContainer />
            <Routes>
              {/* PUBLIC ROUTES */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ResetPasswordPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/category/:slug" element={<GenericCategoryPage />} />
              <Route path="/categories" element={<CategoryBrowsePage />} />
              <Route path="/campus-events" element={<CampusEventsPage />} />
              <Route path="/webinar-events" element={<WebinarEventsPage />} />
              <Route path="/city/:city" element={<CityEventsPage />} />
              <Route path="/event/:id" element={<EventDetails />} />
              <Route path="/contact" element={<ContactUs />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/cookies" element={<CookiePolicy />} />
              <Route path="/faqs" element={<FAQ />} />
              <Route path="/about" element={<AboutUs />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/submit-event" element={<SubmitEventPage />} />
              <Route path="/manage/:manageKey" element={<ManageEvent />} />

              {/* USER DASHBOARD ROUTES */}
              <Route element={<UserLayout />}>
                <Route path="/dashboard" element={<UserDashboard />} />
                <Route path="/dashboard/categories" element={<CategoryBrowse />} />
                <Route path="/dashboard/uni-events" element={<CampusEvents />} />
                <Route path="/dashboard/web-events" element={<WebinarEvents />} />
                <Route path="/dashboard/category/:slug" element={<GenericCategory />} />
                <Route path="/saved-events" element={<SavedEvents />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/notifications" element={<NotificationsPage />} />
              </Route>

              {/* ADMIN ROUTES - PROTECTED */}
              <Route path="/admin/login" element={<AdminLogin />} />
              
              <Route path="/admin" element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              } />
              
              <Route path="/admin/events" element={
                <AdminRoute>
                  <AdminEvents />
                </AdminRoute>
              } />
              
              <Route path="/admin/events/create" element={
                <AdminRoute>
                  <AdminEventForm />
                </AdminRoute>
              } />
              
              <Route path="/admin/events/edit/:id" element={
                <AdminRoute>
                  <AdminEventForm />
                </AdminRoute>
              } />
              
              <Route path="/admin/users" element={
                <AdminRoute>
                  <AdminUsers />
                </AdminRoute>
              } />
              
              <Route path="/admin/event-submissions" element={
                <AdminRoute>
                  <EventSubmissionsPage />
                </AdminRoute>
              } />
              
              <Route path="/admin/categories" element={
                <AdminRoute>
                  <AdminCategories />
                </AdminRoute>
              } />
              
              <Route path="/admin/tickets" element={
                <AdminRoute>
                  <AdminTickets />
                </AdminRoute>
              } />
              
              <Route path="/admin/universities" element={
                <AdminRoute>
                  <AdminUniversities />
                </AdminRoute>
              } />
              
              <Route path="/admin/notifications" element={
                <AdminRoute>
                  <AdminNotifications />
                </AdminRoute>
              } />
              
              <Route path="/admin/saved-events-analytics" element={
                <AdminRoute>
                  <AdminSavedEventsAnalytics />
                </AdminRoute>
              } />
            </Routes>
          </div>
        </Router>
      </SavedEventsProvider>
    </AuthProvider>
  );
}

export default App;