import React from 'react';
import AdminLayout from '../../components/AdminLayout';
import CategoryManagement from '../../components/CategoryManagement';

const CategoryManagementPage: React.FC = () => {
  return (
    <AdminLayout>
      <CategoryManagement />
    </AdminLayout>
  );
};

export default CategoryManagementPage;
