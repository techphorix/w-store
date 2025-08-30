import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTachometerAlt, 
  faUserShield, 
  faStore, 
  faShoppingBag, 
  faUsers,
  faChartLine,
  faCog,
  faSignOutAlt,
  faClipboardList,
  faBars,
  faTimes,
  faChevronDown,
  faChevronRight,
  faBoxes,
  faWallet,
  faBell,
  faEnvelope,
  faShieldAlt,
  faDatabase,
  faTools,
  faGlobe,
  faDollarSign,
  faFolderOpen,
  faRobot
} from '@fortawesome/free-solid-svg-icons';
import tiktokLogo from '../assets/tiktok-logo.png';
import { useAuth } from '../contexts/AuthContext';

interface AdminSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface NavItem {
  icon: any;
  label: string;
  path?: string;
  children?: NavItem[];
  badge?: string;
  badgeColor?: string;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onToggle }) => {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(['dashboard']);
  const { logout } = useAuth();

  const navItems: NavItem[] = [
    {
      icon: faTachometerAlt,
      label: 'Dashboard',
      path: '/admin/dashboard',
    },
    {
      icon: faUsers,
      label: 'User Management',
      children: [
        { icon: faUsers, label: 'All Users', path: '/admin/users' },
        { icon: faStore, label: 'Sellers', path: '/admin/sellers' },
        { icon: faShieldAlt, label: 'Admins', path: '/admin/admins' },
      ]
    },
    {
      icon: faStore,
      label: 'Shop Management',
      children: [
        { icon: faStore, label: 'All Shops', path: '/admin/shop-control' },
        { icon: faBoxes, label: 'Products', path: '/admin/product-management' },
        { icon: faFolderOpen, label: 'Categories', path: '/admin/category-management' },
        { icon: faUsers, label: 'Sellers', path: '/admin/sellers' },
      ]
    },
    {
      icon: faClipboardList,
      label: 'Orders',
      path: '/admin/orders',
      badge: '12',
      badgeColor: 'bg-red-500'
    },
    {
      icon: faChartLine,
      label: 'Analytics & Reports',
      children: [
        { icon: faChartLine, label: 'Analytics', path: '/admin/analytics' },
        { icon: faWallet, label: 'Financial Reports', path: '/admin/financial-reports' },
        { icon: faDatabase, label: 'System Metrics', path: '/admin/system-metrics' },
      ]
    },
    {
      icon: faBell,
      label: 'Communications',
      children: [
        { icon: faBell, label: 'Notifications', path: '/admin/notifications' },
        { icon: faEnvelope, label: 'Messages', path: '/admin/messages' },
        { icon: faGlobe, label: 'Announcements', path: '/admin/announcements' },
      ]
    },
    {
      icon: faCog,
      label: 'System Settings',
      children: [
        { icon: faCog, label: 'General Settings', path: '/admin/settings' },
        { icon: faDollarSign, label: 'Currency Management', path: '/admin/currency' },
        { icon: faTools, label: 'System Tools', path: '/admin/tools' },
        { icon: faDatabase, label: 'Database', path: '/admin/database' },
      ]
    },
  ];

  const isActive = (path?: string) => {
    if (!path) return false;
    return location.pathname === path;
  };

  const hasActiveChild = (children?: NavItem[]) => {
    if (!children) return false;
    return children.some(child => isActive(child.path));
  };

  const toggleExpanded = (label: string) => {
    setExpandedItems(prev => 
      prev.includes(label) 
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  const renderNavItem = (item: NavItem, level = 0) => {
    const isExpanded = expandedItems.includes(item.label);
    const hasChildren = item.children && item.children.length > 0;
    const isItemActive = isActive(item.path) || hasActiveChild(item.children);

    return (
      <div key={item.label} className={`${level > 0 ? 'ml-4' : ''}`}>
        {item.path ? (
          <Link
            to={item.path}
            className={`flex items-center justify-between w-full px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group ${
              isItemActive
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            } ${level > 0 ? 'text-xs py-2' : ''}`}
          >
            <div className="flex items-center">
              <FontAwesomeIcon 
                icon={item.icon} 
                className={`w-4 h-4 mr-3 ${isItemActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'} ${level > 0 ? 'w-3 h-3 mr-2' : ''}`}
              />
              <span className={`${!isOpen && level === 0 ? 'hidden' : ''}`}>{item.label}</span>
            </div>
            {item.badge && (
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${item.badgeColor || 'bg-blue-500'}`}>
                {item.badge}
              </span>
            )}
          </Link>
        ) : (
          <button
            onClick={() => toggleExpanded(item.label)}
            className={`flex items-center justify-between w-full px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group ${
              isItemActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center">
              <FontAwesomeIcon 
                icon={item.icon} 
                className={`w-4 h-4 mr-3 ${isItemActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'}`}
              />
              <span className={`${!isOpen ? 'hidden' : ''}`}>{item.label}</span>
            </div>
            {hasChildren && isOpen && (
              <FontAwesomeIcon 
                icon={isExpanded ? faChevronDown : faChevronRight} 
                className={`w-3 h-3 transition-transform duration-200 ${isItemActive ? 'text-blue-600' : 'text-gray-400'}`}
              />
            )}
          </button>
        )}
        
        {hasChildren && isExpanded && isOpen && (
          <div className="mt-1 space-y-1">
            {item.children?.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-screen bg-white shadow-xl border-r border-gray-200 z-50 transition-all duration-300 flex flex-col ${
        isOpen ? 'w-80' : 'w-16'
      } lg:relative lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className={`flex items-center ${!isOpen ? 'justify-center w-full' : ''}`}>
            <img src={tiktokLogo} alt="TikTok Logo" className="w-8 h-8" />
            {isOpen && (
              <div className="ml-3">
                <h1 className="text-lg font-bold text-gray-900">TikTok Shop</h1>
                <p className="text-xs text-gray-500">Admin Panel</p>
              </div>
            )}
          </div>
          
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
          >
            <FontAwesomeIcon icon={isOpen ? faTimes : faBars} className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="px-3 space-y-2">
            {navItems.map(item => renderNavItem(item))}
          </nav>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-3">
          <div className={`flex items-center ${!isOpen ? 'justify-center' : 'justify-between'}`}>
            {isOpen && (
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <FontAwesomeIcon icon={faUserShield} className="w-4 h-4 text-white" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Admin User</p>
                  <p className="text-xs text-gray-500">System Administrator</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              {!isOpen && (
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <FontAwesomeIcon icon={faUserShield} className="w-4 h-4 text-white" />
                </div>
              )}
              
              <Link
                to="/"
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Back to Site"
              >
                <FontAwesomeIcon icon={faUserShield} className="w-4 h-4" />
              </Link>
              
              <button
                onClick={() => {
                  logout();
                }}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Logout"
              >
                <FontAwesomeIcon icon={faSignOutAlt} className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Toggle Button for Desktop */}
        <button
          onClick={onToggle}
          className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors hidden lg:flex"
        >
          <FontAwesomeIcon 
            icon={isOpen ? faChevronRight : faChevronRight} 
            className={`w-3 h-3 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>
    </>
  );
};

export default AdminSidebar;
