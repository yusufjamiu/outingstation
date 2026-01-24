import React from 'react';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
// import { AuthProvider } from './context/AuthContext';

// Pages
import ScrollToTop from './components/ScrollToTop';
import LandingPage from './pages/LandingPage';
import EventsPage from './pages/EventsPage';
import EventDetails from "./pages/events/EventDetails";
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage'
import ResetPasswordPage from './pages/ResetPasswordPage';
import GenericCategoryPage from './pages/categories/GenericCategoryPage';
import CategoryBrowsePage from './pages/categories/CategoryBrowsePage';
import CampusEventsPage from './pages/categories/CampusEventsPage'; // For non-logged-in users
import UniversityEventsPage from "./pages/categories/UniversityEventsPage";
import WebinarEventsPage from './pages/categories/WebinarEventsPage';
import UserDashboard from './pages/dashboard/UserDashboard';
import SavedEvents from './pages/dashboard/SavedEvents';
import Settings from './pages/dashboard/Settings';
import GenericCategory from './pages/dashboard/GenericCategory';
import WebinarEvents from './pages/dashboard/WebinarEvents';
import CategoryBrowse from './pages/dashboard/CategoryBrowse'; // All categories for logged-in users
import CampusEvents from './pages/dashboard/CampusEventsPageAuth'; // Campus events for logged-in users

function App() {
  return (
    // <AuthProvider>
      <Router>
        <ScrollToTop />
        <div className="App">
          <Routes>
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

            
            {/* Dashboard Routes (for logged-in users) */}
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/dashboard/categories" element={<CategoryBrowse />} /> {/* Shows all categories */}
            <Route path="/dashboard/uni-events" element={<CampusEvents />} /> {/* Shows campus events */}
            <Route path="/saved-events" element={<SavedEvents />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/event/:id" element={<EventDetails />} />
            <Route path="/dashboard/category/:slug" element={<GenericCategory />} />
            <Route path="/dashboard/web-events" element={<WebinarEvents />} />
            {/* 
            <Route path="/create-event" element={<CreateEventPage />} />
            <Route path="/profile" element={<ProfilePage />} /> 
            */}
          </Routes>
        </div>
      </Router>
    // </AuthProvider>
  );
}

export default App;
