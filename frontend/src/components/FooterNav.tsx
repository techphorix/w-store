import { Link, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../contexts/AuthContext';
import { 
  faHome, 
  faTachometerAlt, 
  faChartLine, 
  faShoppingBag, 
  faUser 
} from '@fortawesome/free-solid-svg-icons';

const FooterNav = () => {
  const { shopname } = useParams<{ shopname: string }>();
  const { user } = useAuth();
  
  // Helper function to clean shopname (remove extra @ symbols)
  const cleanShopname = (name: string) => {
    return name ? name.replace(/^@+/, '') : name;
  };
  
  // Fallback shopname if not provided in URL
  const rawShopname = shopname || user?.businessInfo?.storeName || user?.fullName || 'default';
  const effectiveShopname = cleanShopname(rawShopname);

  const navItems = [
    {
      icon: faHome,
      label: 'Shop',
      path: `/shop/${effectiveShopname}`,
    },
    {
      icon: faTachometerAlt,
      label: 'Dashboard',
      path: `/dashboard/${effectiveShopname}`,
    },
    {
      icon: faChartLine,
      label: 'Financial',
      path: `/financial/${effectiveShopname}`,
    },
    {
      icon: faShoppingBag,
      label: 'Orders',
      path: `/orders/${effectiveShopname}`,
    },
    {
      icon: faUser,
      label: 'Profile',
      path: `/my/${effectiveShopname}`,
    },
  ];

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50">
      <nav className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="flex flex-col items-center py-2 px-3 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <FontAwesomeIcon icon={item.icon} className="text-lg mb-1" />
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
    </footer>
  );
};

export default FooterNav;
