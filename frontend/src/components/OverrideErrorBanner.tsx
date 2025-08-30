import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faRefresh, faTimes } from '@fortawesome/free-solid-svg-icons';

interface OverrideErrorBannerProps {
  error: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  sellerId?: string;
}

const OverrideErrorBanner: React.FC<OverrideErrorBannerProps> = ({
  error,
  onRetry,
  onDismiss,
  sellerId
}) => {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <FontAwesomeIcon 
            icon={faExclamationTriangle} 
            className="h-5 w-5 text-red-400" 
          />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">
            Admin Overrides Error
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>
              {sellerId && `Failed to load/save overrides for seller ${sellerId}: `}
              {error}
            </p>
            <p className="mt-1 text-xs text-red-600">
              Your changes may not be saved. Please try again or contact support if the problem persists.
            </p>
          </div>
          <div className="mt-3 flex space-x-3">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <FontAwesomeIcon icon={faRefresh} className="mr-2 h-4 w-4" />
                Retry
              </button>
            )}
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <FontAwesomeIcon icon={faTimes} className="mr-2 h-4 w-4" />
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverrideErrorBanner;
