import React from 'react';
import AdminLayout from '../../components/AdminLayout';
import ProductManagement from '../../components/ProductManagement';

const ProductManagementPage: React.FC = () => {
  return (
    <AdminLayout>
      <ProductManagement />
    </AdminLayout>
  );
};

export default ProductManagementPage;
