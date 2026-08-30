import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, Search, X, ChevronRight, ArrowLeft, ShieldCheck, 
  RefreshCw, CheckCircle2, ChevronLeft, FileText, AlertCircle, Lock
} from 'lucide-react';
import axios from 'axios';
import { useTheme } from '../../context/ThemeContext';
import { formatIndianRupee } from '../../utils/currency';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

interface TableMeta {
  name: string;
  displayName: string;
  recordCount: number;
  verified: boolean;
}

interface ColumnMeta {
  name: string;
  label: string;
  type: string; // 'string' | 'number' | 'currency' | 'date' | 'boolean'
}

interface PaginationMeta {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

interface TableRecordsPayload {
  table: string;
  displayName: string;
  columns: ColumnMeta[];
  records: any[];
  pagination: PaginationMeta;
}

interface DatabaseRecordExplorerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialTotalRecords?: number;
}

// ── LOCAL DEVICE TIME FORMATTER ─────────────────────────────────────────────
function formatLocalTimestamp(dateInput?: string | number | null): string {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  return d.toLocaleString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function DatabaseRecordExplorerDrawer({
  isOpen,
  onClose,
  initialTotalRecords
}: DatabaseRecordExplorerDrawerProps) {
  const { themeData } = useTheme();

  // Navigation Level State
  // selectedTable === null -> Level 1: Table List
  // selectedTable !== null -> Level 2: Record Ledger
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  
  // Level 3: Record Detail View Modal inside Drawer
  const [selectedRecordDetail, setSelectedRecordDetail] = useState<any | null>(null);

  // Metadata State
  const [loadingTables, setLoadingTables] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);
  const [tablesList, setTablesList] = useState<TableMeta[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(initialTotalRecords || 0);
  const [totalTables, setTotalTables] = useState<number>(0);
  const [lastVerifiedAt, setLastVerifiedAt] = useState<string>('');

  // Table Filter Search State
  const [tableSearchQuery, setTableSearchQuery] = useState('');

  // Record Inspection State
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [recordsPayload, setRecordsPayload] = useState<TableRecordsPayload | null>(null);
  const [recordSearchQuery, setRecordSearchQuery] = useState('');
  const [debouncedRecordSearch, setDebouncedRecordSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      // Reset navigation when closed
      setSelectedTable(null);
      setSelectedRecordDetail(null);
      setTableSearchQuery('');
      setRecordSearchQuery('');
      setDebouncedRecordSearch('');
      setCurrentPage(1);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle ESC key press to close drawer or close detail modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (selectedRecordDetail) {
          setSelectedRecordDetail(null);
        } else if (selectedTable) {
          setSelectedTable(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedTable, selectedRecordDetail, onClose]);

  // 1. Fetch Dynamic Tables List (Level 1)
  const fetchExplorerTables = async () => {
    setLoadingTables(true);
    setTableError(null);
    try {
      const res = await axios.get(`${API}/enterprise-recovery/records/explorer-tables`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
      });
      if (res.data) {
        setTablesList(res.data.tables || []);
        setTotalRecords(res.data.totalRecords || 0);
        setTotalTables(res.data.totalTables || 0);
        setLastVerifiedAt(res.data.lastVerifiedAt || new Date().toISOString());
      }
    } catch (err: any) {
      setTableError(err.response?.data?.error || 'Unable to load database records. Please try again.');
    } finally {
      setLoadingTables(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchExplorerTables();
    }
  }, [isOpen]);

  // Debounce Record Search Query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedRecordSearch(recordSearchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [recordSearchQuery]);

  // 2. Fetch Server-Paginated Table Records (Level 2)
  const fetchTableRecords = async () => {
    if (!selectedTable) return;
    setLoadingRecords(true);
    setRecordsError(null);
    try {
      const res = await axios.get(`${API}/enterprise-recovery/records/table/${selectedTable}`, {
        params: {
          page: currentPage,
          pageSize,
          search: debouncedRecordSearch
        },
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
      });
      setRecordsPayload(res.data);
    } catch (err: any) {
      setRecordsError(err.response?.data?.error || 'Unable to fetch records for this table.');
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    if (selectedTable) {
      fetchTableRecords();
    }
  }, [selectedTable, currentPage, pageSize, debouncedRecordSearch]);

  // Filter Level 1 Tables locally by search query
  const filteredTablesList = useMemo(() => {
    if (!tableSearchQuery.trim()) return tablesList;
    const q = tableSearchQuery.toLowerCase();
    return tablesList.filter(t => 
      t.displayName.toLowerCase().includes(q) || 
      t.name.toLowerCase().includes(q)
    );
  }, [tablesList, tableSearchQuery]);

  // Format dynamic cell values cleanly
  const renderFormattedCellValue = (val: any, col: ColumnMeta) => {
    if (val === null || val === undefined || val === '') {
      return <span className="text-slate-600 font-mono">—</span>;
    }

    if (col.type === 'currency' && typeof val === 'number') {
      return <span className="font-mono text-purple-300 font-bold">{formatIndianRupee(val)}</span>;
    }

    if (col.type === 'date') {
      return <span className="font-mono text-slate-300">{formatLocalTimestamp(val)}</span>;
    }

    if (typeof val === 'boolean' || col.type === 'boolean') {
      return val ? (
        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
          TRUE
        </span>
      ) : (
        <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
          FALSE
        </span>
      );
    }

    const strVal = String(val);
    if (strVal === '[PROTECTED]') {
      return (
        <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center gap-1 w-fit">
          <Lock className="w-3 h-3" /> [PROTECTED]
        </span>
      );
    }

    if (strVal.length > 35) {
      return (
        <span className="truncate max-w-[200px] block" title={strVal}>
          {strVal}
        </span>
      );
    }

    return <span>{strVal}</span>;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1200] overflow-hidden flex justify-end">
        {/* Backdrop Fade */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
        />

        {/* Floating Right-Side Drawer Container */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 350, damping: 32 }}
          style={{
            backgroundColor: themeData.bgElevated,
            borderColor: themeData.borderColor,
            color: themeData.textPrimary
          }}
          className="relative w-full sm:w-[620px] md:w-[680px] h-full shadow-2xl border-l backdrop-blur-2xl flex flex-col z-[1250] font-sans overflow-hidden"
        >
          {/* ── HEADER ZONE ─────────────────────────────────────────────────── */}
          <div 
            style={{
              backgroundColor: themeData.bgCard,
              borderColor: themeData.borderColor
            }}
            className="p-5 border-b flex items-start justify-between gap-4 shrink-0 shadow-sm"
          >
            <div className="flex items-center space-x-3.5 min-w-0">
              <div 
                style={{
                  backgroundColor: `${themeData.accentPrimary}15`,
                  borderColor: `${themeData.accentPrimary}40`,
                  color: themeData.accentPrimary
                }}
                className="p-3 rounded-2xl border shrink-0 shadow-md"
              >
                <Database className="w-6 h-6 stroke-[2.2]" />
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center space-x-2">
                  {selectedTable && (
                    <button
                      onClick={() => {
                        setSelectedTable(null);
                        setSelectedRecordDetail(null);
                      }}
                      className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer mr-1"
                      title="Back to Tables List"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  )}
                  <h2 className="text-lg font-black tracking-tight text-white truncate">
                    {selectedTable && recordsPayload ? recordsPayload.displayName : 'Database Records'}
                  </h2>
                </div>

                <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                  {selectedTable ? `Inspecting table "${selectedTable}"` : 'Verified records from your live financial database'}
                </p>

                {/* Live Summary Chips */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span 
                    style={{
                      backgroundColor: `${themeData.accentPrimary}20`,
                      borderColor: `${themeData.accentPrimary}40`,
                      color: themeData.accentPrimary
                    }}
                    className="text-[10px] font-mono font-extrabold px-2.5 py-0.5 rounded-full border shadow-sm"
                  >
                    {totalRecords} records • {totalTables} tables
                  </span>

                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Live Database Verified
                  </span>
                </div>
              </div>
            </div>

            {/* Close Drawer Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
              title="Close Drawer (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── MAIN BODY ZONE (Scrollable Content) ─────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
            {/* LEVEL 1: TABLE DISCOVERY LIST */}
            {!selectedTable && (
              <div className="space-y-4">
                {/* Search Box */}
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={tableSearchQuery}
                    onChange={e => setTableSearchQuery(e.target.value)}
                    placeholder="Search tables by name..."
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/60 shadow-inner"
                  />
                  {tableSearchQuery && (
                    <button
                      onClick={() => setTableSearchQuery('')}
                      className="absolute right-3 text-slate-500 hover:text-white text-xs p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Table Discovery Status Header */}
                <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-slate-400 px-1 pt-1">
                  <span>Application Tables</span>
                  <span className="font-mono text-[10px] text-slate-500">{filteredTablesList.length} of {totalTables} tables</span>
                </div>

                {/* Table List Loading Skeletons */}
                {loadingTables && (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i} className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="w-36 h-3 bg-slate-800 rounded" />
                          <div className="w-24 h-2 bg-slate-800/60 rounded" />
                        </div>
                        <div className="w-16 h-5 bg-slate-800 rounded-full" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Table Error Box */}
                {tableError && !loadingTables && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 space-y-3">
                    <div className="flex items-center space-x-2 text-xs font-bold">
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                      <span>{tableError}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Your backup protection is still active. Please try again.
                    </p>
                    <button
                      onClick={fetchExplorerTables}
                      className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Retry
                    </button>
                  </div>
                )}

                {/* Render Dynamic Table List */}
                {!loadingTables && !tableError && (
                  <div className="space-y-2">
                    {filteredTablesList.length === 0 ? (
                      <div className="p-8 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl text-slate-400 text-xs">
                        No matching tables found for "{tableSearchQuery}".
                      </div>
                    ) : (
                      filteredTablesList.map(table => (
                        <div
                          key={table.name}
                          onClick={() => {
                            setSelectedTable(table.name);
                            setCurrentPage(1);
                            setRecordSearchQuery('');
                            setDebouncedRecordSearch('');
                          }}
                          className="p-3.5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/90 hover:border-purple-500/40 rounded-2xl flex items-center justify-between gap-3 transition-all cursor-pointer group shadow-sm"
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="p-2 rounded-xl bg-slate-800/80 text-purple-300 border border-slate-700/60 group-hover:border-purple-500/40 transition">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                                {table.displayName}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500 truncate">
                                {table.name}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3 shrink-0">
                            <span className="text-xs font-mono font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                              {table.recordCount} rows
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-transform group-hover:translate-x-0.5" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* LEVEL 2: TABLE RECORD LEDGER INSPECTION */}
            {selectedTable && (
              <div className="space-y-4">
                {/* Search & Filter Controls Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/70 p-3 rounded-2xl border border-slate-800">
                  {/* Search Records Input */}
                  <div className="relative flex-1 flex items-center">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      value={recordSearchQuery}
                      onChange={e => setRecordSearchQuery(e.target.value)}
                      placeholder={`Search records in ${selectedTable}...`}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60"
                    />
                    {recordSearchQuery && (
                      <button
                        onClick={() => setRecordSearchQuery('')}
                        className="absolute right-2.5 text-slate-500 hover:text-white text-xs p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Page Size Selector */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Rows per page:</span>
                    <select
                      value={pageSize}
                      onChange={e => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-slate-200 rounded-xl px-2 py-1.5 focus:outline-none cursor-pointer"
                    >
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                {/* Records Error Box */}
                {recordsError && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 space-y-3">
                    <div className="flex items-center space-x-2 text-xs font-bold">
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                      <span>{recordsError}</span>
                    </div>
                    <button
                      onClick={fetchTableRecords}
                      className="px-3 py-1.5 bg-rose-500/20 text-rose-200 border border-rose-500/40 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Retry Table Fetch
                    </button>
                  </div>
                )}

                {/* Records Table Loading Skeleton */}
                {loadingRecords && (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="h-12 bg-slate-900/60 rounded-xl border border-slate-800/80 animate-pulse" />
                    ))}
                  </div>
                )}

                {/* Dynamic Data Table Render */}
                {!loadingRecords && !recordsError && recordsPayload && (
                  <div className="space-y-4">
                    {recordsPayload.records.length === 0 ? (
                      <div className="p-10 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl text-slate-400 text-xs space-y-1">
                        <p className="font-bold text-slate-300">No records in this table</p>
                        <p className="text-[11px] text-slate-500">
                          {debouncedRecordSearch ? `No records match "${debouncedRecordSearch}".` : 'This table is currently empty.'}
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 shadow-xl">
                        <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                          <thead>
                            <tr className="border-b border-slate-800 bg-slate-900/90 text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
                              <th className="py-3 px-3">#</th>
                              {recordsPayload.columns.slice(0, 5).map(col => (
                                <th key={col.name} className="py-3 px-3">
                                  {col.label}
                                </th>
                              ))}
                              <th className="py-3 px-3 text-right">Inspect</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 text-slate-200">
                            {recordsPayload.records.map((row, idx) => {
                              const globalRowIndex = (recordsPayload.pagination.page - 1) * recordsPayload.pagination.pageSize + idx + 1;
                              return (
                                <tr
                                  key={row.id || idx}
                                  onClick={() => setSelectedRecordDetail(row)}
                                  className="hover:bg-purple-500/10 transition cursor-pointer group"
                                >
                                  <td className="py-3 px-3 font-mono text-[10px] text-slate-500">
                                    {globalRowIndex}
                                  </td>
                                  {recordsPayload.columns.slice(0, 5).map(col => (
                                    <td key={col.name} className="py-3 px-3">
                                      {renderFormattedCellValue(row[col.name], col)}
                                    </td>
                                  ))}
                                  <td className="py-3 px-3 text-right font-mono">
                                    <span className="text-[10px] font-bold text-purple-400 group-hover:text-purple-300 group-hover:underline inline-flex items-center gap-1">
                                      View ➔
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Server Pagination Bar */}
                    {recordsPayload.pagination.totalPages > 1 && (
                      <div className="flex items-center justify-between pt-2 text-xs font-mono">
                        <span className="text-slate-400 text-[11px]">
                          Page {recordsPayload.pagination.page} of {recordsPayload.pagination.totalPages} ({recordsPayload.pagination.totalRecords} total rows)
                        </span>

                        <div className="flex items-center space-x-2">
                          <button
                            disabled={currentPage <= 1}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-purple-500/40 rounded-xl text-slate-200 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer flex items-center gap-1"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" /> Prev
                          </button>

                          <button
                            disabled={currentPage >= recordsPayload.pagination.totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(recordsPayload.pagination.totalPages, prev + 1))}
                            className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-purple-500/40 rounded-xl text-slate-200 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer flex items-center gap-1"
                          >
                            Next <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── FOOTER ZONE (Read-Only Guarantee Status Bar) ─────────────────── */}
          <div 
            style={{
              backgroundColor: themeData.bgCard,
              borderColor: themeData.borderColor
            }}
            className="p-4 border-t flex items-center justify-between text-[11px] text-slate-400 font-mono shrink-0"
          >
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Read-only • Live database data
            </span>

            {lastVerifiedAt && (
              <span className="text-[10px] text-slate-500">
                Verified: {formatLocalTimestamp(lastVerifiedAt)}
              </span>
            )}
          </div>

          {/* LEVEL 3: RECORD DETAIL MODAL PANEL (Inside Drawer) */}
          <AnimatePresence>
            {selectedRecordDetail && recordsPayload && (
              <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedRecordDetail(null)}
                  className="fixed inset-0 bg-black/80 backdrop-blur-md"
                />

                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  style={{
                    backgroundColor: themeData.bgElevated,
                    borderColor: themeData.borderColor,
                    color: themeData.textPrimary
                  }}
                  className="relative w-full max-w-lg max-h-[85vh] overflow-hidden rounded-3xl border shadow-2xl z-[1350] flex flex-col font-sans"
                >
                  {/* Modal Header */}
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 shrink-0">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-black text-white uppercase tracking-wider">
                        Record Details ({recordsPayload.displayName})
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedRecordDetail(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Key-Value Pair Content */}
                  <div className="p-5 overflow-y-auto space-y-3 custom-scrollbar text-xs font-mono">
                    {recordsPayload.columns.map(col => {
                      const val = selectedRecordDetail[col.name];
                      return (
                        <div key={col.name} className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                            {col.label} <span className="text-slate-600 font-normal">({col.name})</span>
                          </span>
                          <div className="text-white break-words">
                            {renderFormattedCellValue(val, col)}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-3 border-t border-slate-800 bg-slate-900/80 text-center text-[10px] text-slate-500 font-mono">
                    Read-only record inspection • Press Esc or click outside to close
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
