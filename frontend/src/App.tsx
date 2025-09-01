import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { NotificationProvider } from './contexts/NotificationContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { SellerDataProvider } from './contexts/SellerDataContext';
import ImpersonationBanner from './components/ImpersonationBanner';
import ErrorBoundary from './components/ErrorBoundary';

// Landing Page
import Landing from './pages/Landing';

// Authentication Pages
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/user/Dashboard'));
const Products = lazy(() => import('./pages/user/Products'));
const Financial = lazy(() => import('./pages/user/Financial'));
const Orders = lazy(() => import('./pages/user/Orders'));
const Profile = lazy(() => import('./pages/user/Profile'));
const UserShop = lazy(() => import('./pages/user/UserShop'));
const Checkout = lazy(() => import('./pages/user/Checkout'));
const OrderTracking = lazy(() => import('./pages/user/OrderTracking'));
const ShopManagement = lazy(() => import('./pages/user/ShopManagement'));
const UserRegistration = lazy(() => import('./pages/Register'));
const RegistrationSuccess = lazy(() => import('./pages/RegistrationSuccess'));
const EmailVerification = lazy(() => import('./pages/EmailVerification'));
const ProductDetail = lazy(() => import('./pages/public/ProductDetail'));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AddProduct = lazy(() => import('./pages/admin/AddProduct'));
const CurrencyManagement = lazy(() => import('./pages/admin/CurrencyManagement'));
const CategoryManagement = lazy(() => import('./pages/admin/CategoryManagement'));
const ProductManagement = lazy(() => import('./pages/admin/ProductManagement'));
const AdminUserManagement = lazy(() => import('./pages/admin/UserManagement'));
const AdminShopControl = lazy(() => import('./pages/admin/ShopControl'));
const AdminAnalytics = lazy(() => import('./pages/admin/Analytics'));
const AdminOrders = lazy(() => import('./pages/admin/Orders'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));

// User Management Pages
const AllUsers = lazy(() => import('./pages/admin/AllUsers'));
const Sellers = lazy(() => import('./pages/admin/Sellers'));
const SellerDetails = lazy(() => import('./pages/admin/SellerDetails'));

const Admins = lazy(() => import('./pages/admin/Admins'));
const FinancialReports = lazy(() => import('./pages/admin/FinancialReports'));
const SystemMetrics = lazy(() => import('./pages/admin/SystemMetrics'));
const Notifications = lazy(() => import('./pages/admin/Notifications'));
const Messages = lazy(() => import('./pages/admin/Messages'));
const Announcements = lazy(() => import('./pages/admin/Announcements'));
const PaymentMethodsManagement = lazy(() => import('./pages/admin/PaymentMethodsManagement'));
const FinancialManagement = lazy(() => import('./pages/admin/FinancialManagement'));
const SystemTools = lazy(() => import('./pages/admin/SystemTools'));
const DatabaseManagement = lazy(() => import('./pages/admin/DatabaseManagement'));
const SellerComparisonTool = lazy(() => import('./components/SellerComparisonTool'));

// Loading Component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);



// Protected Route Component (for future authentication)
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  // This is where you would check authentication status
  // For now, we'll just return the children
  return <>{children}</>;
};

// Admin Route Component (prevents users from accessing admin panels, but allows admins even when impersonating)
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, originalUser, isImpersonating } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  // Check if user exists
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Check if current user is admin OR if original user (before impersonation) is admin
  const isAdmin = user.role === 'admin' || 
                  (isImpersonating && originalUser && originalUser.role === 'admin');
  
  if (!isAdmin) {
    // Redirect non-admin users to their dashboard
    const rawShopname = user?.businessInfo?.storeName || user?.fullName || 'default';
    const cleanShopname = rawShopname ? rawShopname.replace(/^@+/, '') : rawShopname;
    return <Navigate to={`/dashboard/${cleanShopname}`} replace />;
  }
  
  // Admin users should always be allowed to access admin routes
  return <>{children}</>;
};

// User-Only Route Component (prevents admins from accessing user panels unless impersonating)
const UserOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isImpersonating } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  // Check if user exists
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Allow admins to access user panels when impersonating
  if (user.role === 'admin' && !isImpersonating) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  
  return <>{children}</>;
};


// Not Found Component
const NotFound = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Page Not Found</h2>
      <p className="text-gray-600 mb-6">The page you're looking for doesn't exist.</p>
      <a 
        href="/" 
        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        Go Home
      </a>
    </div>
  </div>
);

