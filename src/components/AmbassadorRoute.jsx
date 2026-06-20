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

  if (!isCampusAmbassador && !isCityAmbassador) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}