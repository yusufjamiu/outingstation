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
// import UniversityEventsPage from './pages/UniversityEventsPage';

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
            {/* 
            <Route path="/event/:id" element={<EventDetailsPage />} />
            <Route path="/create-event" element={<CreateEventPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            
            <Route path="/university/:universityId" element={<UniversityEventsPage />} /> */}
          </Routes>
        </div>
      </Router>
    // </AuthProvider>
  );
}

export default App;