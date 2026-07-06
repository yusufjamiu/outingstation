import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AmbassadorRoute({ children }) {
  const { currentUser, userProfile } = useAuth();

  // Not logged in → send to login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // ✅ Allow both campus and city ambassadors
  const isCampusAmbassador = userProfile?.isCampusAmbassador === true;
  const isCityAmbassador = userProfile?.isAmbassador === true && userProfile?.ambassadorType === 'city';

  // ✅ FIX: not an ambassador yet → send to the application page, not the dashboard
  if (!isCampusAmbassador && !isCityAmbassador) {
    return <Navigate to="/join" replace />;
  }

  return children;
}