import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Plus, Search, Edit2, Trash2, FileText, Pin, ExternalLink, Download, FolderSync, 
  Landmark, Info, Clock, Bell, ChevronRight, X, TrendingDown, TrendingUp, Sparkles, FolderOpen
} from 'lucide-react';
import Button from '../components/ui/Button';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

export default function FinancialRecords() {
  // Tab State
  const [activeTab, setActiveTab] = useState<'debts' | 'deposits' | 'transfers' | 'chits' | 'notes' | 'documents'>('debts');

  // Master Data States
  const [debts, setDebts] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [chits, setChits] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest' | 'highest'>('latest');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'debt' | 'deposit' | 'transfer' | 'chit' | 'note'>('debt');
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Drawer state for details preview
  const [activeRecord, setActiveRecord] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Floating Action Button toggle
  const [isFabOpen, setIsFabOpen] = useState(false);

  // Polymorphic Ledger State
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [isAddLedgerOpen, setIsAddLedgerOpen] = useState(false);
  const [editingLedgerId, setEditingLedgerId] = useState<number | null>(null);
  const [ledgerForm, setLedgerForm] = useState({
    month_year: '',
    payment_date: new Date().toISOString().slice(0, 10),
    amount: '',
    payment_type: 'UPI',
    notes: ''
  });
  const [ledgerFile, setLedgerFile] = useState<File | null>(null);

  // Load child ledger entries
  const fetchLedgerEntries = async (recordType: string, recordId: number) => {
    setLoadingLedger(true);
    try {
      const type = recordType.slice(0, -1); // 'debt', 'deposit', 'chit'
      const res = await axios.get(`${API}/ledger-entries?record_type=${type}&record_id=${recordId}`);
      setLedgerEntries(res.data || []);
    } catch (_) {
      setLedgerEntries([]);
    } finally {
      setLoadingLedger(false);
    }
  };

  const handleOpenRecordDetails = (item: any) => {
    const enriched = { ...item, recordType: activeTab };
    setActiveRecord(enriched);
    setIsDrawerOpen(true);
    setIsAddLedgerOpen(false);
    setEditingLedgerId(null);
    setLedgerForm({
      month_year: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      payment_date: new Date().toISOString().slice(0, 10),
      amount: '',
      payment_type: 'UPI',
      notes: ''
    });
    setLedgerFile(null);
    fetchLedgerEntries(activeTab, item.id);
  };

  const handleLedgerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRecord) return;
    
    const recordType = activeRecord.recordType.slice(0, -1);
    const formDataObj = new FormData();
    formDataObj.append('record_id', String(activeRecord.id));
    formDataObj.append('record_type', recordType);
    formDataObj.append('month_year', ledgerForm.month_year);
    formDataObj.append('payment_date', ledgerForm.payment_date);
    formDataObj.append('amount', ledgerForm.amount);
    formDataObj.append('payment_type', ledgerForm.payment_type);
    formDataObj.append('notes', ledgerForm.notes);
    if (ledgerFile) {
      formDataObj.append('file', ledgerFile);
    }

    try {
      if (editingLedgerId) {
        await axios.put(`${API}/ledger-entries/${editingLedgerId}`, formDataObj, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await axios.post(`${API}/ledger-entries`, formDataObj, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      
      setIsAddLedgerOpen(false);
      setEditingLedgerId(null);
      setLedgerForm({
        month_year: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        payment_date: new Date().toISOString().slice(0, 10),
        amount: '',
        payment_type: 'UPI',
        notes: ''
      });
      setLedgerFile(null);
      
      await fetchLedgerEntries(activeRecord.recordType, activeRecord.id);
      await fetchAll();
      
      const resRecord = await axios.get(`${API}/${activeRecord.recordType === 'chit-funds' ? 'chit-funds' : activeRecord.recordType}`);
      const updatedItem = resRecord.data.find((item: any) => item.id === activeRecord.id);
      if (updatedItem) {
        setActiveRecord({ ...updatedItem, recordType: activeRecord.recordType });
      }
    } catch (err) {
      console.error('Failed to submit ledger entry', err);
    }
  };

  const handleLedgerDelete = async (id: number) => {
    if (!window.confirm('Delete this ledger entry?')) return;
    try {
      await axios.delete(`${API}/ledger-entries/${id}`);
      await fetchLedgerEntries(activeRecord.recordType, activeRecord.id);
      await fetchAll();
      
      const resRecord = await axios.get(`${API}/${activeRecord.recordType === 'chit-funds' ? 'chit-funds' : activeRecord.recordType}`);
      const updatedItem = resRecord.data.find((item: any) => item.id === activeRecord.id);
      if (updatedItem) {
        setActiveRecord({ ...updatedItem, recordType: activeRecord.recordType });
      }
    } catch (_) {}
  };

  const handleLedgerEdit = (entry: any) => {
    setEditingLedgerId(entry.id);
    setLedgerForm({
      month_year: entry.month_year,
      payment_date: entry.payment_date,
      amount: String(entry.amount),
      payment_type: entry.payment_type,
      notes: entry.notes
    });
    setIsAddLedgerOpen(true);
  };

  // Modular Form States
  const [debtForm, setDebtForm] = useState({
    person_name: '', amount: '', type: 'borrowed', date: new Date().toISOString().slice(0, 10),
    due_date: '', status: 'pending', notes: ''
  });
  const [depositForm, setDepositForm] = useState({
    name: '', category: 'LIC', monthly_amount: '', total_amount_paid: '',
    start_date: new Date().toISOString().slice(0, 10), maturity_date: '', status: 'active', notes: ''
  });
  const [transferForm, setTransferForm] = useState({
    from_account: '', to_account: '', amount: '', date: new Date().toISOString().slice(0, 10),
    purpose: '', notes: ''
  });
  const [chitForm, setChitForm] = useState({
    name: '', monthly_amount: '', total_paid: '', remaining_installments: '',
    start_date: new Date().toISOString().slice(0, 10), end_date: '', status: 'active', notes: ''
  });
  const [noteForm, setNoteForm] = useState({
    title: '', content: '', is_pinned: false
  });

  // Document Upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDocName, setUploadDocName] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [debtsRes, depositsRes, transfersRes, chitsRes, notesRes, docsRes] = await Promise.all([
        axios.get(`${API}/debts`),
        axios.get(`${API}/deposits`),
        axios.get(`${API}/transfers`),
        axios.get(`${API}/chit-funds`),
        axios.get(`${API}/notes`),
        axios.get(`${API}/documents`)
      ]);
      setDebts(debtsRes.data || []);
      setDeposits(depositsRes.data || []);
      setTransfers(transfersRes.data || []);
      setChits(chitsRes.data || []);
      setNotes(notesRes.data || []);
      setDocuments(docsRes.data || []);
    } catch (err) {
      console.error('Failed to fetch ledger records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // Excel Export Simulation
  const handleExport = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Type,Name/Person,Category,Amount,Date,Due Date,Status,Notes\r\n";
    
    debts.forEach(d => {
      csvContent += `Debt/Loan,${d.person_name},${d.type},${d.amount},${d.date},${d.due_date || ''},${d.status},"${d.notes || ''}"\r\n`;
    });
    deposits.forEach(d => {
      csvContent += `Deposit,${d.name},${d.category},${d.total_amount_paid},${d.start_date},${d.maturity_date || ''},${d.status},"${d.notes || ''}"\r\n`;
    });
    transfers.forEach(t => {
      csvContent += `Transfer,${t.from_account} to ${t.to_account},Internal,${t.amount},${t.date},,,"${t.purpose || ''}"\r\n`;
    });
    chits.forEach(c => {
      csvContent += `Chit Fund,${c.name},Chit,${c.total_paid},${c.start_date},${c.end_date || ''},${c.status},"${c.notes || ''}"\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `VENKE_Financial_Records_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Unified Form Submit Handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalType === 'debt') {
        const payload = { ...debtForm, amount: Number(debtForm.amount) };
        if (editingId) await axios.put(`${API}/debts/${editingId}`, payload);
        else await axios.post(`${API}/debts`, payload);
      } else if (modalType === 'deposit') {
        const payload = {
          ...depositForm,
          monthly_amount: Number(depositForm.monthly_amount) || 0,
          total_amount_paid: Number(depositForm.total_amount_paid) || 0
        };
        if (editingId) await axios.put(`${API}/deposits/${editingId}`, payload);
        else await axios.post(`${API}/deposits`, payload);
      } else if (modalType === 'transfer') {
        const payload = { ...transferForm, amount: Number(transferForm.amount) };
        if (editingId) await axios.put(`${API}/transfers/${editingId}`, payload);
        else await axios.post(`${API}/transfers`, payload);
      } else if (modalType === 'chit') {
        const payload = {
          ...chitForm,
          monthly_amount: Number(chitForm.monthly_amount),
          total_paid: Number(chitForm.total_paid) || 0,
          remaining_installments: Number(chitForm.remaining_installments)
        };
        if (editingId) await axios.put(`${API}/chit-funds/${editingId}`, payload);
        else await axios.post(`${API}/chit-funds`, payload);
      } else if (modalType === 'note') {
        if (editingId) await axios.put(`${API}/notes/${editingId}`, noteForm);
        else await axios.post(`${API}/notes`, noteForm);
      }
      setIsModalOpen(false);
      setEditingId(null);
      fetchAll();
    } catch (_) {
      alert('Failed to save record.');
    }
  };

  // Doc Upload Handler
  const handleDocUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('name', uploadDocName || uploadFile.name);
    try {
      await axios.post(`${API}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadFile(null);
      setUploadDocName('');
      fetchAll();
    } catch (_) {
      alert('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  // Delete Action Dispatcher
  const handleDeleteItem = async (type: string, id: number) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
      if (type === 'debt') await axios.delete(`${API}/debts/${id}`);
      else if (type === 'deposit') await axios.delete(`${API}/deposits/${id}`);
      else if (type === 'transfer') await axios.delete(`${API}/transfers/${id}`);
      else if (type === 'chit') await axios.delete(`${API}/chit-funds/${id}`);
      else if (type === 'note') await axios.delete(`${API}/notes/${id}`);
      else if (type === 'doc') await axios.delete(`${API}/documents/${id}`);
      setIsDrawerOpen(false);
      fetchAll();
    } catch (_) {
      alert('Deletion failed');
    }
  };

  const handleEditRecord = (type: any, record: any) => {
    setEditingId(record.id);
    setModalType(type);
    setIsDrawerOpen(false);
    
    if (type === 'debt') {
      setDebtForm({
        person_name: record.person_name, amount: String(record.amount), type: record.type,
        date: record.date, due_date: record.due_date || '', status: record.status, notes: record.notes || ''
      });
    } else if (type === 'deposit') {
      setDepositForm({
        name: record.name, category: record.category, monthly_amount: String(record.monthly_amount || ''),
        total_amount_paid: String(record.total_amount_paid || ''), start_date: record.start_date,
        maturity_date: record.maturity_date || '', status: record.status, notes: record.notes || ''
      });
    } else if (type === 'transfer') {
      setTransferForm({
        from_account: record.from_account, to_account: record.to_account, amount: String(record.amount),
        date: record.date, purpose: record.purpose || '', notes: record.notes || ''
      });
    } else if (type === 'chit') {
      setChitForm({
        name: record.name, monthly_amount: String(record.monthly_amount), total_paid: String(record.total_paid || ''),
        remaining_installments: String(record.remaining_installments), start_date: record.start_date,
        end_date: record.end_date || '', status: record.status, notes: record.notes || ''
      });
    } else if (type === 'note') {
      setNoteForm({
        title: record.title || '', content: record.content, is_pinned: record.is_pinned === 1
      });
    }
    setIsModalOpen(true);
  };

  // Mark as Paid Helper for Debts
  const markAsPaid = async (item: any) => {
    try {
      await axios.put(`${API}/debts/${item.id}`, { ...item, status: 'paid' });
      fetchAll();
    } catch (_) {
      alert('Failed to update status');
    }
  };

  // Pinned Notes Action
  const togglePin = async (item: any) => {
    const nextPin = item.is_pinned === 1 ? 0 : 1;
    try {
      await axios.put(`${API}/notes/${item.id}`, {
        title: item.title,
        content: item.content,
        is_pinned: nextPin
      });
      fetchAll();
    } catch (_) {
      console.error('Failed to pin');
    }
  };

  // Calculations for KPI Cards
  const totalBorrowed = debts.filter(d => d.type === 'borrowed' && d.status === 'pending').reduce((sum, d) => sum + d.amount, 0);
  const totalLent = debts.filter(d => d.type === 'lent' && d.status === 'pending').reduce((sum, d) => sum + d.amount, 0);
  const totalInvestedDeposits = deposits.reduce((sum, d) => sum + (d.total_amount_paid || 0), 0);
  const totalChitsInvested = chits.reduce((sum, c) => sum + (c.total_paid || 0), 0);
  const totalPendingPayments = debts.filter(d => d.status === 'pending').reduce((sum, d) => sum + d.amount, 0);
  
  // Upcoming Due Amount (next 30 days)
  const getUpcomingDues = () => {
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() + 30);
    return debts
      .filter(d => d.status === 'pending' && d.due_date && new Date(d.due_date) <= limitDate)
      .reduce((sum, d) => sum + d.amount, 0);
  };
  const upcomingDueAmount = getUpcomingDues();

  // Upcoming Due List Items
  const getUpcomingItems = () => {
    const list: any[] = [];
    const today = new Date();
    debts.forEach(d => {
      if (d.status === 'pending' && d.due_date) {
        list.push({ title: `Debt due from ${d.person_name}`, date: d.due_date, amount: d.amount, type: 'debt', status: new Date(d.due_date) < today ? 'overdue' : 'pending' });
      }
    });
    deposits.forEach(d => {
      if (d.status === 'active' && d.maturity_date) {
        list.push({ title: `${d.name} Maturity`, date: d.maturity_date, amount: d.monthly_amount, type: 'deposit', status: 'active' });
      }
    });
    chits.forEach(c => {
      if (c.status === 'active' && c.start_date) {
        // Calculate next due date
        const nextDue = new Date(c.start_date);
        const monthsPaid = Math.floor((c.total_paid || 0) / c.monthly_amount);
        nextDue.setMonth(nextDue.getMonth() + monthsPaid + 1);
        list.push({ title: `${c.name} Instalment`, date: nextDue.toISOString().slice(0, 10), amount: c.monthly_amount, type: 'chit', status: 'active' });
      }
    });
    return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 3);
  };
  const upcomingItems = getUpcomingItems();

  // Recent activity parsed from dates
  const getRecentActivities = () => {
    const acts: any[] = [];
    debts.slice(0, 3).forEach(d => {
      acts.push({ msg: `Logged ${d.type} debt: ₹${d.amount.toLocaleString()} with ${d.person_name}`, date: d.date, type: 'debt' });
    });
    deposits.slice(0, 3).forEach(d => {
      acts.push({ msg: `Registered ${d.category}: ${d.name} with starting deposit`, date: d.start_date, type: 'deposit' });
    });
    transfers.slice(0, 3).forEach(t => {
      acts.push({ msg: `Transferred ₹${t.amount.toLocaleString()} from ${t.from_account} to ${t.to_account}`, date: t.date, type: 'transfer' });
    });
    return acts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  };
  const recentActivities = getRecentActivities();

  // Insights
  const getInsights = () => {
    const ins: string[] = [];
    const outstanding = totalLent - totalBorrowed;
    if (outstanding > 0) ins.push(`Net Lending balance is positive by ₹${outstanding.toLocaleString('en-IN')}. Suresh or others owe you more.`);
    else if (outstanding < 0) ins.push(`Outstanding net Borrowing is ₹${Math.abs(outstanding).toLocaleString('en-IN')}. Plan returns soon.`);
    
    const countPending = debts.filter(d => d.status === 'pending').length;
    if (countPending > 0) ins.push(`You currently have ${countPending} pending loan/debt milestones needing collection or refund.`);
    
    const maturedDeposits = deposits.filter(d => d.status === 'matured').length;
    if (maturedDeposits > 0) ins.push(`You have ${maturedDeposits} matured FDs/Deposits. Verify payouts in settings.`);
    
    if (ins.length === 0) {
      ins.push("Your financial records ledger is healthy. No immediate actions are needed.");
    }
    return ins;
  };
  const insights = getInsights();

  // Filter & Sort handlers for list view
  const getFilteredList = () => {
    let result: any[] = [];
    if (activeTab === 'debts') result = [...debts];
    else if (activeTab === 'deposits') result = [...deposits];
    else if (activeTab === 'transfers') result = [...transfers];
    else if (activeTab === 'chits') result = [...chits];
    else if (activeTab === 'notes') result = [...notes];
    else if (activeTab === 'documents') result = [...documents];

    // Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => {
        const nameMatch = (item.person_name || item.name || item.from_account || item.title || '').toLowerCase().includes(q);
        const notesMatch = (item.notes || item.content || item.purpose || '').toLowerCase().includes(q);
        return nameMatch || notesMatch;
      });
    }

    // Status Filter
    if (statusFilter !== 'all') {
      result = result.filter(item => item.status === statusFilter);
    }

    // Sort order
    if (sortOrder === 'latest') {
      result.sort((a, b) => new Date(b.date || b.start_date || b.upload_date || b.created_at).getTime() - new Date(a.date || a.start_date || a.upload_date || a.created_at).getTime());
    } else if (sortOrder === 'oldest') {
      result.sort((a, b) => new Date(a.date || a.start_date || a.upload_date || a.created_at).getTime() - new Date(b.date || b.start_date || b.upload_date || b.created_at).getTime());
    } else if (sortOrder === 'highest') {
      result.sort((a, b) => (b.amount || b.total_amount_paid || b.total_paid || 0) - (a.amount || a.total_amount_paid || a.total_paid || 0));
    }

    return result;
  };

  const activeFilteredList = getFilteredList();

  // Recharts Chart Data Calculations
  const debtsVsLoansData = [
    { name: 'Borrowed', value: totalBorrowed },
    { name: 'Lent', value: totalLent }
  ].filter(v => v.value > 0);

  const getDepositsByCategory = () => {
    const cats: { [key: string]: number } = {};
    deposits.forEach(d => {
      cats[d.category] = (cats[d.category] || 0) + (d.total_amount_paid || 0);
    });
    return Object.keys(cats).map(k => ({ name: k, amount: cats[k] }));
  };
  const depositsChartData = getDepositsByCategory();

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] space-y-4 text-slate-500">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p className="text-sm font-semibold">Loading ledger records...</p>
    </div>
  );

  return (
    <div className="space-y-6 relative animate-in fade-in duration-300">
      
      {/* 1. Header Section */}
      <div className="flex justify-between items-start flex-wrap gap-4 bg-gradient-to-r from-primary/10 to-indigo-500/10 p-6 rounded-3xl border border-primary/15 relative overflow-hidden">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-primary/20 text-primary flex items-center justify-center rounded-2xl">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center">
              Financial Records Ledger
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Securely migrate, track, and audit personal loans, deposits, chit funds, accounts transfers, and documents receipts.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button onClick={() => { setModalType('debt'); setEditingId(null); setIsModalOpen(true); }} className="text-xs font-bold px-3.5 py-2 hover:scale-[1.02] transition-transform">
            <Plus className="w-4 h-4 mr-1.5" /> Add Record
          </Button>
          <button onClick={handleExport} className="text-xs font-bold px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 transition">
            Export CSV
          </button>
        </div>
      </div>

      {/* 2. Summary Cards at Top */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard title="Total Borrowed" amount={totalBorrowed} icon={<TrendingDown className="w-5 h-5 text-red-500" />} color="text-red-500" bg="bg-red-500/5" trend="Pending return" />
        <KPICard title="Total Lent" amount={totalLent} icon={<TrendingUp className="w-5 h-5 text-green-500" />} color="text-green-500" bg="bg-green-500/5" trend="To collect" />
        <KPICard title="Deposits Balance" amount={totalInvestedDeposits} icon={<Landmark className="w-5 h-5 text-blue-500" />} color="text-blue-500" bg="bg-blue-500/5" trend="Active schemes" />
        <KPICard title="Chit Funds Total" amount={totalChitsInvested} icon={<FolderSync className="w-5 h-5 text-purple-500" />} color="text-purple-500" bg="bg-purple-500/5" trend="Paid installments" />
        <KPICard title="Pending Dues" amount={totalPendingPayments} icon={<Clock className="w-5 h-5 text-yellow-500" />} color="text-yellow-500" bg="bg-yellow-500/5" trend="Needs attention" />
        <KPICard title="Upcoming Dues" amount={upcomingDueAmount} icon={<Bell className="w-5 h-5 text-rose-500" />} color="text-rose-500" bg="bg-rose-500/5" trend="Next 30 days" />
      </div>

      {/* Analytics & Insights block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Analytics Charts */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-950 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Deposits Breakdown</h3>
            {depositsChartData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-xs text-slate-400">Add deposits to view allocation</div>
            ) : (
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={depositsChartData}>
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: 10 }} />
                    <Bar dataKey="amount" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Debts Distribution</h3>
            {debtsVsLoansData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-xs text-slate-400">No debts active</div>
            ) : (
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={debtsVsLoansData} innerRadius={35} outerRadius={50} paddingAngle={4} dataKey="value">
                      {debtsVsLoansData.map((_e, index) => <Cell key={index} fill={index === 0 ? '#EF4444' : '#10B981'} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Insights & Reminders */}
        <div className="bg-white dark:bg-slate-950 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
              <Sparkles className="w-4 h-4 text-primary mr-1.5" /> Ledger Intelligence
            </h3>
            <div className="space-y-2 mt-3">
              {insights.map((ins, i) => (
                <div key={i} className="flex items-start space-x-2 text-[11px] font-semibold text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                  <Info className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{ins}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-3">
            Insights are calculated dynamically from active ledger balances.
          </div>
        </div>
      </div>

      {/* 3. Tab Navigation */}
      <div className="flex space-x-1.5 overflow-x-auto pb-1.5 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 p-1.5 rounded-2xl">
        <TabPill id="debts" label="💰 Debts & Loans" active={activeTab === 'debts'} onClick={setActiveTab} />
        <TabPill id="deposits" label="🏦 Deposits" active={activeTab === 'deposits'} onClick={setActiveTab} />
        <TabPill id="transfers" label="🔄 Money Transfers" active={activeTab === 'transfers'} onClick={setActiveTab} />
        <TabPill id="chits" label="📦 Chit Funds" active={activeTab === 'chits'} onClick={setActiveTab} />
        <TabPill id="notes" label="📝 Personal Notes" active={activeTab === 'notes'} onClick={setActiveTab} />
        <TabPill id="documents" label="📄 Documents" active={activeTab === 'documents'} onClick={setActiveTab} />
      </div>

      {/* 4. Search, Sort & Filters Toolbar */}
      <div className="flex flex-wrap justify-between items-center gap-3 bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap gap-2.5 items-center">
          <div className="flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 w-64">
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input
              type="text"
              placeholder="Search by name, category, purpose..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs w-full placeholder:text-slate-400"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="active">Active</option>
            <option value="matured">Matured</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-bold text-slate-400">Sort By:</span>
          <select
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value as any)}
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
          >
            <option value="latest">Latest Logged</option>
            <option value="oldest">Oldest Logged</option>
            <option value="highest">Highest Amount</option>
          </select>
        </div>
      </div>

      {/* 5. Replace Blank Space with Data Table */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {activeFilteredList.length === 0 ? (
          <EmptyLedgerState onAdd={() => { resetForms(); setIsModalOpen(true); }} />
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-left text-xs divide-y divide-slate-100 dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-900/50 font-extrabold text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4.5">Record / Person Name</th>
                    <th className="p-4.5">Category</th>
                    <th className="p-4.5">Amount</th>
                    <th className="p-4.5">Date</th>
                    <th className="p-4.5">Due Date</th>
                    <th className="p-4.5">Status</th>
                    <th className="p-4.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                  {activeFilteredList.map(item => {
                    const recordTitle = item.person_name || item.name || item.from_account || item.title || item.name || '—';
                    const recordCat = item.type || item.category || (item.from_account ? 'Transfer' : 'Note');
                    const recordAmount = item.amount || item.total_amount_paid || item.total_paid || 0;
                    const recordDate = item.date || item.start_date || item.upload_date || item.created_at;
                    const recordDue = item.due_date || item.maturity_date || item.end_date || '—';
                    const recordStatus = item.status || 'active';

                    return (
                      <tr 
                        key={item.id} 
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 cursor-pointer transition"
                        onClick={() => handleOpenRecordDetails(item)}
                      >
                        <td className="p-4.5 font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                          {activeTab === 'notes' && item.is_pinned === 1 && <Pin className="w-3.5 h-3.5 text-yellow-500 fill-current" />}
                          <span>{recordTitle}</span>
                        </td>
                        <td className="p-4.5">
                          <span className="inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-black rounded-md capitalize">{recordCat}</span>
                        </td>
                        <td className="p-4.5 font-extrabold text-slate-900 dark:text-white">
                          {activeTab === 'notes' || activeTab === 'documents' ? '—' : `₹${recordAmount.toLocaleString('en-IN')}`}
                        </td>
                        <td className="p-4.5 text-slate-500 font-medium">
                          {new Date(recordDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="p-4.5 text-slate-500 font-medium">
                          {recordDue !== '—' ? new Date(recordDue).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td className="p-4.5">
                          <StatusBadge status={recordStatus} />
                        </td>
                        <td className="p-4.5 text-right space-x-2" onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleEditRecord(activeTab.slice(0, -1), item)} className="p-1.5 text-slate-400 hover:text-primary transition"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDeleteItem(activeTab.slice(0, -1), item.id)} className="p-1.5 text-red-400 hover:text-red-600 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card-based View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {activeFilteredList.map(item => {
                const recordTitle = item.person_name || item.name || item.from_account || item.title || item.name || '—';
                const recordCat = item.type || item.category || (item.from_account ? 'Transfer' : 'Note');
                const recordAmount = item.amount || item.total_amount_paid || item.total_paid || 0;
                const recordDate = item.date || item.start_date || item.upload_date || item.created_at;
                const recordDue = item.due_date || item.maturity_date || item.end_date || '—';
                const recordStatus = item.status || 'active';

                return (
                  <div 
                    key={item.id} 
                    className="p-4 space-y-2.5 active:bg-slate-50 dark:active:bg-slate-900/40 cursor-pointer"
                    onClick={() => handleOpenRecordDetails(item)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center space-x-1.5">
                          {activeTab === 'notes' && item.is_pinned === 1 && <Pin className="w-3 h-3 text-yellow-500 fill-current" />}
                          <span>{recordTitle}</span>
                        </p>
                        <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                          Date: {new Date(recordDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <p className="text-xs font-black font-mono">
                        {activeTab === 'notes' || activeTab === 'documents' ? '—' : `₹${recordAmount.toLocaleString('en-IN')}`}
                      </p>
                    </div>

                    <div className="flex justify-between items-center text-[9px] font-bold">
                      <div className="flex items-center space-x-1.5">
                        <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded capitalize">{recordCat}</span>
                        {recordDue !== '—' && (
                          <span className="text-slate-400">Due: {new Date(recordDue).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        )}
                      </div>
                      <StatusBadge status={recordStatus} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Split details layout for Notes/Reminders */}
      {activeTab === 'notes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-3">
          {notes.map(note => (
            <div key={note.id} className="bg-yellow-50/40 dark:bg-slate-900 border border-yellow-200/50 dark:border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-4 relative group">
              <div>
                <div className="flex justify-between items-start">
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white pr-4">
                    {note.title || 'Untitled Note'}
                  </h4>
                  <div className="flex items-center space-x-1">
                    <button onClick={() => togglePin(note)} className={`p-1 hover:scale-110 transition ${note.is_pinned === 1 ? 'text-yellow-500' : 'text-slate-400'}`}>
                      <Pin className="w-3.5 h-3.5 fill-current" />
                    </button>
                    <button onClick={() => handleEditRecord('note', note)} className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDeleteItem('note', note.id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 font-medium whitespace-pre-wrap leading-relaxed">
                  {note.content}
                </p>
              </div>
              <span className="text-[9px] text-slate-400 font-bold block pt-1">
                {new Date(note.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Split details layout for Documents */}
      {activeTab === 'documents' && (
        <div className="space-y-6 pt-3">
          {/* Upload panel inside documents tab */}
          <form onSubmit={handleDocUpload} className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4 text-xs font-semibold">
            <h4 className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-xs">Upload New Statement / Receipt</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1">Receipt/Document Name</label>
                <input
                  type="text" placeholder="e.g. Gold Scheme Receipt" value={uploadDocName}
                  onChange={e => setUploadDocName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block mb-1">Choose File</label>
                <input
                  type="file" required
                  onChange={e => e.target.files && setUploadFile(e.target.files[0])}
                  className="w-full text-slate-500 font-semibold file:mr-4 file:py-1.5 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-primary file:text-white hover:file:bg-primary/95 cursor-pointer"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={uploading || !uploadFile} className="text-xs font-bold">
                {uploading ? 'Uploading...' : 'Attach Receipt'}
              </Button>
            </div>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map(doc => {
              const fileUrl = window.location.port === '5173' ? `http://localhost:5000${doc.file_path}` : `${window.location.origin}${doc.file_path}`;
              return (
                <div key={doc.id} className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-xl flex items-center justify-between space-x-4">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="overflow-hidden">
                      <h5 className="font-bold text-slate-800 dark:text-white text-xs truncate" title={doc.name}>{doc.name}</h5>
                      <span className="text-[9px] text-slate-400 font-semibold">{doc.upload_date}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    <a href={fileUrl} target="_blank" rel="noreferrer" className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300"><ExternalLink className="w-3.5 h-3.5" /></a>
                    <a href={fileUrl} download={doc.name} className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300"><Download className="w-3.5 h-3.5" /></a>
                    <button onClick={() => handleDeleteItem('doc', doc.id)} className="p-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 rounded-lg text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Upcoming Dues & Activity lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upcoming dues */}
        <div className="bg-white dark:bg-slate-950 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center">
            <Clock className="w-5 h-5 text-rose-500 mr-2" /> Upcoming Milestones / Dues
          </h3>
          {upcomingItems.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">All balances are settled. No dues this month.</div>
          ) : (
            <div className="space-y-3">
              {upcomingItems.map((item, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{item.title}</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Due date: {item.date}</p>
                  </div>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white">₹{item.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent activities log */}
        <div className="bg-white dark:bg-slate-950 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center">
            <Bell className="w-5 h-5 text-primary mr-2" /> Recent Ledger Audits
          </h3>
          {recentActivities.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">No recent ledger logs.</div>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((act, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate" title={act.msg}>{act.msg}</p>
                    <p className="text-[9px] text-slate-400 font-bold mt-0.5">{act.date}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 13. Record Details Drawer */}
      {isDrawerOpen && activeRecord && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white dark:bg-slate-950 shadow-2xl border-l border-slate-200 dark:border-slate-800 p-6 overflow-y-auto animate-in slide-in-from-right duration-300 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {activeRecord.recordType} Record
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-2">
                  {activeRecord.person_name || activeRecord.name || activeRecord.from_account || activeRecord.title || 'Ledger Detail'}
                </h3>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Audit details stats */}
            {(() => {
              const isLedgerType = ['debts', 'deposits', 'chits'].includes(activeRecord.recordType);
              const totalAmount = activeRecord.amount || activeRecord.total_amount_paid || activeRecord.total_paid || 0;
              const totalPaid = isLedgerType ? ledgerEntries.reduce((sum, entry) => sum + entry.amount, 0) : totalAmount;
              const outstanding = Math.max(totalAmount - totalPaid, 0);
              const avgPayment = isLedgerType && ledgerEntries.length > 0 ? (totalPaid / ledgerEntries.length) : 0;
              const lastPaymentDate = isLedgerType && ledgerEntries.length > 0 ? ledgerEntries[0].payment_date : null;

              return (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-900/50 p-4.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 text-xs font-semibold">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Capital Target</span>
                    <span className="text-slate-900 dark:text-white font-extrabold text-sm">₹{totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Total Paid</span>
                    <span className="text-green-500 font-extrabold text-sm">₹{totalPaid.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Outstanding</span>
                    <span className="text-red-400 font-extrabold text-sm">₹{outstanding.toLocaleString('en-IN')}</span>
                  </div>
                  {isLedgerType && (
                    <>
                      <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800">
                        <span className="text-slate-400 block text-[9px]">Total Payments</span>
                        <span className="text-slate-700 dark:text-slate-300 font-bold">{ledgerEntries.length} entries</span>
                      </div>
                      <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800">
                        <span className="text-slate-400 block text-[9px]">Avg Monthly</span>
                        <span className="text-slate-700 dark:text-slate-300 font-bold">₹{avgPayment.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800">
                        <span className="text-slate-400 block text-[9px]">Last Payment</span>
                        <span className="text-slate-700 dark:text-slate-300 font-bold truncate block">
                          {lastPaymentDate ? new Date(lastPaymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

            {/* Add Ledger Entry Inline Form (Only for debts, deposits, and chits) */}
            {['debts', 'deposits', 'chits'].includes(activeRecord.recordType) && (
              isAddLedgerOpen ? (
                <form onSubmit={handleLedgerSubmit} className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs space-y-3">
                  <h4 className="font-extrabold text-slate-800 dark:text-white uppercase tracking-wider text-[9px]">
                    {editingLedgerId ? '✏️ Edit Ledger Entry' : '➕ Add Ledger Entry'}
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block mb-1">Month / Year *</label>
                      <input 
                        type="text" required placeholder="e.g. Apr 2023" value={ledgerForm.month_year}
                        onChange={e => setLedgerForm(f => ({ ...f, month_year: e.target.value }))}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block mb-1">Payment Date *</label>
                      <input 
                        type="date" required value={ledgerForm.payment_date}
                        onChange={e => setLedgerForm(f => ({ ...f, payment_date: e.target.value }))}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block mb-1">Amount (₹) *</label>
                      <input 
                        type="number" required min="1" value={ledgerForm.amount}
                        onChange={e => setLedgerForm(f => ({ ...f, amount: e.target.value }))}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-extrabold text-sm"
                      />
                    </div>
                    <div>
                      <label className="block mb-1">Payment Method</label>
                      <select 
                        value={ledgerForm.payment_type}
                        onChange={e => setLedgerForm(f => ({ ...f, payment_type: e.target.value }))}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                      >
                        <option value="UPI">UPI</option>
                        <option value="Cash">Cash</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Credit Card">Credit Card</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1">Notes / Description</label>
                    <input 
                      type="text" placeholder="Initial payment, monthly SIP, etc." value={ledgerForm.notes}
                      onChange={e => setLedgerForm(f => ({ ...f, notes: e.target.value }))}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                    />
                  </div>

                  <div>
                    <label className="block mb-1">Document / Receipt Attachment</label>
                    <input 
                      type="file" 
                      onChange={e => setLedgerFile(e.target.files?.[0] || null)}
                      className="w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-primary/10 file:text-primary file:font-black cursor-pointer"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <button type="button" onClick={() => { setIsAddLedgerOpen(false); setEditingLedgerId(null); }} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg hover:bg-slate-300 font-bold">Cancel</button>
                    <button type="submit" className="px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-blue-700 font-bold">Save Entry</button>
                  </div>
                </form>
              ) : (
                <button 
                  onClick={() => { setIsAddLedgerOpen(true); setEditingLedgerId(null); }}
                  className="w-full py-2 bg-primary/10 text-primary border border-dashed border-primary/30 rounded-xl font-extrabold text-[10px] hover:bg-primary/20 transition-all (any) uppercase tracking-wider"
                >
                  ➕ Add Monthly Ledger Payment Entry
                </button>
              )
            )}

            {/* Ledger History List & Year-wise Grouping */}
            {['debts', 'deposits', 'chits'].includes(activeRecord.recordType) && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Year-Wise Ledger Book</h4>
                
                {loadingLedger ? (
                  <div className="py-8 text-center text-xs text-slate-400 animate-pulse">Loading ledger trail...</div>
                ) : ledgerEntries.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    No payment ledger trail logged. Tap the button above to post the first entry.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(() => {
                      const entriesByYear: Record<string, any[]> = {};
                      ledgerEntries.forEach(entry => {
                        const year = new Date(entry.payment_date).getFullYear().toString();
                        if (!entriesByYear[year]) entriesByYear[year] = [];
                        entriesByYear[year].push(entry);
                      });

                      return Object.keys(entriesByYear).sort((a, b) => Number(b) - Number(a)).map(year => (
                        <details key={year} open className="group border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 rounded-2xl overflow-hidden">
                          <summary className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 font-extrabold text-xs text-slate-900 dark:text-white flex justify-between items-center cursor-pointer select-none">
                            <span className="flex items-center space-x-1.5">
                              <span>📅 Year {year}</span>
                              <span className="bg-slate-200 dark:bg-slate-800 text-[10px] px-2 py-0.5 rounded-full font-bold">{entriesByYear[year].length} payments</span>
                            </span>
                            <span className="text-[10px] text-primary">Toggle view</span>
                          </summary>
                          
                          <div className="p-3 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                            {entriesByYear[year].map(entry => (
                              <div key={entry.id} className="py-3 flex justify-between items-start first:pt-1 last:pb-1">
                                <div className="space-y-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-extrabold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px]">
                                      {entry.month_year}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {new Date(entry.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                    </span>
                                  </div>
                                  {entry.notes && <p className="text-[11px] text-slate-650 dark:text-slate-350 italic">{entry.notes}</p>}
                                  {entry.attachment_path && (
                                    <a 
                                      href={window.location.port === '5173' ? `http://localhost:5000${entry.attachment_path}` : entry.attachment_path} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="inline-block text-[9px] text-primary underline font-black"
                                    >
                                      📄 Download Receipt / File
                                    </a>
                                  )}
                                </div>
                                
                                <div className="flex flex-col items-end space-y-1">
                                  <span className="font-black text-slate-900 dark:text-white font-mono">₹{entry.amount.toLocaleString('en-IN')}</span>
                                  <span className="text-[9px] text-slate-400">{entry.payment_type}</span>
                                  
                                  <div className="flex space-x-2.5 pt-1">
                                    <button onClick={() => handleLedgerEdit(entry)} className="text-slate-400 hover:text-primary"><Edit2 className="w-3 h-3" /></button>
                                    <button onClick={() => handleLedgerDelete(entry.id)} className="text-red-400 hover:text-red-650"><Trash2 className="w-3 h-3" /></button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </details>
                      ));
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Note & Other simple type Details View Fallback */}
            {!['debts', 'deposits', 'chits'].includes(activeRecord.recordType) && activeRecord.notes && (
              <div className="space-y-1 bg-yellow-50/20 dark:bg-slate-900 p-3.5 rounded-2xl border border-yellow-200/10 text-xs font-semibold">
                <span className="text-[9px] font-black text-slate-405 uppercase">Notes & Reminders</span>
                <p className="text-slate-655 dark:text-slate-300 mt-1 leading-relaxed">{activeRecord.notes || activeRecord.content}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            {activeRecord.status === 'pending' && activeRecord.recordType === 'debts' && (
              <Button onClick={() => { markAsPaid(activeRecord); setIsDrawerOpen(false); }} variant="primary" className="flex-1 text-xs font-bold">Mark as Paid</Button>
            )}
            <Button onClick={() => handleEditRecord(activeRecord.recordType.slice(0, -1), activeRecord)} variant="ghost" className="flex-1 text-xs font-bold">Edit Record Info</Button>
            <Button onClick={() => handleDeleteItem(activeRecord.recordType.slice(0, -1), activeRecord.id)} variant="danger" className="text-xs font-bold">Delete Record</Button>
          </div>
        </div>
      )}

      {/* 17. Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40">
        {isFabOpen && (
          <div className="absolute bottom-16 right-0 bg-white dark:bg-slate-950 p-2.5 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col space-y-1 animate-in slide-in-from-bottom-5 duration-200">
            <FabItem label="Add Debt/Loan" onClick={() => { setModalType('debt'); setEditingId(null); setIsModalOpen(true); setIsFabOpen(false); }} />
            <FabItem label="Add Deposit" onClick={() => { setModalType('deposit'); setEditingId(null); setIsModalOpen(true); setIsFabOpen(false); }} />
            <FabItem label="Add Transfer" onClick={() => { setModalType('transfer'); setEditingId(null); setIsModalOpen(true); setIsFabOpen(false); }} />
            <FabItem label="Add Chit Fund" onClick={() => { setModalType('chit'); setEditingId(null); setIsModalOpen(true); setIsFabOpen(false); }} />
            <FabItem label="Add Note" onClick={() => { setModalType('note'); setEditingId(null); setIsModalOpen(true); setIsFabOpen(false); }} />
          </div>
        )}
        <button 
          onClick={() => setIsFabOpen(!isFabOpen)}
          className="w-12 h-12 rounded-full bg-primary text-white shadow-xl hover:scale-110 active:scale-95 transition flex items-center justify-center text-2xl font-bold"
        >
          <X className={`w-6 h-6 transition-transform ${isFabOpen ? 'rotate-45' : ''}`} />
        </button>
      </div>

      {/* Add / Edit Unified Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-950 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-base font-bold capitalize">{editingId ? `Edit ${modalType}` : `Add ${modalType}`}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">×</button>
            </div>
            
            {/* Form selectors (only when adding new) */}
            {!editingId && (
              <div className="px-6 pt-4 flex gap-1.5 overflow-x-auto text-[10px] font-black uppercase tracking-wider">
                <FormSelector active={modalType === 'debt'} label="Debt/Loan" onClick={() => setModalType('debt')} />
                <FormSelector active={modalType === 'deposit'} label="Deposit" onClick={() => setModalType('deposit')} />
                <FormSelector active={modalType === 'transfer'} label="Transfer" onClick={() => setModalType('transfer')} />
                <FormSelector active={modalType === 'chit'} label="Chit Fund" onClick={() => setModalType('chit')} />
                <FormSelector active={modalType === 'note'} label="Personal Note" onClick={() => setModalType('note')} />
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs font-semibold">
              
              {/* DEBT FORM FIELDS */}
              {modalType === 'debt' && (
                <>
                  <div>
                    <label className="block mb-1">Person Name *</label>
                    <input
                      type="text" required value={debtForm.person_name}
                      onChange={e => setDebtForm(f => ({ ...f, person_name: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1">Amount (₹) *</label>
                      <input
                        type="number" required min="1" value={debtForm.amount}
                        onChange={e => setDebtForm(f => ({ ...f, amount: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block mb-1">Type *</label>
                      <select
                        value={debtForm.type}
                        onChange={e => setDebtForm(f => ({ ...f, type: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                      >
                        <option value="borrowed">Borrowed</option>
                        <option value="lent">Lent</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1">Date *</label>
                      <input
                        type="date" required value={debtForm.date}
                        onChange={e => setDebtForm(f => ({ ...f, date: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block mb-1">Due Date</label>
                      <input
                        type="date" value={debtForm.due_date}
                        onChange={e => setDebtForm(f => ({ ...f, due_date: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1">Status</label>
                    <select
                      value={debtForm.status}
                      onChange={e => setDebtForm(f => ({ ...f, status: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1">Notes</label>
                    <textarea
                      rows={2} value={debtForm.notes}
                      onChange={e => setDebtForm(f => ({ ...f, notes: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                </>
              )}

              {/* DEPOSIT FORM FIELDS */}
              {modalType === 'deposit' && (
                <>
                  <div>
                    <label className="block mb-1">Deposit Name *</label>
                    <input
                      type="text" required placeholder="LIC Plan, Gold SIP" value={depositForm.name}
                      onChange={e => setDepositForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1">Category *</label>
                      <select
                        value={depositForm.category}
                        onChange={e => setDepositForm(f => ({ ...f, category: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                      >
                        <option value="LIC">LIC</option>
                        <option value="Gold Scheme">Gold Scheme</option>
                        <option value="Fixed Deposit">Fixed Deposit</option>
                        <option value="Monthly Savings">Monthly Savings</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block mb-1">Status</label>
                      <select
                        value={depositForm.status}
                        onChange={e => setDepositForm(f => ({ ...f, status: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                      >
                        <option value="active">Active</option>
                        <option value="matured">Matured</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1">Monthly Contribution (₹)</label>
                      <input
                        type="number" value={depositForm.monthly_amount}
                        onChange={e => setDepositForm(f => ({ ...f, monthly_amount: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block mb-1">Total Paid (₹)</label>
                      <input
                        type="number" value={depositForm.total_amount_paid}
                        onChange={e => setDepositForm(f => ({ ...f, total_amount_paid: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 font-bold"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1">Start Date *</label>
                      <input
                        type="date" required value={depositForm.start_date}
                        onChange={e => setDepositForm(f => ({ ...f, start_date: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block mb-1">Maturity Date</label>
                      <input
                        type="date" value={depositForm.maturity_date}
                        onChange={e => setDepositForm(f => ({ ...f, maturity_date: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1">Notes</label>
                    <textarea
                      rows={2} value={depositForm.notes}
                      onChange={e => setDepositForm(f => ({ ...f, notes: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                </>
              )}

              {/* TRANSFER FORM FIELDS */}
              {modalType === 'transfer' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1">From Account *</label>
                      <input
                        type="text" required placeholder="e.g. HDFC Account" value={transferForm.from_account}
                        onChange={e => setTransferForm(f => ({ ...f, from_account: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block mb-1">To Account *</label>
                      <input
                        type="text" required placeholder="e.g. SBI Saving" value={transferForm.to_account}
                        onChange={e => setTransferForm(f => ({ ...f, to_account: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1">Amount (₹) *</label>
                      <input
                        type="number" required min="1" value={transferForm.amount}
                        onChange={e => setTransferForm(f => ({ ...f, amount: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block mb-1">Date *</label>
                      <input
                        type="date" required value={transferForm.date}
                        onChange={e => setTransferForm(f => ({ ...f, date: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1">Purpose</label>
                    <input
                      type="text" placeholder="e.g. Credit Card Payment" value={transferForm.purpose}
                      onChange={e => setTransferForm(f => ({ ...f, purpose: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block mb-1">Notes</label>
                    <textarea
                      rows={2} value={transferForm.notes}
                      onChange={e => setTransferForm(f => ({ ...f, notes: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                </>
              )}

              {/* CHIT FUND FORM FIELDS */}
              {modalType === 'chit' && (
                <>
                  <div>
                    <label className="block mb-1">Chit Name *</label>
                    <input
                      type="text" required placeholder="e.g. Sri Chits 1 Lakh" value={chitForm.name}
                      onChange={e => setChitForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1">Monthly Installment (₹) *</label>
                      <input
                        type="number" required min="1" value={chitForm.monthly_amount}
                        onChange={e => setChitForm(f => ({ ...f, monthly_amount: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block mb-1">Total Paid (₹)</label>
                      <input
                        type="number" value={chitForm.total_paid}
                        onChange={e => setChitForm(f => ({ ...f, total_paid: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 font-bold"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1">Remaining Installments *</label>
                      <input
                        type="number" required min="1" value={chitForm.remaining_installments}
                        onChange={e => setChitForm(f => ({ ...f, remaining_installments: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block mb-1">Status</label>
                      <select
                        value={chitForm.status}
                        onChange={e => setChitForm(f => ({ ...f, status: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                      >
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="terminated">Terminated</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1">Start Date *</label>
                      <input
                        type="date" required value={chitForm.start_date}
                        onChange={e => setChitForm(f => ({ ...f, start_date: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block mb-1">End Date</label>
                      <input
                        type="date" value={chitForm.end_date}
                        onChange={e => setChitForm(f => ({ ...f, end_date: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1">Notes</label>
                    <textarea
                      rows={2} value={chitForm.notes}
                      onChange={e => setChitForm(f => ({ ...f, notes: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                </>
              )}

              {/* NOTE FORM FIELDS */}
              {modalType === 'note' && (
                <>
                  <div>
                    <label className="block mb-1">Note Title</label>
                    <input
                      type="text" placeholder="Collect money from Suresh" value={noteForm.title}
                      onChange={e => setNoteForm(f => ({ ...f, title: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block mb-1">Reminders / Details *</label>
                    <textarea
                      rows={4} required placeholder="Write your financial reminders..." value={noteForm.content}
                      onChange={e => setNoteForm(f => ({ ...f, content: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox" id="modal_is_pinned" checked={noteForm.is_pinned}
                      onChange={e => setNoteForm(f => ({ ...f, is_pinned: e.target.checked }))}
                      className="rounded text-primary focus:ring-primary w-4 h-4"
                    />
                    <label htmlFor="modal_is_pinned" className="cursor-pointer">Pin to top of ledger list</label>
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button variant="primary" type="submit">Save Record</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  function resetForms() {
    setEditingId(null);
    setDebtForm({
      person_name: '', amount: '', type: 'borrowed', date: new Date().toISOString().slice(0, 10),
      due_date: '', status: 'pending', notes: ''
    });
    setDepositForm({
      name: '', category: 'LIC', monthly_amount: '', total_amount_paid: '',
      start_date: new Date().toISOString().slice(0, 10), maturity_date: '', status: 'active', notes: ''
    });
    setTransferForm({
      from_account: '', to_account: '', amount: '', date: new Date().toISOString().slice(0, 10),
      purpose: '', notes: ''
    });
    setChitForm({
      name: '', monthly_amount: '', total_paid: '', remaining_installments: '',
      start_date: new Date().toISOString().slice(0, 10), end_date: '', status: 'active', notes: ''
    });
    setNoteForm({
      title: '', content: '', is_pinned: false
    });
  }
}

// Helper components
function KPICard({ title, amount, icon, color, bg, trend }: any) {
  return (
    <div className="bg-white dark:bg-slate-950 p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between h-28 relative overflow-hidden group hover:shadow transition-shadow">
      <div className={`absolute -top-4 -right-4 w-12 h-12 rounded-full ${bg} opacity-10 group-hover:scale-110 transition-transform`} />
      <div className="flex items-center space-x-2">
        {icon}
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</span>
      </div>
      <div>
        <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1 font-mono">₹{amount.toLocaleString('en-IN')}</h3>
        <span className={`text-[9px] font-semibold ${color} block mt-0.5`}>{trend}</span>
      </div>
    </div>
  );
}

function TabPill({ id, label, active, onClick }: { id: any; label: string; active: boolean; onClick: (id: any) => void }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`px-4 py-2.5 text-xs font-extrabold rounded-xl transition-all flex-shrink-0 ${
        active 
          ? 'bg-primary text-white shadow-md shadow-primary/20' 
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  let badgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  if (s === 'paid' || s === 'completed') badgeColor = 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300';
  else if (s === 'pending') badgeColor = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300';
  else if (s === 'overdue') badgeColor = 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300';
  else if (s === 'active') badgeColor = 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300';
  else if (s === 'closed') badgeColor = 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${badgeColor}`}>
      {status}
    </span>
  );
}

function EmptyLedgerState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="py-16 text-center text-slate-400 max-w-md mx-auto space-y-4">
      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto">
        <FolderOpen className="w-8 h-8 text-slate-400" />
      </div>
      <div>
        <h4 className="font-bold text-slate-900 dark:text-white text-sm">No Ledger Records Found</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Make this section your central finance repository. Create your first record now.
        </p>
      </div>
      <Button onClick={onAdd} className="text-xs font-bold px-4 py-2">Create First Record</Button>
    </div>
  );
}

function FormSelector({ active, label, onClick }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold ${
        active 
          ? 'bg-primary text-white border-primary shadow-sm' 
          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
      }`}
    >
      {label}
    </button>
  );
}

function FabItem({ label, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="px-3.5 py-2 text-[10px] font-extrabold text-left hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-lg whitespace-nowrap transition"
    >
      {label}
    </button>
  );
}
