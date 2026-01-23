import React from 'react';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
// import { AuthProvider } from './context/AuthContext';

// Pages
import LandingPage from './pages/LandingPage';
import EventsPage from './pages/EventsPage';
// import EventDetailsPage from './pages/EventDetailsPage';
// import CreateEventPage from './pages/CreateEventPage';
// import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage'
import ResetPasswordPage from './pages/ResetPasswordPage';
import GenericCategoryPage from './pages/categories/GenericCategoryPage';
import CategoryBrowsePage from './pages/categories/CategoryBrowsePage';
import CampusEventsPage from './pages/categories/CampusEventsPage';
import WebinarEventsPage from './pages/categories/WebinarEventsPage';
import UserDashboard from './pages/dashboard/UserDashboard';
import SavedEvents from './pages/dashboard/SavedEvents';
import CategoryBrowsePageAuth from './pages/dashboard/CategoryBrowsePageAuth';
import Settings from './pages/dashboard/Settings';

function App() {
  return (
    // <AuthProvider>
      <Router>
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
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/saved-events" element={<SavedEvents />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/dashboard/categories" element={<CategoryBrowsePageAuth />} />
            {/* 
            <Route path="/event/:id" element={<EventDetailsPage />} />
            <Route path="/create-event" element={<CreateEventPage />} />
            <Route path="/profile" element={<ProfilePage />} /> */}
          </Routes>
        </div>
      </Router>
    // </AuthProvider>
  );
}

export default App;