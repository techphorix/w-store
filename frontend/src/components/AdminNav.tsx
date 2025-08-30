import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTachometerAlt, 
  faShoppingBag, 
  faUsers,
  faChartLine,
  faCog,
  faSignOutAlt,
  faClipboardList,
  faStore,
  faUserShield
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../contexts/AuthContext';

// DEPRECATED: This component is replaced by AdminSidebar and AdminLayout
// Keep for backward compatibility only
const AdminNav = () => {
  const location = useLocation();
  const { logout } = useAuth();

  const navItems = [
    {
      icon: faTachometerAlt,
      label: 'Dashboard',
      path: '/admin/dashboard',
    },
    {
      icon: faUserShield,
      label: 'User Management',
      path: '/admin/user-management',
    },
    {
      icon: faStore,
      label: 'Shop Control',
      path: '/admin/shop-control',
    },
    {
      icon: faUsers,
      label: 'sellers',
      path: '/admin/sellers',
    },
    {
      icon: faChartLine,
      label: 'Analytics',
      path: '/admin/analytics',
    },
    {
      icon: faClipboardList,
      label: 'Orders',
      path: '/admin/orders',
    },
    {
      icon: faCog,
      label: 'Settings',
      path: '/admin/settings',
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white shadow-sm border-r border-gray-200 h-screen w-64 fixed left-0 top-0 z-40">
      <div className="p-6">
        <Link to="/admin/dashboard" className="flex items-center space-x-2 mb-8">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">TikTok Shop</h1>
            <p className="text-xs text-gray-500">Admin Panel</p>
          </div>
        </Link>

        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <FontAwesomeIcon 
                  icon={item.icon} 
                  className={`text-sm ${isActive(item.path) ? 'text-blue-700' : 'text-gray-500'}`}
                />
                <span className="font-medium">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200">
        <div className="space-y-2">
          <Link
            to="/"
            className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <FontAwesomeIcon icon={faUserShield} className="text-sm" />
            <span className="font-medium">Back to Site</span>
          </Link>
          <button
            onClick={() => {
              logout();
            }}
            className="flex items-center w-full space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <FontAwesomeIcon icon={faSignOutAlt} className="text-sm" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default AdminNav;
