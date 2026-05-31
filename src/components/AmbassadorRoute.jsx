import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AmbassadorRoute({ children }) {
  const { currentUser, userProfile } = useAuth();

  // Not logged in at all → send to login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Logged in, but not a campus ambassador → send to the normal user dashboard
  if (userProfile?.isCampusAmbassador !== true) {
    return <Navigate to="/dashboard" replace />;
  }

  // Logged in AND a campus ambassador → allow through
  return children;
}
