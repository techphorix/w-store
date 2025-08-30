import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import AdminLayout from '../../components/AdminLayout';
import {
  faGlobe,
  faBullhorn,
  faPlus,
  faEdit,
  faTrash,
  faEye,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';

const Announcements = () => {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <AdminLayout title="TIKTOK SHOP ADMIN" subtitle="Announcement Management System">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Announcements</h2>
          <p className="text-gray-600">Manage platform-wide announcements and updates</p>
        </div>
        <button className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg">
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          Create Announcement
        </button>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-gray-200 text-center">
        <FontAwesomeIcon icon={faBullhorn} className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-600 mb-2">Announcement Center</h3>
        <p className="text-gray-500">Create and manage platform-wide announcements</p>
      </div>
    </AdminLayout>
  );
};

export default Announcements;
