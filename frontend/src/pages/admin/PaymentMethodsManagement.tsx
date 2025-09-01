import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCreditCard,
  faPlus,
  faEdit,
  faTrash,
  faEye,
  faEyeSlash,
  faSave,
  faTimes,
  faSpinner,
  faCheckCircle,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import AdminLayout from '../../components/AdminLayout';
import { adminApi } from '../../services/api';

interface PaymentMethod {
  id: string;
  name: string;
  type: 'deposit' | 'withdrawal' | 'both';
  description: string;
  icon: string;
  is_active: boolean;
  processing_time: string;
  min_amount: number;
  max_amount: number;
  fees_percentage: number;
  fees_fixed: number;
  requires_verification: boolean;
  verification_fields: any;
  created_at: string;
  updated_at: string;
  config?: any;
}

interface WithdrawalMethod {
  id: string;
  name: string;
  type: 'bank_transfer' | 'paypal' | 'stripe' | 'crypto' | 'check' | 'other';
  description: string;
  icon: string;
  is_active: boolean;
  processing_time: string;
  min_amount: number;
  max_amount: number;
  fees_percentage: number;
  fees_fixed: number;
  requires_verification: boolean;
  verification_fields: any;
  created_at: string;
  updated_at: string;
}

const PaymentMethodsManagement = () => {
  const [activeTab, setActiveTab] = useState<'payment' | 'withdrawal'>('payment');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [withdrawalMethods, setWithdrawalMethods] = useState<WithdrawalMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethod | null>(null);
  const [editingWithdrawalMethod, setEditingWithdrawalMethod] = useState<WithdrawalMethod | null>(null);
  
  // Form states
  const [paymentForm, setPaymentForm] = useState({
    name: '',
    type: 'both' as 'deposit' | 'withdrawal' | 'both',
    description: '',
    icon: '',
    processing_time: '1-3 business days',
    min_amount: 0,
    max_amount: 999999.99,
    fees_percentage: 0,
    fees_fixed: 0,
    requires_verification: false,
    verification_fields: {},
    config: {} as any
  });

  const [withdrawalForm, setWithdrawalForm] = useState({
    name: '',
    type: 'bank_transfer' as 'bank_transfer' | 'paypal' | 'stripe' | 'crypto' | 'check' | 'other',
    description: '',
    icon: '',
    processing_time: '1-3 business days',
    min_amount: 0,
    max_amount: 999999.99,
    fees_percentage: 0,
    fees_fixed: 0,
    requires_verification: false,
    verification_fields: {}
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [paymentResponse, withdrawalResponse] = await Promise.all([
        adminApi.getPaymentMethods(),
        adminApi.getWithdrawalMethods()
      ]);
      
      setPaymentMethods(paymentResponse.paymentMethods || []);
      setWithdrawalMethods(withdrawalResponse.withdrawalMethods || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPaymentMethod) {
        await adminApi.updatePaymentMethod(editingPaymentMethod.id, paymentForm);
      } else {
        await adminApi.createPaymentMethod(paymentForm);
      }
      
      setShowPaymentModal(false);
      setEditingPaymentMethod(null);
      resetPaymentForm();
      fetchData();
    } catch (error) {
      console.error('Error saving payment method:', error);
      setError('Failed to save payment method');
    }
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingWithdrawalMethod) {
        await adminApi.updateWithdrawalMethod(editingWithdrawalMethod.id, withdrawalForm);
      } else {
        await adminApi.createWithdrawalMethod(withdrawalForm);
      }
      
      setShowWithdrawalModal(false);
      setEditingWithdrawalMethod(null);
      resetWithdrawalForm();
      fetchData();
    } catch (error) {
      console.error('Error saving withdrawal method:', error);
      setError('Failed to save withdrawal method');
    }
  };

  const handleEditPayment = (method: PaymentMethod) => {
    setEditingPaymentMethod(method);
    setPaymentForm({
      name: method.name,
      type: method.type,
      description: method.description,
      icon: method.icon,
      processing_time: method.processing_time,
      min_amount: method.min_amount,
      max_amount: method.max_amount,
      fees_percentage: method.fees_percentage,
      fees_fixed: method.fees_fixed,
      requires_verification: method.requires_verification,
      verification_fields: method.verification_fields,
      config: (() => { try { return typeof (method as any).config === 'string' ? JSON.parse((method as any).config) : (method as any).config || {}; } catch { return {}; } })()
    });
    setShowPaymentModal(true);
  };

  const handleEditWithdrawal = (method: WithdrawalMethod) => {
    setEditingWithdrawalMethod(method);
    setWithdrawalForm({
      name: method.name,
      type: method.type,
      description: method.description,
      icon: method.icon,
      processing_time: method.processing_time,
      min_amount: method.min_amount,
      max_amount: method.max_amount,
      fees_percentage: method.fees_percentage,
      fees_fixed: method.fees_fixed,
      requires_verification: method.requires_verification,
      verification_fields: method.verification_fields
    });
    setShowWithdrawalModal(true);
  };

  const handleDeletePayment = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this payment method?')) {
      try {
        await adminApi.deletePaymentMethod(id);
        fetchData();
      } catch (error) {
        console.error('Error deleting payment method:', error);
        setError('Failed to delete payment method');
      }
    }
  };

  const handleDeleteWithdrawal = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this withdrawal method?')) {
      try {
        await adminApi.deleteWithdrawalMethod(id);
        fetchData();
      } catch (error) {
        console.error('Error deleting withdrawal method:', error);
        setError('Failed to delete withdrawal method');
      }
    }
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      name: '',
      type: 'both',
      description: '',
      icon: '',
      processing_time: '1-3 business days',
      min_amount: 0,
      max_amount: 999999.99,
      fees_percentage: 0,
      fees_fixed: 0,
      requires_verification: false,
      verification_fields: {},
      config: {}
    });
  };

  const resetWithdrawalForm = () => {
    setWithdrawalForm({
      name: '',
      type: 'bank_transfer',
      description: '',
      icon: '',
      processing_time: '1-3 business days',
      min_amount: 0,
      max_amount: 999999.99,
      fees_percentage: 0,
      fees_fixed: 0,
      requires_verification: false,
      verification_fields: {}
    });
  };

  const openPaymentModal = () => {
    setEditingPaymentMethod(null);
    resetPaymentForm();
    setShowPaymentModal(true);
  };

  const openWithdrawalModal = () => {
    setEditingWithdrawalMethod(null);
    resetWithdrawalForm();
    setShowWithdrawalModal(true);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <FontAwesomeIcon icon={faSpinner} className="fa-spin text-4xl text-blue-600" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Payment Methods Management</h1>
          <p className="text-gray-600 mt-2">Manage payment and withdrawal methods for your platform</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-400 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('payment')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'payment'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Payment Methods
            </button>
            <button
              onClick={() => setActiveTab('withdrawal')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'withdrawal'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Withdrawal Methods
            </button>
          </nav>
        </div>

        {/* Payment Methods Tab */}
        {activeTab === 'payment' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Payment Methods</h2>
              <button
                onClick={openPaymentModal}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                Add Payment Method
              </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Processing Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fees
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Config
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paymentMethods.map((method) => (
                    <tr key={method.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                              <FontAwesomeIcon icon={faCreditCard} className="text-gray-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{method.name}</div>
                            <div className="text-sm text-gray-500">{method.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          method.type === 'both' ? 'bg-purple-100 text-purple-800' :
                          method.type === 'deposit' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {method.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {method.processing_time}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {method.fees_percentage > 0 && `${method.fees_percentage}%`}
                        {method.fees_fixed > 0 && method.fees_percentage > 0 && ' + '}
                        {method.fees_fixed > 0 && `$${method.fees_fixed}`}
                        {method.fees_percentage === 0 && method.fees_fixed === 0 && 'No fees'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-700">
                        {(() => { try { const cfg = (method as any).config ? (typeof (method as any).config === 'string' ? JSON.parse((method as any).config) : (method as any).config) : null; return cfg?.kind || '—'; } catch { return '—'; } })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          method.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {method.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEditPayment(method)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                        <button
                          onClick={() => handleDeletePayment(method.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Withdrawal Methods Tab */}
        {activeTab === 'withdrawal' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Withdrawal Methods</h2>
              <button
                onClick={openWithdrawalModal}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                Add Withdrawal Method
              </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Processing Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fees
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {withdrawalMethods.map((method) => (
                    <tr key={method.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                              <FontAwesomeIcon icon={faCreditCard} className="text-gray-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{method.name}</div>
                            <div className="text-sm text-gray-500">{method.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          {method.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {method.processing_time}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {method.fees_percentage > 0 && `${method.fees_percentage}%`}
                        {method.fees_fixed > 0 && method.fees_percentage > 0 && ' + '}
                        {method.fees_fixed > 0 && `$${method.fees_fixed}`}
                        {method.fees_percentage === 0 && method.fees_fixed === 0 && 'No fees'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          method.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {method.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEditWithdrawal(method)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                        <button
                          onClick={() => handleDeleteWithdrawal(method.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payment Method Modal */}
        {showPaymentModal && (
          <>
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingPaymentMethod ? 'Edit Payment Method' : 'Add Payment Method'}
                </h3>
                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={paymentForm.name}
                      onChange={(e) => setPaymentForm({...paymentForm, name: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <select
                      value={paymentForm.type}
                      onChange={(e) => setPaymentForm({...paymentForm, type: e.target.value as any})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="deposit">Deposit Only</option>
                      <option value="withdrawal">Withdrawal Only</option>
                      <option value="both">Both</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      value={paymentForm.description}
                      onChange={(e) => setPaymentForm({...paymentForm, description: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                    />
                  </div>

          <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Min Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        value={paymentForm.min_amount}
                        onChange={(e) => setPaymentForm({...paymentForm, min_amount: parseFloat(e.target.value)})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Max Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        value={paymentForm.max_amount}
                        onChange={(e) => setPaymentForm({...paymentForm, max_amount: parseFloat(e.target.value)})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Fees %</label>
                      <input
                        type="number"
                        step="0.01"
                        value={paymentForm.fees_percentage}
                        onChange={(e) => setPaymentForm({...paymentForm, fees_percentage: parseFloat(e.target.value)})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Fixed Fees</label>
                      <input
                        type="number"
                        step="0.01"
                        value={paymentForm.fees_fixed}
                        onChange={(e) => setPaymentForm({...paymentForm, fees_fixed: parseFloat(e.target.value)})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="requires_verification"
                      checked={paymentForm.requires_verification}
                      onChange={(e) => setPaymentForm({...paymentForm, requires_verification: e.target.checked})}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="requires_verification" className="ml-2 block text-sm text-gray-900">
                      Requires verification
                    </label>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowPaymentModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                    >
                      {editingPaymentMethod ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Config Helper */}
          <div className="border border-gray-200 rounded-md p-3">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Config (JSON)</label>
              <div className="space-x-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPaymentForm({
                    ...paymentForm,
                    config: { kind: 'binance', qrImageUrl: '', id: '', link: '' }
                  })}
                  className="px-2 py-1 border rounded hover:bg-gray-50"
                >Binance preset</button>
                <button
                  type="button"
                  onClick={() => setPaymentForm({
                    ...paymentForm,
                    config: { kind: 'bank', accountTitle: '', accountNumber: '', bankName: '' }
                  })}
                  className="px-2 py-1 border rounded hover:bg-gray-50"
                >Bank preset</button>
              </div>
            </div>
            <textarea
              value={JSON.stringify(paymentForm.config || {}, null, 2)}
              onChange={(e) => {
                try {
                  const val = JSON.parse(e.target.value);
                  setPaymentForm({...paymentForm, config: val});
                } catch (_) {
                  // ignore parse error while typing
                }
              }}
              rows={6}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-xs focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            {/* Preview */}
            <div className="mt-2 text-xs text-gray-600">
              {paymentForm.config?.kind === 'binance' && (
                <div>Binance: {paymentForm.config.id || 'ID N/A'} {paymentForm.config.link ? `(${paymentForm.config.link})` : ''}</div>
              )}
              {paymentForm.config?.kind === 'bank' && (
                <div>Bank: {paymentForm.config.accountTitle || 'Title'} • {paymentForm.config.accountNumber || 'Account'} • {paymentForm.config.bankName || 'Bank'}</div>
              )}
            </div>
          </div>
          </>
        )}

        {/* Withdrawal Method Modal */}
        {showWithdrawalModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingWithdrawalMethod ? 'Edit Withdrawal Method' : 'Add Withdrawal Method'}
                </h3>
                <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={withdrawalForm.name}
                      onChange={(e) => setWithdrawalForm({...withdrawalForm, name: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <select
                      value={withdrawalForm.type}
                      onChange={(e) => setWithdrawalForm({...withdrawalForm, type: e.target.value as any})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="paypal">PayPal</option>
                      <option value="stripe">Stripe</option>
                      <option value="crypto">Crypto</option>
                      <option value="check">Check</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      value={withdrawalForm.description}
                      onChange={(e) => setWithdrawalForm({...withdrawalForm, description: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                    />
                  </div>

          <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Min Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        value={withdrawalForm.min_amount}
                        onChange={(e) => setWithdrawalForm({...withdrawalForm, min_amount: parseFloat(e.target.value)})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Max Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        value={withdrawalForm.max_amount}
                        onChange={(e) => setWithdrawalForm({...withdrawalForm, max_amount: parseFloat(e.target.value)})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Fees %</label>
                      <input
                        type="number"
                        step="0.01"
                        value={withdrawalForm.fees_percentage}
                        onChange={(e) => setWithdrawalForm({...withdrawalForm, fees_percentage: parseFloat(e.target.value)})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Fixed Fees</label>
                      <input
                        type="number"
                        step="0.01"
                        value={withdrawalForm.fees_fixed}
                        onChange={(e) => setWithdrawalForm({...withdrawalForm, fees_fixed: parseFloat(e.target.value)})}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="requires_verification_withdrawal"
                      checked={withdrawalForm.requires_verification}
                      onChange={(e) => setWithdrawalForm({...withdrawalForm, requires_verification: e.target.checked})}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="requires_verification_withdrawal" className="ml-2 block text-sm text-gray-900">
                      Requires verification
                    </label>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowWithdrawalModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                    >
                      {editingWithdrawalMethod ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default PaymentMethodsManagement;
