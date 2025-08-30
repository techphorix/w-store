import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCheckCircle,
  faTimesCircle,
  faSpinner,
  faHome,
  faEnvelope
} from '@fortawesome/free-solid-svg-icons';
import { registrationApi } from '../services/api';

const EmailVerification = () => {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link');
        return;
      }

      try {
        const response = await registrationApi.verifyEmail(token);
        
        if (response.data.success) {
          setStatus('success');
          setMessage(response.data.message);
        } else {
          setStatus('error');
          setMessage(response.data.message || 'Verification failed');
        }
      } catch (error: any) {
        setStatus('error');
        setMessage(
          error.response?.data?.message || 
          'An error occurred during email verification'
        );
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className={`px-8 py-12 text-center ${
            status === 'success' 
              ? 'bg-gradient-to-r from-green-500 to-green-600'
              : status === 'error'
              ? 'bg-gradient-to-r from-red-500 to-red-600'
              : 'bg-gradient-to-r from-blue-500 to-blue-600'
          }`}>
            <div className="mb-4">
              {status === 'loading' && (
                <FontAwesomeIcon 
                  icon={faSpinner} 
                  className="text-6xl text-white animate-spin"
                />
              )}
              {status === 'success' && (
                <FontAwesomeIcon 
                  icon={faCheckCircle} 
                  className="text-6xl text-white"
                />
              )}
              {status === 'error' && (
                <FontAwesomeIcon 
                  icon={faTimesCircle} 
                  className="text-6xl text-white"
                />
              )}
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {status === 'loading' && 'Verifying Email...'}
              {status === 'success' && 'Email Verified!'}
              {status === 'error' && 'Verification Failed'}
            </h1>
            <p className="text-blue-100 text-lg">
              {status === 'loading' && 'Please wait while we verify your email address'}
              {status === 'success' && 'Your email has been successfully verified'}
              {status === 'error' && 'There was a problem verifying your email'}
            </p>
          </div>

          {/* Content */}
          <div className="px-8 py-8">
            <div className="text-center mb-6">
              <p className="text-gray-600 text-lg">
                {message}
              </p>
            </div>

            {status === 'success' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-green-900 mb-3">
                  What's Next?
                </h3>
                <ul className="text-green-800 space-y-2 text-sm">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>Your registration is now under admin review</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>You'll receive an email notification once approved</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>Approval typically takes 24-48 hours</span>
                  </li>
                </ul>
              </div>
            )}

            {status === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-red-900 mb-3">
                  Need Help?
                </h3>
                <p className="text-red-800 text-sm mb-3">
                  If you're having trouble with email verification, please contact our support team.
                </p>
                <button
                  onClick={() => window.open('mailto:support@tiktokshop.com', '_blank')}
                  className="inline-flex items-center text-red-700 hover:text-red-900 text-sm font-medium"
                >
                  <FontAwesomeIcon icon={faEnvelope} className="mr-2" />
                  Contact Support
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/"
                className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FontAwesomeIcon icon={faHome} className="mr-2" />
                Back to Home
              </Link>
              
              {status === 'success' && (
                <Link
                  to="/register"
                  className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Register Another seller
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center space-x-6 text-sm text-gray-600">
            <a href="#" className="hover:text-blue-600 transition-colors">
              Help Center
            </a>
            <span>•</span>
            <a href="#" className="hover:text-blue-600 transition-colors">
              Contact Support
            </a>
            <span>•</span>
            <a href="#" className="hover:text-blue-600 transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
