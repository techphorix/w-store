import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faEdit, 
  faTrash, 
  faPlus, 
  faCheck, 
  faTimes,
  faSpinner,
  faSort,
  faSortUp,
  faSortDown
} from '@fortawesome/free-solid-svg-icons';

interface Column {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'select' | 'date' | 'email';
  options?: { value: string; label: string }[];
  sortable?: boolean;
  editable?: boolean;
  required?: boolean;
  width?: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface EditableTableProps {
  data: any[];
  columns: Column[];
  onSave: (id: string | number, data: any) => Promise<void>;
  onDelete?: (id: string | number) => Promise<void>;
  onCreate?: (data: any) => Promise<void>;
  idField?: string;
  className?: string;
  pageSize?: number;
  searchable?: boolean;
  selectable?: boolean;
  onSelectionChange?: (selectedIds: (string | number)[]) => void;
  actions?: (row: any) => React.ReactNode;
}

const EditableTable: React.FC<EditableTableProps> = ({
  data,
  columns,
  onSave,
  onDelete,
  onCreate,
  idField = 'id',
  className = '',
  pageSize = 10,
  searchable = true,
  selectable = false,
  onSelectionChange,
  actions
}) => {
  const [editingRow, setEditingRow] = useState<string | number | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [loading, setLoading] = useState<Set<string | number>>(new Set());
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Set<string | number>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [createData, setCreateData] = useState<any>({});

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!sortConfig) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  // Filter data
  const filteredData = React.useMemo(() => {
    if (!searchTerm) return sortedData;
    
    return sortedData.filter(row =>
      columns.some(col => {
        const value = row[col.key];
        return value?.toString().toLowerCase().includes(searchTerm.toLowerCase());
      })
    );
  }, [sortedData, searchTerm, columns]);

