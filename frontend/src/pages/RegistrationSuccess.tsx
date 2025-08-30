import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCheckCircle,
  faEnvelope,
  faStore,
  faClock,
  faArrowRight,
  faHome
} from '@fortawesome/free-solid-svg-icons';

const RegistrationSuccess = () => {
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-redirect to landing page
          window.location.href = '/';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-cyan-50 flex items-center justify-center px-4">
      {/* Animated background matching the provided image */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-pink-200/30 to-rose-300/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-cyan-200/30 to-teal-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-gradient-to-tl from-pink-300/20 to-cyan-200/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 max-w-2xl w-full">
        {/* Success Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/50 overflow-hidden">
          {/* Success Header */}
          <div className="bg-gradient-to-r from-pink-400 to-cyan-400 px-8 py-12 text-center relative">
            {/* TikTok Logo */}
            <div className="absolute top-6 left-6">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </div>
            </div>
            
            <div className="mb-6">
              <FontAwesomeIcon 
                icon={faCheckCircle} 
                className="text-6xl text-white animate-bounce"
              />
            </div>
            <h1 className="text-4xl font-bold text-white mb-3">
              You're In! 🎉
            </h1>
            <p className="text-white/90 text-xl">
              Welcome to the TikTok Shop creator family
            </p>
          </div>

          {/* Content */}
          <div className="px-8 py-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                What happens next?
              </h2>
              <p className="text-gray-600 text-lg">
                Your creator application has been submitted successfully. Here's your journey to viral success:
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-6 mb-8">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gradient-to-r from-cyan-100 to-cyan-200 rounded-full flex items-center justify-center">
                    <FontAwesomeIcon icon={faEnvelope} className="text-cyan-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    Email Confirmation
                  </h3>
                  <p className="text-gray-600">
                    Check your email inbox for a confirmation message. Click the verification link to activate your creator account.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gradient-to-r from-pink-100 to-pink-200 rounded-full flex items-center justify-center">
                    <FontAwesomeIcon icon={faClock} className="text-pink-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    Creator Review
                  </h3>
                  <p className="text-gray-600">
                    Our team will review your creator profile and documents within 24-48 hours. Get ready to go viral!
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gradient-to-r from-pink-200 to-cyan-200 rounded-full flex items-center justify-center">
                    <FontAwesomeIcon icon={faStore} className="text-teal-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    Start Creating
                  </h3>
                  <p className="text-gray-600">
                    Once approved, access your creator dashboard to showcase products, create viral content, and build your TikTok Shop empire.
                  </p>
                </div>
              </div>
            </div>

            {/* Important Notes */}
            <div className="bg-gradient-to-r from-pink-50 to-cyan-50 border border-pink-200/50 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Creator Tips 🚀
              </h3>
              <ul className="text-gray-700 space-y-2">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-pink-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Keep your invitation code safe - it's your golden ticket to success</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Check your spam folder if you don't receive the confirmation email</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-pink-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Showcase products from our viral-ready catalog to maximize engagement</span>
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>Contact our creator support team for any questions during approval</span>
                </li>
              </ul>
            </div>

            {/* Contact Information */}
            <div className="bg-white/50 backdrop-blur-sm rounded-xl p-6 mb-8 border border-gray-200/50">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Creator Support 💬
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <p className="font-medium text-cyan-600">Email Support</p>
                  <p>creators@tiktokshop.com</p>
                </div>
                <div>
                  <p className="font-medium text-cyan-600">Creator Hotline</p>
                  <p>+1 (555) TIKTOK-1</p>
                </div>
                <div>
                  <p className="font-medium text-cyan-600">Support Hours</p>
                  <p>24/7 Creator Support</p>
                </div>
                <div>
                  <p className="font-medium text-cyan-600">Response Time</p>
                  <p>Lightning fast - within 2 hours</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/"
                className="flex-1 inline-flex items-center justify-center px-6 py-4 bg-gradient-to-r from-pink-400 to-cyan-400 text-white font-bold rounded-xl hover:from-pink-500 hover:to-cyan-500 transition-all transform hover:scale-105 shadow-lg"
              >
                <FontAwesomeIcon icon={faHome} className="mr-2" />
                Explore TikTok Shop
              </Link>
              <button
                onClick={() => window.open('mailto:creators@tiktokshop.com', '_blank')}
                className="flex-1 inline-flex items-center justify-center px-6 py-4 bg-white border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:border-cyan-400 hover:text-cyan-600 transition-all transform hover:scale-105 shadow-lg"
              >
                <FontAwesomeIcon icon={faEnvelope} className="mr-2" />
                Creator Support
              </button>
            </div>

            {/* Auto Redirect Notice */}
            <div className="text-center mt-6 p-4 bg-gradient-to-r from-pink-100/50 to-cyan-100/50 border border-pink-300/30 rounded-xl">
              <p className="text-gray-700 text-sm">
                <FontAwesomeIcon icon={faClock} className="mr-2 text-pink-500" />
                Auto-redirecting to TikTok Shop in <strong className="text-cyan-600">{countdown}</strong> seconds
              </p>
            </div>
          </div>
        </div>

        {/* Additional Resources */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center space-x-6 text-sm text-gray-600">
            <a href="#" className="hover:text-cyan-500 transition-colors">
              Creator Guidelines
            </a>
            <span>•</span>
            <a href="#" className="hover:text-cyan-500 transition-colors">
              Viral Success Guide
            </a>
            <span>•</span>
            <a href="#" className="hover:text-cyan-500 transition-colors">
              Creator FAQ
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationSuccess;