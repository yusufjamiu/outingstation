// ✅ IMPORTS - ONLY AT THE TOP
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SavedEventsProvider } from './context/SavedEventsContext';
import ToastContainer from './components/ToastContainer';
import OutingStationAI from './components/OutingStationAI';

// Layouts
import UserLayout from './layouts/UserLayout';

// Components — kept eager: small, structural, needed on every route
// (route guards must render immediately, not after a chunk fetch).
import ScrollToTop from './components/ScrollToTop';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import AdminRoute from './components/AdminRoute';
import AmbassadorRoute from './components/AmbassadorRoute';

// ✅ CHANGED — every page below is now lazy-loaded instead of eagerly
// imported. Previously ALL ~90 pages (including ~50 admin/ambassador-only
// pages almost no visitor ever hits) were bundled into one 2.5MB JS file
// downloaded on every single page load. Now each page's code only
// downloads when someone actually navigates to that route.

// Public Pages
const ComingSoon = lazy(() => import('./pages/ComingSoon'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const EventsPage = lazy(() => import('./pages/EventsPage'));
const PlacesPage = lazy(() => import('./pages/PlacesPage'));
const EventDetails = lazy(() => import('./pages/events/EventDetails'));
const PublicHallsPage = lazy(() => import('./pages/HallsPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const GenericCategoryPage = lazy(() => import('./pages/categories/GenericCategoryPage'));
const CategoryBrowsePage = lazy(() => import('./pages/categories/CategoryBrowsePage'));
const CampusPage = lazy(() => import('./pages/CampusPage'));
const CampusEventsPage = lazy(() => import('./pages/categories/CampusEventsPage'));
const WebinarEventsPage = lazy(() => import('./pages/categories/WebinarEventsPage'));
const CampusPlacesPage = lazy(() => import('./pages/categories/CampusPlacesPage'));
const CampusVendorPage = lazy(() => import('./pages/CampusVendorPage'));
const ManageEventsPage = lazy(() => import('./pages/ManageEventsPage'));
const ContactUs = lazy(() => import('./pages/ContactUs'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const RestaurantsPage = lazy(() => import('./pages/RestaurantsPage'));
const OpportunitiesPage = lazy(() => import('./pages/OpportunitiesPage'));
const ResortsPage = lazy(() => import('./pages/ResortsPage'));
const ShortletsPage = lazy(() => import('./pages/ShortletsPage')); // ✅ NEW
const RentARidePage = lazy(() => import('./pages/RentARidePage'));
const MarketplacePage = lazy(() => import('./pages/MarketplacePage'));
const MarketplaceCategoryPage = lazy(() => import('./pages/MarketplaceCategoryPage'));
const PlanEventPage = lazy(() => import('./pages/PlanEventPage'));
const CityEventsPage = lazy(() => import('./pages/events/CityEventsPage'));
const MyEventsPage = lazy(() => import('./pages/MyEventsPage'));
const OSBDashboard = lazy(() => import('./pages/osb/OSBDashboard'));
const CookiePolicy = lazy(() => import('./pages/CookiePolicy'));
const FAQ = lazy(() => import('./pages/FAQ'));
const AboutUs = lazy(() => import('./pages/AboutUs'));
const HowItWorks = lazy(() => import('./pages/HowItWorks'));
const SubmitEventPage = lazy(() => import('./pages/SubmitEventPage'));
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage'));
const VerifyTicket = lazy(() => import('./pages/VerifyTicket'));
const JoinAmbassador = lazy(() => import('./pages/JoinAmbassador'));
const CreditUnlockRequestPage = lazy(() => import('./pages/CreditUnlockRequestPage'));

// User Dashboard Pages
const UserDashboard = lazy(() => import('./pages/dashboard/UserDashboard'));
const SavedEvents = lazy(() => import('./pages/dashboard/SavedEvents'));
const Settings = lazy(() => import('./pages/dashboard/Settings'));
const RewardsPage = lazy(() => import('./pages/dashboard/RewardsPage'));
const GenericCategory = lazy(() => import('./pages/dashboard/GenericCategory'));
const WebinarEvents = lazy(() => import('./pages/dashboard/WebinarEvents'));
const CategoryBrowse = lazy(() => import('./pages/dashboard/CategoryBrowse'));
const CampusEvents = lazy(() => import('./pages/dashboard/CampusEvents'));
const CampusPlaces = lazy(() => import('./pages/dashboard/CampusPlaces'));
const HallsPage = lazy(() => import('./pages/dashboard/HallsPage'));

// osb
const BecomeABusinessPage = lazy(() => import('./pages/osb/BecomeABusinessPage'));

// Ambassador Dashboard Pages
const AmbassadorDashboard = lazy(() => import('./pages/ambassador/AmbassadorDashboard'));
const AmbassadorEventForm = lazy(() => import('./pages/ambassador/AmbassadorEventForm'));
const AmbassadorEvents = lazy(() => import('./pages/ambassador/AmbassadorEvents'));
const AmbassadorPlaces = lazy(() => import('./pages/ambassador/AmbassadorPlaces'));
const AmbassadorPlaceForm = lazy(() => import('./pages/ambassador/AmbassadorPlaceForm'));
const AmbassadorVendors = lazy(() => import('./pages/ambassador/AmbassadorVendors'));
const AmbassadorVendorForm = lazy(() => import('./pages/ambassador/AmbassadorVendorForm'));
const AmbassadorNotifications = lazy(() => import('./pages/ambassador/AmbassadorNotifications'));
const SubmittedEvents = lazy(() => import('./pages/ambassador/SubmittedEvents'));
const AmbassadorTracking = lazy(() => import('./pages/ambassador/AmbassadorTracking'));
const AdminBusinesses = lazy(() => import('./pages/admin/AdminBusinesses'));
const AdminPlaceClaims = lazy(() => import('./pages/admin/AdminPlaceClaims'));
const CityAmbassadorCreate = lazy(() => import('./pages/ambassador/CityAmbassadorCreate'));

// Event Management
const ManageEvent = lazy(() => import('./pages/EventManage/ManageEvent'));

// Admin Pages
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminEvents = lazy(() => import('./pages/admin/AdminEvents'));
const AdminPlaces = lazy(() => import('./pages/admin/AdminPlaces'));
const AdminPlaceForm = lazy(() => import('./pages/admin/AdminPlaceForm'));
const AdminEventForm = lazy(() => import('./pages/admin/AdminEventForm'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));
const AdminUniversities = lazy(() => import('./pages/admin/Adminuniversities'));
const AdminTickets = lazy(() => import('./pages/admin/AdminTickets'));
const AdminSavedEventsAnalytics = lazy(() => import('./pages/admin/AdminSavedEventsAnalytics'));
const AdminEssentialServices = lazy(() => import('./pages/admin/AdminEssentialServices'));
const EventSubmissionsPage = lazy(() => import('./pages/admin/EventSubmissionsPage'));
const AdminEarlyAccess = lazy(() => import('./pages/admin/AdminEarlyAccess'));
const AdminNotifications = lazy(() => import('./pages/admin/AdminNotifications'));
const AdminAmbassadors = lazy(() => import('./pages/admin/AdminAmbassadors'));
const AdminVendors = lazy(() => import('./pages/admin/AdminVendors'));
const AdminVendorForm = lazy(() => import('./pages/admin/AdminVendorForm'));
const AdminMusicTracks = lazy(() => import('./pages/admin/AdminMusicTracks'));
const AdminCreditRequests = lazy(() => import('./pages/admin/AdminCreditRequests'));
const AdminAmbassadorApplications = lazy(() => import('./pages/admin/AdminAmbassadorApplications'));
const AdminAmbassadorPayouts = lazy(() => import('./pages/admin/AdminAmbassadorPayouts'));

// ✅ NEW — minimal loading fallback shown while a route's chunk downloads.
// Deliberately lightweight (no image/icon assets) so IT doesn't add to
// what has to load before something appears on screen.
function RouteLoadingFallback() {
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width: 32,
        height: 32,
        border: '3px solid #E5E7EB',
        borderTopColor: '#22D3EE',
        borderRadius: '50%',
        animation: 'os-spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes os-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ✅ FUNCTION STARTS HERE
function App() {
  return (
    <AuthProvider>
      <SavedEventsProvider>
        <Router>
          <ScrollToTop />
          <div className="App">
            <ToastContainer />
            <OutingStationAI />
            <Suspense fallback={<RouteLoadingFallback />}>
              <Routes>
                {/* PUBLIC ROUTES */}
                <Route path="/preview" element={<ComingSoon />} />
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/forgot-password" element={<ResetPasswordPage />} />
                <Route path="/credit-unlock-request" element={<CreditUnlockRequestPage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/places" element={<PlacesPage />} />
                <Route path="/halls" element={<PublicHallsPage />} />
                <Route path="/category/:slug" element={<GenericCategoryPage />} />
                <Route path="/categories" element={<CategoryBrowsePage />} />
                <Route path="/campus" element={<CampusPage />} />
                <Route path="/campus-events" element={<CampusEventsPage />} />
                <Route path="/webinar-events" element={<WebinarEventsPage />} />
                <Route path="/campus-places" element={<CampusPlacesPage />} />
                <Route path="/campus-vendor" element={<CampusVendorPage />} />
                <Route path="/city/:city" element={<CityEventsPage />} />
                <Route path="/event/:id" element={<EventDetails />} />
                <Route path="/e/:slug" element={<EventDetails />} />
                <Route path="/contact" element={<ContactUs />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/restaurants" element={<RestaurantsPage />} />
                <Route path="/opportunities" element={<OpportunitiesPage />} />
                <Route path="/resorts" element={<ResortsPage />} />
                <Route path="/shortlets" element={<ShortletsPage />} /> {/* ✅ NEW */}
                <Route path="/rent-a-ride" element={<RentARidePage />} />
                <Route path="/marketplace" element={<MarketplacePage />} />
                <Route path="/marketplace/:slug" element={<MarketplaceCategoryPage />} />
                <Route path="/plan-event" element={<PlanEventPage />} />
                <Route path="/my-events" element={<MyEventsPage />} />
                <Route path="/manage-events" element={<ManageEventsPage />} />
                <Route path="/business" element={<OSBDashboard />} />
                <Route path="/cookies" element={<CookiePolicy />} />
                <Route path="/faqs" element={<FAQ />} />
                <Route path="/about" element={<AboutUs />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/create" element={<SubmitEventPage />} />
                <Route path="/create" element={<SubmitEventPage />} />
                <Route path="/create-event" element={<SubmitEventPage />} />
                <Route path="/create-place" element={<SubmitEventPage />} />
                <Route path="/list-vendor" element={<SubmitEventPage />} />
                <Route path="/manage/:manageKey" element={<ManageEvent />} />
                <Route path="/verify-ticket/:ticketId" element={<VerifyTicket />} />
                <Route path="/join" element={<JoinAmbassador />} />

                {/* USER DASHBOARD ROUTES */}
                <Route element={<UserLayout />}>
                  <Route path="/dashboard" element={<UserDashboard />} />
                  <Route path="/dashboard/categories" element={<CategoryBrowse />} />
                  <Route path="/dashboard/uni-events" element={<CampusEvents />} />
                  <Route path="/dashboard/web-events" element={<WebinarEvents />} />
                  <Route path="/dashboard/campus-places" element={<CampusPlaces />} />
                  <Route path="/dashboard/halls" element={<HallsPage />} />
                  <Route path="/dashboard/category/:slug" element={<GenericCategory />} />
                  <Route path="/saved-events" element={<SavedEvents />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/rewards" element={<RewardsPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                </Route>

                {/* OutingStation Business */}
                <Route path="/business/register" element={<BecomeABusinessPage />} />

                {/* AMBASSADOR ROUTES - PROTECTED (campus ambassadors only) */}
                <Route path="/ambassador" element={
                  <AmbassadorRoute>
                    <AmbassadorDashboard />
                  </AmbassadorRoute>
                } />

                <Route path="/ambassador/events" element={
                  <AmbassadorRoute>
                    <AmbassadorEvents />
                  </AmbassadorRoute>
                } />

                <Route path="/ambassador/events/create" element={
                  <AmbassadorRoute>
                    <AmbassadorEventForm />
                  </AmbassadorRoute>
                } />

                <Route path="/ambassador/events/edit/:id" element={
                  <AmbassadorRoute>
                    <AmbassadorEventForm />
                  </AmbassadorRoute>
                } />

                <Route path="/ambassador/places" element={
                  <AmbassadorRoute>
                    <AmbassadorPlaces />
                  </AmbassadorRoute>
                } />

                <Route path="/ambassador/places/create" element={
                  <AmbassadorRoute>
                      <AmbassadorPlaceForm />
                    </AmbassadorRoute>
                  } />

                  <Route path="/ambassador/places/edit/:id" element={
                    <AmbassadorRoute>
                      <AmbassadorPlaceForm />
                    </AmbassadorRoute>
                  } />

                <Route path="/ambassador/vendors" element={
                  <AmbassadorRoute>
                    <AmbassadorVendors />
                  </AmbassadorRoute>
                } />

                <Route path="/ambassador/vendors/create" element={
                  <AmbassadorRoute>
                    <AmbassadorVendorForm />
                  </AmbassadorRoute>
                } />

                <Route path="/ambassador/vendors/edit/:id" element={
                  <AmbassadorRoute>
                    <AmbassadorVendorForm />
                  </AmbassadorRoute>
                } />

                <Route path="/ambassador/notifications" element={
                  <AmbassadorRoute>
                    <AmbassadorNotifications />
                  </AmbassadorRoute>
                } />

                <Route path="/admin/music-tracks" element={
                  <AdminRoute>
                    <AdminMusicTracks />
                  </AdminRoute>
                } />

                <Route path="/ambassador/submitted-events" element={
                  <AmbassadorRoute>
                    <SubmittedEvents />
                  </AmbassadorRoute>
                } />
                <Route path="/ambassador/tracking" element={
                  <AmbassadorRoute>
                    <AmbassadorTracking />
                  </AmbassadorRoute>
                } />
                {/* ✅ Old /ambassador/earnings URL kept working for anyone
                    with it bookmarked or linked from an old notification —
                    just redirects straight to the renamed route. */}
                <Route path="/ambassador/earnings" element={
                  <AmbassadorRoute>
                    <AmbassadorTracking />
                  </AmbassadorRoute>
                } />

                <Route path="/ambassador/create" element={
                  <AmbassadorRoute>
                    <CityAmbassadorCreate />
                  </AmbassadorRoute>
                } />

                {/* Events / Vendors / Notifications pages get added here in Step 4 */}

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

                <Route path="/admin/places" element={
                  <AdminRoute>
                    <AdminPlaces />
                  </AdminRoute>
                } />

                <Route path="/admin/places/create" element={
                  <AdminRoute>
                    <AdminPlaceForm />
                  </AdminRoute>
                } />

                <Route path="/admin/places/edit/:id" element={
                  <AdminRoute>
                    <AdminPlaceForm />
                  </AdminRoute>
                } />

                {/* ✅ VENDOR ROUTES */}
                <Route path="/admin/vendors" element={
                  <AdminRoute>
                    <AdminVendors />
                  </AdminRoute>
                } />

                <Route path="/admin/vendors/create" element={
                  <AdminRoute>
                    <AdminVendorForm />
                  </AdminRoute>
                } />

                <Route path="/admin/vendors/edit/:id" element={
                  <AdminRoute>
                    <AdminVendorForm />
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

                <Route path="/admin/early-access" element={
                  <AdminRoute>
                    <AdminEarlyAccess />
                  </AdminRoute>
                } />

                <Route path="/admin/ambassadors" element={
                  <AdminRoute>
                    <AdminAmbassadors />
                  </AdminRoute>
                } />

                <Route path="/admin/essential-services" element={
                  <AdminRoute>
                    <AdminEssentialServices />
                  </AdminRoute>
                } />

                <Route path="/admin/credit-requests" element={
                  <AdminRoute>
                    <AdminCreditRequests />
                  </AdminRoute>
                } />
                <Route path="/admin/ambassador-applications" element={
                  <AdminRoute>
                    <AdminAmbassadorApplications />
                  </AdminRoute>
                } />
                <Route path="/admin/ambassador-payouts" element={
                  <AdminRoute>
                    <AdminAmbassadorPayouts />
                  </AdminRoute>
                } />
                <Route path="/admin/businesses" element={
                  <AdminRoute>
                    <AdminBusinesses />
                  </AdminRoute>
                } />
                <Route path="/admin/place-claims" element={
                  <AdminRoute>
                    <AdminPlaceClaims />
                  </AdminRoute>
                } />
              </Routes>
            </Suspense>
          </div>
        </Router>
      </SavedEventsProvider>
    </AuthProvider>
  );
}

export default App;