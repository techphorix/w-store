import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBars, 
  faBell, 
  faUser, 
  faChevronDown, 
  faGlobe,
  faCog,
  faSignOutAlt
} from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import { useAuth } from '../contexts/AuthContext';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title, subtitle }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentLanguage, setCurrentLanguage] = useState('EN');
  const { logout } = useAuth();

  const languages = [
    { code: 'EN', name: 'English' },
    { code: 'ES', name: 'Español' },
    { code: 'ZH', name: '中文' }
  ];

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <AdminSidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      
      {/* Main Content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${
        sidebarOpen ? 'lg:ml-0' : 'lg:ml-0'
      }`}>
        
        {/* Top Header Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 z-30">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            
            {/* Left Side - Mobile Menu & Title */}
            <div className="flex items-center">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden mr-3"
              >
                <FontAwesomeIcon icon={faBars} className="w-5 h-5 text-gray-600" />
              </button>
              
              {title && (
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{title}</h1>
                  {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
                </div>
              )}
            </div>

            {/* Right Side - Language, Notifications, Profile */}
            <div className="flex items-center space-x-4">
              
              {/* Language Selector */}
              <div className="relative">
                <div className="flex items-center bg-gray-100 rounded-lg px-3 py-1">
                  <FontAwesomeIcon icon={faGlobe} className="w-4 h-4 text-gray-600 mr-2" />
                  <select
                    value={currentLanguage}
                    onChange={(e) => setCurrentLanguage(e.target.value)}
                    className="appearance-none bg-transparent text-sm font-medium text-gray-900 cursor-pointer outline-none pr-4"
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                  <FontAwesomeIcon icon={faChevronDown} className="w-3 h-3 text-gray-600" />
                </div>
              </div>

              {/* Notifications */}
              <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <FontAwesomeIcon icon={faBell} className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* Profile Dropdown */}
              <div className="relative group">
                <button className="flex items-center space-x-2 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <FontAwesomeIcon icon={faUser} className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 hidden sm:block">Admin</span>
                  <FontAwesomeIcon icon={faChevronDown} className="w-3 h-3" />
                </button>
                
                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <div className="py-2">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">System Administrator</p>
                      <p className="text-xs text-gray-500">admin@tiktokshop.com</p>
                    </div>
                    <Link 
                      to="/admin/profile" 
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <FontAwesomeIcon icon={faUser} className="mr-3 w-4 h-4" />
                      Profile Settings
                    </Link>
                    <Link 
                      to="/admin/settings" 
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <FontAwesomeIcon icon={faCog} className="mr-3 w-4 h-4" />
                      System Settings
                    </Link>
                    <div className="border-t border-gray-100 mt-2 pt-2">
                      <Link 
                        to="/" 
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <FontAwesomeIcon icon={faUser} className="mr-3 w-4 h-4" />
                        Back to Site
                      </Link>
                      <button 
                        onClick={() => {
                          logout();
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <FontAwesomeIcon icon={faSignOutAlt} className="mr-3 w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="container mx-auto px-4 lg:px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