function App() {
  return (
    <CurrencyProvider>
      <AuthProvider>
        <NotificationProvider>
          <Router>
          <div className="min-h-screen bg-gray-50">
            <ImpersonationBanner />
            <Suspense fallback={<LoadingSpinner />}>
            <Routes>
            {/* Landing Page */}
            <Route path="/" element={<Landing />} />
            
            {/* Authentication Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<UserRegistration />} />
            <Route path="/registration-success" element={<RegistrationSuccess />} />
            <Route path="/verify-email/:token" element={<EmailVerification />} />

            {/* Admin Routes */}
            
            {/* user Public Routes */}
            <Route 
              path="/shop/:shopname" 
              element={<UserShop />} 
            />
            <Route 
              path="/product/:id"
              element={<ProductDetail />}
            />
            <Route 
              path="/checkout/:shopname" 
              element={<Checkout />} 
            />
            <Route 
              path="/order/:orderId" 
              element={<OrderTracking />} 
            />
            
            {/* User Protected Routes (User-Only Access - Admins are redirected to admin panel) */}
            <Route 
              path="/dashboard/:shopname" 
              element={
                <UserOnlyRoute>
                  <ErrorBoundary>
                    <SellerDataProvider>
                      <Dashboard />
                    </SellerDataProvider>
                  </ErrorBoundary>
                </UserOnlyRoute>
              } 
            />
            <Route 
              path="/products/:shopname" 
              element={
                <UserOnlyRoute>
                  <ErrorBoundary>
                    <SellerDataProvider>
                      <Products />
                    </SellerDataProvider>
                  </ErrorBoundary>
                </UserOnlyRoute>
              } 
            />
            <Route 
              path="/financial/:shopname" 
              element={
                <UserOnlyRoute>
                  <ErrorBoundary>
                    <SellerDataProvider>
                      <Financial />
                    </SellerDataProvider>
                  </ErrorBoundary>
                </UserOnlyRoute>
              } 
            />
            <Route 
              path="/orders/:shopname" 
              element={
                <UserOnlyRoute>
                  <ErrorBoundary>
                    <SellerDataProvider>
                      <Orders />
                    </SellerDataProvider>
                  </ErrorBoundary>
                </UserOnlyRoute>
              } 
            />
            <Route 
              path="/my/:shopname" 
              element={
                <UserOnlyRoute>
                  <ErrorBoundary>
                    <SellerDataProvider>
                      <Profile />
                    </SellerDataProvider>
                  </ErrorBoundary>
                </UserOnlyRoute>
              } 
            />
            <Route 
              path="/shop-management/:shopname" 
              element={
                <UserOnlyRoute>
                  <ErrorBoundary>
                    <SellerDataProvider>
                      <ShopManagement />
                    </SellerDataProvider>
                  </ErrorBoundary>
                </UserOnlyRoute>
              } 
            />
            
            {/* Admin Routes - All protected */}
            <Route 
              path="/admin" 
              element={<Navigate to="/admin/dashboard" replace />} 
            />
            <Route 
              path="/admin/dashboard" 
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/user-management" 
              element={
                <AdminRoute>
                  <AdminUserManagement />
                </AdminRoute>
              } 
            />
            {/* New User Management Routes */}
            <Route 
              path="/admin/users" 
              element={
                <AdminRoute>
                  <AllUsers />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/sellers" 
              element={
                <AdminRoute>
                  <Sellers />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/sellers/:sellerId" 
              element={
                <AdminRoute>
                  <SellerDetails />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/shop-control" 
              element={
                <AdminRoute>
                  <AdminShopControl />
                </AdminRoute>
              } 
            />

            <Route 
              path="/admin/analytics" 
              element={
                <AdminRoute>
                  <AdminAnalytics />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/orders" 
              element={
                <AdminRoute>
                  <AdminOrders />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/settings" 
              element={
                <AdminRoute>
                  <AdminSettings />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/products" 
              element={
                <AdminRoute>
                  <AdminProducts />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/products/add" 
              element={
                <AdminRoute>
                  <AddProduct />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/currency" 
              element={
                <AdminRoute>
                  <CurrencyManagement />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/categories" 
              element={
                <AdminRoute>
                  <CategoryManagement />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/category-management" 
              element={
                <AdminRoute>
                  <CategoryManagement />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/product-management" 
              element={
                <AdminRoute>
                  <ProductManagement />
                </AdminRoute>
              } 
            />

            <Route 
              path="/admin/admins" 
              element={
                <AdminRoute>
                  <Admins />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/financial-reports" 
              element={
                <AdminRoute>
                  <FinancialReports />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/financial-management" 
              element={
                <AdminRoute>
                  <FinancialManagement />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/system-metrics" 
              element={
                <AdminRoute>
                  <SystemMetrics />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/payment-methods" 
              element={
                <AdminRoute>
                  <PaymentMethodsManagement />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/notifications" 
              element={
                <AdminRoute>
                  <Notifications />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/messages" 
              element={
                <AdminRoute>
                  <Messages />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/announcements" 
              element={
                <AdminRoute>
                  <Announcements />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/tools" 
              element={
                <AdminRoute>
                  <SystemTools />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/database" 
              element={
                <AdminRoute>
                  <DatabaseManagement />
                </AdminRoute>
              } 
            />
            
            {/* Redirect Routes for Convenience */}
            <Route path="/admin/*" element={<Navigate to="/admin/dashboard" replace />} />
            
            {/* Catch All Route - 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </div>
      </Router>
      </NotificationProvider>
    </AuthProvider>
    </CurrencyProvider>
  );
}

export default App;
