import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faSearch } from '@fortawesome/free-solid-svg-icons';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showSearch?: boolean;
  showNotifications?: boolean;
}

const Header = ({ title, subtitle, showSearch = false, showNotifications = false }: HeaderProps) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
        
        <div className="flex items-center space-x-3">
          {showSearch && (
            <button className="p-2 text-gray-600 hover:text-blue-600 transition-colors">
              <FontAwesomeIcon icon={faSearch} />
            </button>
          )}
          
          {showNotifications && (
            <button className="p-2 text-gray-600 hover:text-blue-600 transition-colors relative">
              <FontAwesomeIcon icon={faBell} />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                3
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
