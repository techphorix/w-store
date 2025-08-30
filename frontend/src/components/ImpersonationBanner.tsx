import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUserShield, 
  faTimes, 
  faExclamationTriangle 
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../contexts/AuthContext';

const ImpersonationBanner: React.FC = () => {
  const { isImpersonating, originalUser, user, stopImpersonation } = useAuth();

  if (!isImpersonating || !originalUser || !user) {
    return null;
  }

  // Safety check for user properties
  const userName = user?.fullName || 'Unknown User';
  const storeName = user?.businessInfo?.storeName;
  const userEmail = user?.email || 'No Email';
  const displayName = storeName || userEmail;

  return (
    <div className="bg-yellow-500 text-black px-4 py-3 relative z-50 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FontAwesomeIcon icon={faExclamationTriangle} className="w-5 h-5" />
          <div className="flex items-center space-x-2">
            <FontAwesomeIcon icon={faUserShield} className="w-4 h-4" />
            <span className="font-medium">
              Admin Impersonation Active:
            </span>
            <span className="font-semibold">
              Logged in as {userName} ({displayName})
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <span className="text-sm">
            Original Admin: {originalUser?.fullName || 'Unknown Admin'}
          </span>
          <button
            onClick={stopImpersonation}
            className="flex items-center space-x-2 bg-black text-yellow-500 px-3 py-1 rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            <FontAwesomeIcon icon={faTimes} className="w-3 h-3" />
            <span>Stop Impersonation</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImpersonationBanner;