  // Paginate data
  const paginatedData = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return current.direction === 'asc' 
          ? { key, direction: 'desc' }
          : null;
      }
      return { key, direction: 'asc' };
    });
  };

  const handleEdit = (row: any) => {
    const id = row[idField];
    setEditingRow(id);
    setEditData({ ...row });
    setErrors({});
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditData({});
    setErrors({});
  };

  const handleSaveEdit = async () => {
    if (!editingRow) return;

    // Validate required fields
    const validationErrors: { [key: string]: string } = {};
    columns.forEach(col => {
      if (col.required && col.editable && (!editData[col.key] || editData[col.key].toString().trim() === '')) {
        validationErrors[col.key] = `${col.label} is required`;
      }
    });

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setLoading(prev => new Set(prev).add(editingRow));
      await onSave(editingRow, editData);
      setEditingRow(null);
      setEditData({});
      setErrors({});
    } catch (error: any) {
      setErrors({ general: error.message || 'Failed to save changes' });
    } finally {
      setLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(editingRow);
        return newSet;
      });
    }
  };

  const handleDelete = async (row: any) => {
    if (!onDelete) return;
    
    const id = row[idField];
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        setLoading(prev => new Set(prev).add(id));
        await onDelete(id);
      } catch (error: any) {
        alert(error.message || 'Failed to delete item');
      } finally {
        setLoading(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }
    }
  };

  const handleRowSelection = (id: string | number, checked: boolean) => {
    const newSelection = new Set(selectedRows);
    if (checked) {
      newSelection.add(id);
    } else {
      newSelection.delete(id);
    }
    setSelectedRows(newSelection);
    onSelectionChange?.(Array.from(newSelection));
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(paginatedData.map(row => row[idField]));
      setSelectedRows(allIds);
      onSelectionChange?.(Array.from(allIds));
    } else {
      setSelectedRows(new Set());
      onSelectionChange?.([]);
    }
  };

  const handleCreate = async () => {
    if (!onCreate) return;

    // Validate required fields
    const validationErrors: { [key: string]: string } = {};
    columns.forEach(col => {
      if (col.required && (!createData[col.key] || createData[col.key].toString().trim() === '')) {
        validationErrors[col.key] = `${col.label} is required`;
      }
    });

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setLoading(prev => new Set(prev).add('create'));
      await onCreate(createData);
      setIsCreating(false);
      setCreateData({});
      setErrors({});
    } catch (error: any) {
      setErrors({ general: error.message || 'Failed to create item' });
    } finally {
      setLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete('create');
        return newSet;
      });
    }
  };

  const renderCell = (row: any, column: Column, isEditing: boolean) => {
    const value = isEditing ? (editData[column.key] ?? '') : row[column.key];
    const isEditingThisRow = editingRow === row[idField];
    const cellLoading = loading.has(row[idField]);

    if (column.render && !isEditingThisRow) {
      return column.render(value, row);
    }

    if (isEditingThisRow && column.editable) {
      const hasError = errors[column.key];
      
      if (column.type === 'select' && column.options) {
        return (
          <div>
            <select
              value={value}
              onChange={(e) => setEditData(prev => ({ ...prev, [column.key]: e.target.value }))}
              className={`w-full px-2 py-1 border rounded text-sm ${hasError ? 'border-red-500' : 'border-gray-300'}`}
              disabled={cellLoading}
            >
              <option value="">Select...</option>
              {column.options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {hasError && <span className="text-red-500 text-xs">{hasError}</span>}
          </div>
        );
      }

      return (
        <div>
          <input
            type={column.type || 'text'}
            value={value}
            onChange={(e) => setEditData(prev => ({ 
              ...prev, 
              [column.key]: column.type === 'number' ? Number(e.target.value) : e.target.value 
            }))}
            className={`w-full px-2 py-1 border rounded text-sm ${hasError ? 'border-red-500' : 'border-gray-300'}`}
            disabled={cellLoading}
          />
          {hasError && <span className="text-red-500 text-xs">{hasError}</span>}
        </div>
      );
    }

    return <span className="text-sm">{value}</span>;
  };

  const renderCreateRow = () => {
    if (!isCreating) return null;

    return (
      <tr className="bg-blue-50">
        {selectable && <td className="px-4 py-2"></td>}
        {columns.map(column => (
          <td key={column.key} className="px-4 py-2">
            {column.type === 'select' && column.options ? (
              <select
                value={createData[column.key] || ''}
                onChange={(e) => setCreateData(prev => ({ ...prev, [column.key]: e.target.value }))}
                className={`w-full px-2 py-1 border rounded text-sm ${errors[column.key] ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">Select...</option>
                {column.options.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={column.type || 'text'}
                value={createData[column.key] || ''}
                onChange={(e) => setCreateData(prev => ({ 
                  ...prev, 
                  [column.key]: column.type === 'number' ? Number(e.target.value) : e.target.value 
                }))}
                className={`w-full px-2 py-1 border rounded text-sm ${errors[column.key] ? 'border-red-500' : 'border-gray-300'}`}
                placeholder={column.label}
              />
            )}
            {errors[column.key] && <span className="text-red-500 text-xs">{errors[column.key]}</span>}
          </td>
        ))}
        <td className="px-4 py-2">
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={loading.has('create')}
              className="p-1 text-green-600 hover:bg-green-100 rounded"
            >
              {loading.has('create') ? (
                <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" />
              ) : (
                <FontAwesomeIcon icon={faCheck} className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setCreateData({});
                setErrors({});
              }}
              className="p-1 text-red-600 hover:bg-red-100 rounded"
            >
              <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header with search and create button */}
      <div className="p-4 border-b flex justify-between items-center">
        <div className="flex items-center gap-4">
          {searchable && (
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
          {selectedRows.size > 0 && (
            <span className="text-sm text-gray-600">
              {selectedRows.size} item(s) selected
            </span>
          )}
        </div>
        {onCreate && (
          <button
            onClick={() => setIsCreating(true)}
            disabled={isCreating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
            Add New
          </button>
        )}
      </div>

      {/* Error display */}
      {errors.general && (
        <div className="px-4 py-2 bg-red-50 border-b">
          <p className="text-red-600 text-sm">{errors.general}</p>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {selectable && (
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded"
                  />
                </th>
              )}
              {columns.map(column => (
                <th 
                  key={column.key} 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ width: column.width }}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable && (
                      <button
                        onClick={() => handleSort(column.key)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <FontAwesomeIcon 
                          icon={
                            sortConfig?.key === column.key
                              ? sortConfig.direction === 'asc' ? faSortUp : faSortDown
                              : faSort
                          } 
                          className="w-3 h-3" 
                        />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {renderCreateRow()}
            {paginatedData.map(row => {
              const id = row[idField];
              const isEditingThisRow = editingRow === id;
              const isLoading = loading.has(id);
              
              return (
                <tr key={id} className={isEditingThisRow ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                  {selectable && (
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(id)}
                        onChange={(e) => handleRowSelection(id, e.target.checked)}
                        className="rounded"
                      />
                    </td>
                  )}
                  {columns.map(column => (
                    <td key={column.key} className="px-4 py-2">
                      {renderCell(row, column, isEditingThisRow)}
                    </td>
                  ))}
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      {isEditingThisRow ? (
                        <>
                          <button
                            onClick={handleSaveEdit}
                            disabled={isLoading}
                            className="p-1 text-green-600 hover:bg-green-100 rounded"
                          >
                            {isLoading ? (
                              <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin" />
                            ) : (
                              <FontAwesomeIcon icon={faCheck} className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={isLoading}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                          >
                            <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(row)}
                            disabled={isLoading}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                          >
                            <FontAwesomeIcon icon={faEdit} className="w-4 h-4" />
                          </button>
                          {onDelete && (
                            <button
                              onClick={() => handleDelete(row)}
                              disabled={isLoading}
                              className="p-1 text-red-600 hover:bg-red-100 rounded"
                            >
                              <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                            </button>
                          )}
                          {actions && actions(row)}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} results
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditableTable;
