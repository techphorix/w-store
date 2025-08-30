import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCog,
  faGlobe,
  faBell,
  faShieldAlt,
  faCreditCard,
  faEnvelope,
  faDatabase,
  faUsers,
  faSave,
  faEdit,
  faToggleOn,
  faToggleOff,
  faCheckCircle,
  faExclamationTriangle,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import AdminLayout from '../../components/AdminLayout';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    general: {
      siteName: 'TikTok Shop',
      siteDescription: 'Multi-seller marketplace platform',
      adminEmail: 'admin@tiktokshop.com',
      timezone: 'UTC',
      language: 'en',
      currency: 'USD',
      maintenanceMode: false
    },
    notifications: {
      emailNotifications: true,
      orderNotifications: true,
      sellerRegistrations: true,
      systemAlerts: true,
      weeklyReports: true,
      marketingEmails: false
    },
    security: {
      twoFactorAuth: true,
      sessionTimeout: 30,
      passwordComplexity: true,
      loginAttempts: 5,
      ipWhitelisting: false
    },
    payments: {
      stripeEnabled: true,
      paypalEnabled: true,
      commissionRate: 15,
      minimumPayout: 50,
      payoutSchedule: 'weekly',
      taxCalculation: true
    },
    sellers: {
      autoApproval: false,
      productApproval: true,
      sellerCommission: 85,
      minimumProducts: 5,
      verificationRequired: true
    }
  });

  const tabs = [
    { id: 'general', label: 'General', icon: faCog },
    { id: 'notifications', label: 'Notifications', icon: faBell },
    { id: 'security', label: 'Security', icon: faShieldAlt },
    { id: 'payments', label: 'Payments', icon: faCreditCard },
    { id: 'sellers', label: 'sellers', icon: faUsers }
  ];

  const handleToggle = (section: string, key: string) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [key]: !prev[section as keyof typeof prev][key as keyof any]
      }
    }));
  };

  const handleInputChange = (section: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [key]: value
      }
    }));
  };

  const handleSave = () => {
    // Here you would save settings to the backend
    console.log('Saving settings:', settings);
    alert('Settings saved successfully!');
  };

  const renderToggle = (section: string, key: string, label: string, description?: string) => (
    <div className="flex items-center justify-between py-4 border-b border-gray-200 last:border-b-0">
      <div className="flex-1">
        <h4 className="text-sm font-medium text-gray-900">{label}</h4>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>
      <button
        onClick={() => handleToggle(section, key)}
        className={`ml-4 ${
          settings[section as keyof typeof settings][key as keyof any]
            ? 'text-blue-600'
            : 'text-gray-400'
        }`}
      >
        <FontAwesomeIcon 
          icon={settings[section as keyof typeof settings][key as keyof any] ? faToggleOn : faToggleOff} 
          className="text-2xl"
        />
      </button>
    </div>
  );

  const renderInput = (section: string, key: string, label: string, type = 'text', options?: string[]) => (
    <div className="py-4 border-b border-gray-200 last:border-b-0">
      <label className="block text-sm font-medium text-gray-900 mb-2">{label}</label>
      {options ? (
        <select
          value={settings[section as keyof typeof settings][key as keyof any]}
          onChange={(e) => handleInputChange(section, key, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {options.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={settings[section as keyof typeof settings][key as keyof any]}
          onChange={(e) => handleInputChange(section, key, type === 'number' ? Number(e.target.value) : e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      )}
    </div>
  );

  return (
    <AdminLayout
      title="TIKTOK SHOP ADMIN"
      subtitle="System Settings & Configuration"
    >
      {/* Page Title */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Settings</h2>
        <p className="text-gray-600">Configure platform settings and preferences</p>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="flex">
              {/* Sidebar */}
              <div className="w-64 bg-gray-50 border-r border-gray-200">
                <nav className="p-4 space-y-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <FontAwesomeIcon icon={tab.icon} className="text-sm" />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Content */}
              <div className="flex-1 p-6">
                {activeTab === 'general' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">General Settings</h3>
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          {renderInput('general', 'siteName', 'Site Name')}
                          {renderInput('general', 'adminEmail', 'Admin Email', 'email')}
                          {renderInput('general', 'timezone', 'Timezone', 'text', ['UTC', 'EST', 'PST', 'GMT'])}
                        </div>
                        <div>
                          {renderInput('general', 'language', 'Language', 'text', ['en', 'es', 'fr', 'de'])}
                          {renderInput('general', 'currency', 'Currency', 'text', ['USD', 'EUR', 'GBP', 'CAD'])}
                        </div>
                      </div>
                      <div>
                        {renderInput('general', 'siteDescription', 'Site Description')}
                        {renderToggle('general', 'maintenanceMode', 'Maintenance Mode', 'Enable to put the site in maintenance mode')}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'notifications' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Notification Settings</h3>
                    <div className="space-y-4">
                      {renderToggle('notifications', 'emailNotifications', 'Email Notifications', 'Receive email notifications for important events')}
                      {renderToggle('notifications', 'orderNotifications', 'Order Notifications', 'Get notified when new orders are placed')}
                      {renderToggle('notifications', 'sellerRegistrations', 'seller Registrations', 'Notifications for new seller registrations')}
                      {renderToggle('notifications', 'systemAlerts', 'System Alerts', 'Critical system alerts and warnings')}
                      {renderToggle('notifications', 'weeklyReports', 'Weekly Reports', 'Receive weekly performance reports')}
                      {renderToggle('notifications', 'marketingEmails', 'Marketing Emails', 'Promotional and marketing communications')}
                    </div>
                  </div>
                )}

                {activeTab === 'security' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Security Settings</h3>
                    <div className="space-y-4">
                      {renderToggle('security', 'twoFactorAuth', 'Two-Factor Authentication', 'Require 2FA for admin accounts')}
                      {renderToggle('security', 'passwordComplexity', 'Password Complexity', 'Enforce strong password requirements')}
                      {renderToggle('security', 'ipWhitelisting', 'IP Whitelisting', 'Restrict admin access to specific IP addresses')}
                      {renderInput('security', 'sessionTimeout', 'Session Timeout (minutes)', 'number')}
                      {renderInput('security', 'loginAttempts', 'Max Login Attempts', 'number')}
                    </div>
                  </div>
                )}

                {activeTab === 'payments' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Payment Settings</h3>
                    <div className="space-y-4">
                      {renderToggle('payments', 'stripeEnabled', 'Stripe Integration', 'Enable Stripe payment processing')}
                      {renderToggle('payments', 'paypalEnabled', 'PayPal Integration', 'Enable PayPal payment processing')}
                      {renderToggle('payments', 'taxCalculation', 'Tax Calculation', 'Automatically calculate taxes on orders')}
                      {renderInput('payments', 'commissionRate', 'Platform Commission Rate (%)', 'number')}
                      {renderInput('payments', 'minimumPayout', 'Minimum Payout Amount ($)', 'number')}
                      {renderInput('payments', 'payoutSchedule', 'Payout Schedule', 'text', ['daily', 'weekly', 'monthly'])}
                    </div>
                  </div>
                )}

                {activeTab === 'sellers' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">seller Settings</h3>
                    <div className="space-y-4">
                      {renderToggle('sellers', 'autoApproval', 'Auto-approve sellers', 'Automatically approve new seller registrations')}
                      {renderToggle('sellers', 'productApproval', 'Product Approval Required', 'Require admin approval for new products')}
                      {renderToggle('sellers', 'verificationRequired', 'seller Verification', 'Require identity verification for sellers')}
                      {renderInput('sellers', 'sellerCommission', 'seller Commission Rate (%)', 'number')}
                      {renderInput('sellers', 'minimumProducts', 'Minimum Products Required', 'number')}
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <button
                    onClick={handleSave}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FontAwesomeIcon icon={faSave} className="mr-2" />
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
          </div>

      {/* Quick Actions */}
      <div className="mt-8 grid md:grid-cols-3 gap-6">
        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200">
          <div className="flex items-center mb-4">
            <FontAwesomeIcon icon={faDatabase} className="text-2xl text-blue-600 mr-3" />
            <h4 className="text-lg font-semibold text-gray-900">Database</h4>
          </div>
          <p className="text-gray-600 mb-4">Manage database backups and maintenance</p>
          <button className="w-full bg-blue-50 text-blue-700 py-2 px-4 rounded-lg hover:bg-blue-100 transition-colors">
            Backup Database
          </button>
        </div>

        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200">
          <div className="flex items-center mb-4">
            <FontAwesomeIcon icon={faEnvelope} className="text-2xl text-green-600 mr-3" />
            <h4 className="text-lg font-semibold text-gray-900">Email Templates</h4>
          </div>
          <p className="text-gray-600 mb-4">Customize email templates and notifications</p>
          <button className="w-full bg-green-50 text-green-700 py-2 px-4 rounded-lg hover:bg-green-100 transition-colors">
            Manage Templates
          </button>
        </div>

        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200">
          <div className="flex items-center mb-4">
            <FontAwesomeIcon icon={faGlobe} className="text-2xl text-purple-600 mr-3" />
            <h4 className="text-lg font-semibold text-gray-900">Integrations</h4>
          </div>
          <p className="text-gray-600 mb-4">Configure third-party integrations and APIs</p>
          <button className="w-full bg-purple-50 text-purple-700 py-2 px-4 rounded-lg hover:bg-purple-100 transition-colors">
            View Integrations
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Settings;
