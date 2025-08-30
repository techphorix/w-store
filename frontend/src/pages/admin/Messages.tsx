import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import AdminLayout from '../../components/AdminLayout';
import {
  faEnvelope,
  faInbox,
  faPaperPlane,
  faReply,
  faTrash,
  faStar,
  faSearch,
  faPlus,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';

const Messages = () => {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <AdminLayout title="TIKTOK SHOP ADMIN" subtitle="Message Management System">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Messages</h2>
        <p className="text-gray-600">Manage communications with sellers and users</p>
      </div>

      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-gray-200 text-center">
        <FontAwesomeIcon icon={faEnvelope} className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-600 mb-2">Message Center</h3>
        <p className="text-gray-500">Communication hub for admin messages and correspondence</p>
        <button className="mt-4 flex items-center mx-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          Compose Message
        </button>
      </div>
    </AdminLayout>
  );
};

export default Messages;
