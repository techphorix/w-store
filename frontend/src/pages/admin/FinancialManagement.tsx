import React, { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { adminApi } from '../../services/api';

type Deposit = {
  id: string;
  seller_id: string;
  seller_name?: string;
  method_id: string | null;
  method_name?: string | null;
  amount: number;
  currency: string;
  screenshot_url?: string | null;
  screenshot_mimetype?: string | null;
  file_url?: string | null;
  reference?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_note?: string | null;
  created_at: string;
};

type Pagination = { page: number; limit: number; total: number; pages: number };

const STATUS_OPTIONS: Array<Deposit['status'] | 'all'> = ['all', 'pending', 'approved', 'rejected'];

const backendBase = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:5000';

const FinancialManagement: React.FC = () => {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [statusFilter, setStatusFilter] = useState<Deposit['status'] | 'all'>('pending');
  const [selected, setSelected] = useState<Deposit | null>(null);
  const [action, setAction] = useState<null | { type: 'approve' | 'reject'; note: string }>({ type: 'approve', note: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);

  const buildFileUrl = (raw?: string | null) => {
    if (!raw) return '';
    // Normalize backslashes and strip any local path prefixes
    let p = String(raw).replace(/\\/g, '/');
    const idx = p.toLowerCase().lastIndexOf('/uploads/');
    if (idx >= 0) p = p.slice(idx); // ensure it begins with /uploads/
    if (!p.startsWith('/uploads/')) {
      // try to coerce into uploads path
      if (p.startsWith('uploads/')) p = '/' + p;
      else p = '/uploads/' + p.replace(/^\/+/, '');
    }
    // Prefer configured backend base
    return `${backendBase}${p}`;
  };

  const summary = useMemo(() => {
    const s = { total: deposits.length, pending: 0, approved: 0, rejected: 0, amountTotal: 0 };
    for (const d of deposits) {
      s.amountTotal += Number(d.amount || 0);
      if (d.status === 'pending') s.pending += 1;
      if (d.status === 'approved') s.approved += 1;
      if (d.status === 'rejected') s.rejected += 1;
    }
    return s;
  }, [deposits]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.listManualDeposits({ page, limit, status: statusFilter === 'all' ? undefined : statusFilter });
      setDeposits(res.deposits || []);
      setPagination(res.pagination || null);
    } catch (e) {
      console.error('Failed to load deposits', e);
      alert('Failed to load deposits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [page, statusFilter]);

  const openDetails = async (d: Deposit) => {
    try {
      const res = await adminApi.getManualDeposit(d.id);
      setSelected(res.deposit || d);
      setAction({ type: 'approve', note: '' });
    } catch (e) {
      setSelected(d);
    }
  };

  const runAction = async () => {
    if (!selected || !action) return;
    setActionLoading(true);
    try {
      const newStatus = action.type === 'approve' ? 'approved' : 'rejected';
      await adminApi.updateManualDepositStatus(selected.id, newStatus as any, action.note || undefined);
      setSelected(null);
      await load();
    } catch (e) {
      console.error('Failed to update deposit', e);
      alert('Failed to update deposit');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminLayout title="Financial Management" subtitle="Review and manage manual deposits">
      <div className="mb-4 flex items-center justify-end">
        <a href="/admin/payment-methods" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Manage Payment Methods</a>
      </div>
      {/* Filters + Summary */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => { setPage(1); setStatusFilter(s as any); }}
              className={`px-3 py-1.5 rounded-full text-sm border ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <span className="text-sm text-gray-500 ml-2">Page {pagination?.page || 1} of {pagination?.pages || 1}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard label="Total on page" value={summary.total.toString()} />
          <StatCard label="Pending" value={summary.pending.toString()} />
          <StatCard label="Approved" value={summary.approved.toString()} />
          <StatCard label="Amount (page)" value={`$${summary.amountTotal.toFixed(2)}`} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <Th>Submitted</Th>
                <Th>Seller</Th>
                <Th align="right">Amount</Th>
                <Th>Method</Th>
                <Th>Reference</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading && (
                <tr><td colSpan={7} className="p-6 text-center text-gray-500">Loading...</td></tr>
              )}
              {!loading && deposits.length === 0 && (
                <tr><td colSpan={7} className="p-6 text-center text-gray-500">No deposits found</td></tr>
              )}
              {!loading && deposits.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <Td>{new Date(d.created_at).toLocaleString()}</Td>
                  <Td>{d.seller_name || d.seller_id}</Td>
                  <Td align="right">${Number(d.amount).toFixed(2)} {d.currency || 'USD'}</Td>
                  <Td>{d.method_name || '—'}</Td>
                  <Td title={d.reference || ''}>{d.reference || '—'}</Td>
                  <Td>
                    <span className={`px-2 py-1 text-xs rounded-full ${d.status === 'approved' ? 'bg-green-100 text-green-700' : d.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-800'}`}>
                      {d.status}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openDetails(d)} className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50">View</button>
                      {d.screenshot_url && (
                        <a className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50" href={buildFileUrl(d.screenshot_url)} target="_blank" rel="noreferrer">Screenshot</a>
                      )}
                      {d.status === 'pending' && (
                        <>
                          <button onClick={() => { setSelected(d); setAction({ type: 'approve', note: '' }); }} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">Approve</button>
                          <button onClick={() => { setSelected(d); setAction({ type: 'reject', note: '' }); }} className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Reject</button>
                        </>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg disabled:opacity-50">Previous</button>
          <div className="text-sm text-gray-600">Page {pagination?.page || 1} of {pagination?.pages || 1}</div>
          <button disabled={!!pagination && page >= (pagination.pages || 1)} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg disabled:opacity-50">Next</button>
        </div>
      </div>

      {/* Details / Action Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-3xl rounded-xl shadow-xl overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Deposit Details</h3>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Detail label="Seller" value={selected.seller_name || selected.seller_id} />
                <Detail label="Amount" value={`$${Number(selected.amount).toFixed(2)} ${selected.currency || 'USD'}`} />
                <Detail label="Method" value={selected.method_name || '—'} />
                <Detail label="Reference" value={selected.reference || '—'} />
                <Detail label="Submitted" value={new Date(selected.created_at).toLocaleString()} />
                <Detail label="Status" value={selected.status} />
              </div>
              <div>
                {selected.screenshot_url || selected.file_url ? (
                  (() => {
                    const raw = selected.file_url || selected.screenshot_url || '';
                    const src = buildFileUrl(raw);
                    const mime = (selected.screenshot_mimetype || '').toLowerCase();
                    const isImageByMime = mime.startsWith('image/');
                    const isImageByExt = /\.(png|jpe?g|webp|gif)$/i.test(src);
                    const isPdfByMime = mime === 'application/pdf';
                    const isPdfByExt = /\.pdf$/i.test(src);
                    const isImage = isImageByMime || isImageByExt;
                    const isPdf = isPdfByMime || isPdfByExt;

                    if (isImage) {
                      return (
                        <img
                          src={src}
                          alt="Deposit Screenshot"
                          className="w-full h-72 object-contain bg-gray-50 border rounded-lg cursor-zoom-in"
                          onClick={() => setZoomSrc(src)}
                          onError={(e) => {
                            // Fallback: replace with link if image fails to load
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              const a = document.createElement('a');
                              a.href = src;
                              a.target = '_blank';
                              a.rel = 'noreferrer';
                              a.textContent = 'Open uploaded file';
                              a.className = 'block w-full h-72 bg-gray-50 border rounded-lg text-blue-600 hover:underline flex items-center justify-center';
                              parent.replaceChildren(a);
                            }
                          }}
                        />
                      );
                    }
                    if (isPdf) {
                      return (
                        <object data={src} type="application/pdf" className="w-full h-72 bg-gray-50 border rounded-lg">
                          <a href={src} target="_blank" rel="noreferrer" className="block w-full h-full text-blue-600 hover:underline flex items-center justify-center">
                            Open uploaded file
                          </a>
                        </object>
                      );
                    }
                    return (
                      <a href={src} target="_blank" rel="noreferrer" className="block w-full h-72 bg-gray-50 border rounded-lg text-blue-600 hover:underline flex items-center justify-center">
                        Open uploaded file
                      </a>
                    );
                  })()
                ) : (
                  <div className="w-full h-72 flex items-center justify-center bg-gray-50 border rounded-lg text-gray-500">No screenshot</div>
                )}
              </div>
            </div>
            {selected.status === 'pending' && action && (
              <div className="px-6 pb-6">
                <div className="mb-2 text-sm text-gray-700">Admin note (optional)</div>
                <textarea value={action.note} onChange={e => setAction({ ...action, note: e.target.value })} className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} placeholder={`Add a note for why you ${action.type} this deposit`} />
                <div className="mt-4 flex items-center gap-3 justify-end">
                  <button onClick={() => setSelected(null)} className="px-4 py-2 rounded-lg border border-gray-300 bg-white">Cancel</button>
                  <button disabled={actionLoading} onClick={runAction} className={`px-4 py-2 rounded-lg text-white ${action.type === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-50`}>
                    {actionLoading ? 'Processing...' : action.type === 'approve' ? 'Approve Deposit' : 'Reject Deposit'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {zoomSrc && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[60]" onClick={() => setZoomSrc(null)}>
          <img src={zoomSrc} alt="Preview" className="max-w-full max-h-full rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
          <button onClick={() => setZoomSrc(null)} className="absolute top-4 right-4 text-white bg-black/50 rounded-full w-10 h-10 flex items-center justify-center text-xl">×</button>
        </div>
      )}
    </AdminLayout>
  );
};

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
    <div className="text-sm text-gray-500">{label}</div>
    <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
  </div>
);

const Th = ({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) => (
  <th className={`px-4 py-3 text-xs font-semibold text-gray-600 tracking-wider uppercase ${align === 'right' ? 'text-right' : 'text-left'}`}>{children}</th>
);

const Td = ({ children, align }: { children: React.ReactNode; align?: 'left' | 'right' }) => (
  <td className={`px-4 py-3 text-sm ${align === 'right' ? 'text-right' : 'text-left'} text-gray-800`}>{children}</td>
);

const Detail = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <div className="mb-3">
    <div className="text-xs text-gray-500">{label}</div>
    <div className="text-sm font-medium text-gray-900">{value}</div>
  </div>
);

export default FinancialManagement;
