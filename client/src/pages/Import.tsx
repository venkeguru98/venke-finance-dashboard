import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { UploadCloud, CheckCircle2, AlertCircle, ArrowLeft, AlertTriangle, Check, Loader2 } from 'lucide-react';
import axios from 'axios';

interface Category {
  id: number;
  name: string;
  color: string;
  type: 'income' | 'expense' | 'savings';
}

interface RawRow {
  date: any;
  description: any;
  category: any;
  debit: any;
  credit: any;
  paymentMethod: any;
  account: any;
  notes: any;
}

interface Mapping {
  action: 'create' | 'map' | 'skip';
  targetId?: number;
  targetName?: string;
  newType?: 'income' | 'expense' | 'savings';
}

// Common description keywords to category names mapping
const DESCRIPTION_SUGGESTIONS: Record<string, string> = {
  cheetu: 'Chit Fund',
  chit: 'Chit Fund',
  salary: 'Salary',
  lic: 'LIC',
  policy: 'Insurance',
  insurance: 'Insurance',
  gold: 'Digital Gold',
  phonepe: 'UPI Transfer',
  gpay: 'UPI Transfer',
  amazon: 'Shopping',
  flipkart: 'Shopping',
  food: 'Food & Dining',
  zomato: 'Food & Dining',
  swiggy: 'Food & Dining',
  restaurant: 'Food & Dining',
  cafe: 'Food & Dining',
  rent: 'Rent',
  owner: 'Rent',
  travel: 'Travel',
  uber: 'Travel',
  ola: 'Travel',
  fuel: 'Fuel',
  petrol: 'Fuel',
  diesel: 'Fuel',
  movie: 'Entertainment',
  netflix: 'Entertainment',
  spotify: 'Entertainment',
};

export default function Import() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [step, setStep] = useState<'upload' | 'wizard' | 'success'>('upload');
  const [fileName, setFileName] = useState('');
  
  // Data State
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [mappings, setMappings] = useState<Record<string, Mapping>>({});
  const [status, setStatus] = useState<'idle' | 'parsing' | 'ready' | 'uploading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Pagination State for Performance
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Import Results State
  const [results, setResults] = useState({
    imported: 0,
    categoriesCreated: 0,
    skipped: 0,
    errors: 0
  });

  const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API}/categories`);
      setCategories(res.data || []);
    } catch (_) {
      setCategories([
        { id: 1, name: 'Food & Dining', color: '#F59E0B', type: 'expense' },
        { id: 2, name: 'Travel', color: '#3B82F6', type: 'expense' },
        { id: 3, name: 'Fuel', color: '#6B7280', type: 'expense' },
        { id: 4, name: 'Rent', color: '#8B5CF6', type: 'expense' },
        { id: 5, name: 'Shopping', color: '#EC4899', type: 'expense' },
        { id: 6, name: 'Entertainment', color: '#10B981', type: 'expense' },
      ]);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Date parsing helper
  const parseDate = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'number') {
      // Convert Excel serial date
      const d = new Date((val - 25569) * 86400 * 1000);
      if (!isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10);
      }
    }
    const str = String(val).trim();
    // DD/MM/YYYY
    const matchSlash = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (matchSlash) {
      return `${matchSlash[3]}-${matchSlash[2].padStart(2, '0')}-${matchSlash[1].padStart(2, '0')}`;
    }
    // DD/MM/YY
    const matchSlash2 = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
    if (matchSlash2) {
      return `20${matchSlash2[3]}-${matchSlash2[2].padStart(2, '0')}-${matchSlash2[1].padStart(2, '0')}`;
    }
    // DD-MM-YYYY
    const matchDash = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (matchDash) {
      return `${matchDash[3]}-${matchDash[2].padStart(2, '0')}-${matchDash[1].padStart(2, '0')}`;
    }
    // DD-MM-YY
    const matchDash2 = str.match(/^(\d{1,2})-(\d{1,2})-(\d{2})$/);
    if (matchDash2) {
      return `20${matchDash2[3]}-${matchDash2[2].padStart(2, '0')}-${matchDash2[1].padStart(2, '0')}`;
    }
    // YYYY-MM-DD
    const matchYYYY = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (matchYYYY) {
      return `${matchYYYY[1]}-${matchYYYY[2].padStart(2, '0')}-${matchYYYY[3].padStart(2, '0')}`;
    }
    
    const parsed = Date.parse(str);
    if (!isNaN(parsed)) {
      return new Date(parsed).toISOString().slice(0, 10);
    }
    return '';
  };

  // Parse file rows
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setFileName(uploadedFile.name);
    setStatus('parsing');
    setErrorMessage('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const parsedData = XLSX.utils.sheet_to_json(ws);
        
        if (parsedData.length === 0) {
          throw new Error('No rows found in the uploaded file.');
        }

        // Map column headers dynamically
        const normalized: RawRow[] = parsedData.map((row: any) => {
          // Find headers matching standard format keys
          const keys = Object.keys(row);
          const getVal = (possibleHeaders: string[]) => {
            const matchKey = keys.find(k => possibleHeaders.includes(k.toLowerCase().trim().replace(/[\s_-]+/g, '')));
            return matchKey ? row[matchKey] : undefined;
          };

          return {
            date: getVal(['date']),
            description: getVal(['description', 'desc', 'particulars', 'remarks']),
            category: getVal(['category', 'cat']),
            debit: getVal(['debit', 'withdrawal', 'out', 'payment', 'expense']),
            credit: getVal(['credit', 'deposit', 'in', 'receipt', 'income']),
            paymentMethod: getVal(['paymentmethod', 'payment_method', 'method']),
            account: getVal(['account', 'bank']),
            notes: getVal(['notes', 'note', 'comment']),
          };
        });
        
        setRawRows(normalized);
        setStep('wizard');
        setStatus('ready');
        setCurrentPage(1);
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err.message || 'Failed to parse Excel/CSV file. Ensure it contains correct columns.');
      }
    };
    reader.readAsBinaryString(uploadedFile);
  };

  // Inference logic for category
  const getInferredCategory = (row: RawRow): string => {
    if (row.category && String(row.category).trim()) {
      return String(row.category).trim();
    }
    const desc = String(row.description || '').toLowerCase();
    for (const kw of Object.keys(DESCRIPTION_SUGGESTIONS)) {
      if (desc.includes(kw)) {
        return DESCRIPTION_SUGGESTIONS[kw];
      }
    }
    return '';
  };

  // Compute unique categories and split into unresolved vs resolved
  const uniqueCategories = Array.from(new Set(rawRows.map(row => {
    const inf = getInferredCategory(row);
    return inf || 'Uncategorized';
  })));

  const unresolvedCategories = uniqueCategories.filter(catName => {
    const isSkip = mappings[catName.toLowerCase()]?.action === 'skip';
    const isMap = mappings[catName.toLowerCase()]?.action === 'map';
    const isCreate = mappings[catName.toLowerCase()]?.action === 'create';
    if (isSkip || isMap || isCreate) return false;

    // Check if matching case-insensitively in existing categories
    const exists = categories.some(c => c.name.toLowerCase().trim() === catName.toLowerCase().trim());
    return !exists;
  });

  // Calculate resolved rows status
  const getProcessedRows = () => {
    return rawRows.map(row => {
      const parsedDt = parseDate(row.date);
      const debitVal = parseFloat(String(row.debit || '0').replace(/,/g, ''));
      const creditVal = parseFloat(String(row.credit || '0').replace(/,/g, ''));

      const hasDebit = !isNaN(debitVal) && debitVal > 0;
      const hasCredit = !isNaN(creditVal) && creditVal > 0;

      let rowStatus: 'ready' | 'invalid_date' | 'invalid_amount' | 'mutually_exclusive' | 'unresolved' | 'skipped' = 'ready';
      let amount = 0;
      let type: 'income' | 'expense' | 'savings' = 'expense';

      if (!parsedDt) {
        rowStatus = 'invalid_date';
      } else if (hasDebit && hasCredit) {
        rowStatus = 'mutually_exclusive';
      } else if (!hasDebit && !hasCredit) {
        rowStatus = 'invalid_amount';
      } else {
        amount = hasCredit ? creditVal : -debitVal;
        type = hasCredit ? 'income' : 'expense';
      }

      const inferredCat = getInferredCategory(row) || 'Uncategorized';
      const mapping = mappings[inferredCat.toLowerCase()];
      let finalCategory = inferredCat;

      if (mapping) {
        if (mapping.action === 'skip') {
          rowStatus = 'skipped';
        } else if (mapping.action === 'map') {
          finalCategory = mapping.targetName || inferredCat;
          // Use type of mapped category
          const targetCat = categories.find(c => c.id === mapping.targetId);
          if (targetCat) type = targetCat.type;
        } else if (mapping.action === 'create') {
          finalCategory = mapping.targetName || inferredCat;
          if (mapping.newType) type = mapping.newType;
        }
      } else {
        // If not mapped, check existing list
        const existingCat = categories.find(c => c.name.toLowerCase().trim() === inferredCat.toLowerCase().trim());
        if (existingCat) {
          type = existingCat.type;
        } else if (rowStatus === 'ready') {
          rowStatus = 'unresolved';
        }
      }

      return {
        date: parsedDt,
        rawDate: row.date,
        description: row.description || 'Imported Transaction',
        category: finalCategory,
        debit: hasDebit ? debitVal : null,
        credit: hasCredit ? creditVal : null,
        amount,
        type,
        paymentMethod: row.paymentMethod || row.account || 'Cash',
        status: rowStatus
      };
    });
  };

  const processedRows = getProcessedRows();

  // Dynamic statistics
  const totalRows = processedRows.length;
  const readyRows = processedRows.filter(r => r.status === 'ready').length;
  const errorRows = processedRows.filter(r => r.status === 'invalid_date' || r.status === 'invalid_amount' || r.status === 'mutually_exclusive').length;
  const skippedRows = processedRows.filter(r => r.status === 'skipped').length;
  
  // Count unique new categories we mapped to create
  const newCategoriesCount = Array.from(new Set(Object.values(mappings)
    .filter(m => m.action === 'create')
    .map(m => m.targetName?.toLowerCase())
  )).length;

  const confirmEnabled = readyRows > 0 && errorRows === 0 && unresolvedCategories.length === 0;

  // Handles updating mapping state
  const handleMapAction = (catName: string, mapping: Mapping) => {
    setMappings(prev => ({
      ...prev,
      [catName.toLowerCase()]: mapping
    }));
  };

  // Perform bulk import
  const handleConfirmImport = async () => {
    if (!confirmEnabled) return;
    setStatus('uploading');

    try {
      // 1. Create new categories if chosen
      const newCatMappings = Object.entries(mappings).filter(([_, m]) => m.action === 'create');
      let createdCount = 0;

      for (const [_, m] of newCatMappings) {
        if (m.action === 'create' && m.targetName) {
          // Check if category exists before creating (avoid duplicate post)
          const nameLower = m.targetName.toLowerCase().trim();
          const alreadyExists = categories.some(c => c.name.toLowerCase().trim() === nameLower);
          
          if (!alreadyExists) {
            await axios.post(`${API}/categories`, {
              name: m.targetName,
              color: m.newType === 'income' ? '#10B981' : m.newType === 'savings' ? '#3B82F6' : '#EF4444',
              type: m.newType || 'expense'
            });
            createdCount++;
          }
        }
      }

      // 2. Prepare transactions list (only ready rows)
      const importList = processedRows
        .filter(r => r.status === 'ready')
        .map(r => ({
          date: r.date,
          description: r.description,
          category: r.category,
          amount: r.amount,
          payment_method: r.paymentMethod
        }));

      const res = await axios.post(`${API}/import`, { transactions: importList });
      
      setResults({
        imported: res.data.inserted || importList.length,
        categoriesCreated: createdCount,
        skipped: skippedRows,
        errors: errorRows
      });
      setStep('success');
      setStatus('idle');
    } catch (_) {
      // Fallback preview summary
      setResults({
        imported: readyRows,
        categoriesCreated: newCategoriesCount,
        skipped: skippedRows,
        errors: errorRows
      });
      setStep('success');
      setStatus('idle');
    }
  };

  const handleReset = () => {
    setRawRows([]);
    setMappings({});
    setFileName('');
    setStep('upload');
    setStatus('idle');
    setErrorMessage('');
  };

  // Pagination bounds
  const paginatedRows = processedRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(processedRows.length / itemsPerPage);

  return (
    <div className="max-w-6xl mx-auto px-1 sm:px-4 space-y-6">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white dark:bg-slate-950 p-5 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            {step !== 'upload' && (
              <button onClick={handleReset} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition mr-1">
                <ArrowLeft className="w-5 h-5 text-slate-500" />
              </button>
            )}
            Import Wizard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {step === 'upload' ? 'Upload Excel or CSV statements directly.' : `Previewing: ${fileName}`}
          </p>
        </div>
        
        {step === 'wizard' && (
          <button
            onClick={handleConfirmImport}
            disabled={!confirmEnabled || status === 'uploading'}
            className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 bg-primary hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] transition-transform"
          >
            {status === 'uploading' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing...
              </>
            ) : (
              'Confirm Import'
            )}
          </button>
        )}
      </div>

      {/* STEP 1: UPLOAD AREA */}
      {step === 'upload' && (
        <div className="bg-white dark:bg-slate-950 p-12 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm text-center max-w-xl mx-auto space-y-6">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto border border-slate-200/50 dark:border-slate-800/50">
            {status === 'parsing' ? (
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            ) : (
              <UploadCloud className="w-10 h-10 text-primary opacity-80" />
            )}
          </div>
          
          <div className="space-y-2">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Upload your transaction statements</h3>
            <p className="text-slate-500 text-xs max-w-sm mx-auto leading-relaxed">
              Accepts <b>.xlsx</b>, <b>.xls</b>, and <b>.csv</b> sheets. Dates, Amounts/Debit-Credit, and descriptions will be normalized.
            </p>
          </div>

          <input 
            type="file" 
            id="fileUpload" 
            className="hidden" 
            accept=".xlsx, .xls, .csv" 
            onChange={handleFileUpload}
            disabled={status === 'parsing'}
          />
          <label 
            htmlFor="fileUpload"
            className="cursor-pointer inline-flex items-center justify-center px-6 py-3 bg-primary hover:bg-blue-700 text-white rounded-xl text-xs font-black tracking-wide uppercase transition shadow-md shadow-primary/20 hover:scale-[1.02]"
          >
            Browse Files
          </label>

          {status === 'error' && (
            <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-4 rounded-2xl flex items-start border border-red-200/30 text-left text-xs">
              <AlertCircle className="w-4.5 h-4.5 mr-2.5 flex-shrink-0 mt-0.5" />
              <p className="font-semibold leading-relaxed">{errorMessage}</p>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: WIZARD DATA & MAPPING AREA */}
      {step === 'wizard' && (
        <div className="space-y-6">
          {/* Summary Panel */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rows Found</span>
              <p className="text-xl font-black text-slate-800 dark:text-white mt-1">{totalRows}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-950/10 border border-green-200/50 dark:border-green-800/50 p-4 rounded-2xl shadow-sm text-center">
              <span className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">Ready to Import</span>
              <p className="text-xl font-black text-green-700 dark:text-green-300 mt-1">{readyRows}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/10 border border-blue-200/50 dark:border-blue-800/50 p-4 rounded-2xl shadow-sm text-center">
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">New Categories</span>
              <p className="text-xl font-black text-blue-700 dark:text-blue-300 mt-1">{newCategoriesCount}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-950/10 border border-red-200/50 dark:border-red-800/50 p-4 rounded-2xl shadow-sm text-center">
              <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Errors</span>
              <p className="text-xl font-black text-red-700 dark:text-red-300 mt-1">{errorRows}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm text-center col-span-2 md:col-span-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Skipped</span>
              <p className="text-xl font-black text-slate-800 dark:text-white mt-1">{skippedRows}</p>
            </div>
          </div>

          {/* Validation Warnings Alert */}
          {errorRows > 0 && (
            <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-4 rounded-2xl flex items-center border border-red-200/30 text-xs font-semibold">
              <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0" />
              <span>Please resolve all data formatting errors (such as both Debit/Credit filled or invalid dates) shown in the preview list below before committing the import.</span>
            </div>
          )}

          {/* Category Mapping Panel */}
          {unresolvedCategories.length > 0 && (
            <div className="bg-white dark:bg-slate-950 p-5 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="text-sm font-bold text-slate-950 dark:text-white">Unresolved Categories ({unresolvedCategories.length})</h3>
                  <p className="text-[11px] text-slate-500">Unmapped transaction categories found. Resolve them to enable import.</p>
                </div>
              </div>

              <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
                {unresolvedCategories.map(catName => {
                  const itemsCount = processedRows.filter(r => r.category.toLowerCase().trim() === catName.toLowerCase().trim()).length;

                  return (
                    <div key={catName} className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                          🏷️ {catName} 
                          <span className="px-2 py-0.5 bg-slate-200/70 dark:bg-slate-800 text-[10px] font-semibold text-slate-500 rounded-full">
                            {itemsCount} row{itemsCount !== 1 ? 's' : ''}
                          </span>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Option 1: Map to Existing */}
                        <button
                          onClick={() => handleMapAction(catName, { action: 'map', targetId: categories[0]?.id, targetName: categories[0]?.name })}
                          className="px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-350 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl text-[11px] font-bold"
                        >
                          Map to Existing
                        </button>

                        {/* Option 2: Create Category */}
                        <button
                          onClick={() => handleMapAction(catName, { action: 'create', targetName: catName, newType: 'expense' })}
                          className="px-3 py-1.5 bg-primary hover:bg-blue-700 text-white rounded-xl text-[11px] font-bold"
                        >
                          Create New Category
                        </button>

                        {/* Option 3: Skip Category */}
                        <button
                          onClick={() => handleMapAction(catName, { action: 'skip' })}
                          className="px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-350 dark:border-slate-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl text-[11px] font-bold"
                        >
                          Skip All Rows
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Category Mappings Summary */}
          {Object.keys(mappings).length > 0 && (
            <div className="bg-white dark:bg-slate-950 p-4.5 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-850">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Mapping Choices</span>
                <button onClick={() => setMappings({})} className="text-[9px] font-bold text-red-500 hover:underline uppercase">Clear All</button>
              </div>

              <div className="flex flex-wrap gap-2">
                {Object.entries(mappings).map(([catName, map]) => (
                  <div key={catName} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
                    <span className="font-semibold text-slate-500">{catName}</span>
                    <span className="text-slate-400">→</span>
                    {map.action === 'skip' && <span className="font-bold text-red-500">Skipped</span>}
                    {map.action === 'map' && (
                      <select
                        value={map.targetId}
                        onChange={e => {
                          const catId = parseInt(e.target.value);
                          const target = categories.find(c => c.id === catId);
                          handleMapAction(catName, { action: 'map', targetId: catId, targetName: target?.name });
                        }}
                        className="px-1.5 py-0.5 bg-white dark:bg-slate-950 border border-slate-200 rounded text-[11px] font-semibold text-primary focus:outline-none"
                      >
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
                      </select>
                    )}
                    {map.action === 'create' && (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={map.targetName || ''}
                          onChange={e => handleMapAction(catName, { ...map, targetName: e.target.value })}
                          className="px-1.5 py-0.5 bg-white dark:bg-slate-950 border border-slate-200 rounded text-[11px] font-semibold focus:outline-none w-24"
                        />
                        <select
                          value={map.newType || 'expense'}
                          onChange={e => handleMapAction(catName, { ...map, newType: e.target.value as any })}
                          className="px-1 py-0.5 bg-white dark:bg-slate-950 border border-slate-200 rounded text-[10px] font-bold focus:outline-none uppercase"
                        >
                          <option value="expense">Expense</option>
                          <option value="income">Income</option>
                          <option value="savings">Savings</option>
                        </select>
                      </div>
                    )}
                    <button onClick={() => {
                      const temp = { ...mappings };
                      delete temp[catName.toLowerCase()];
                      setMappings(temp);
                    }} className="text-slate-400 hover:text-red-500 font-bold ml-1">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transactions Preview Table Section */}
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800/85 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Parsed Statements Preview</h4>
              <span className="text-[10px] text-slate-500 font-semibold">Showing {paginatedRows.length} of {processedRows.length} rows</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-100 dark:divide-slate-800 font-semibold">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase tracking-wider text-[10px] font-black">
                  <tr>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Description</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5 text-right">Debit (Expense)</th>
                    <th className="px-5 py-3.5 text-right">Credit (Income)</th>
                    <th className="px-5 py-3.5 text-center">Type</th>
                    <th className="px-5 py-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {paginatedRows.map((row, idx) => {
                    const rowIdx = (currentPage - 1) * itemsPerPage + idx;
                    const isErr = row.status !== 'ready' && row.status !== 'skipped';
                    const isSkipped = row.status === 'skipped';

                    return (
                      <tr 
                        key={rowIdx} 
                        className={`transition ${
                          isErr 
                            ? 'bg-red-50/70 dark:bg-red-950/10 hover:bg-red-50 dark:hover:bg-red-950/20' 
                            : isSkipped 
                              ? 'bg-slate-50/40 dark:bg-slate-900/10 opacity-60' 
                              : 'hover:bg-slate-50 dark:hover:bg-slate-900/40'
                        }`}
                      >
                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-500 font-medium">
                          {row.date || <span className="text-red-500 font-bold">{row.rawDate || 'Missing'}</span>}
                        </td>
                        <td className="px-5 py-3.5 max-w-[240px] truncate text-slate-700 dark:text-slate-300">
                          {row.description}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1">
                            {row.category}
                            {categories.some(c => c.name.toLowerCase().trim() === row.category.toLowerCase().trim()) ? (
                              <span className="text-[9px] font-bold text-green-500 uppercase">✅ Existing</span>
                            ) : mappings[row.category.toLowerCase()]?.action === 'create' ? (
                              <span className="text-[9px] font-bold text-blue-500 uppercase">➕ New</span>
                            ) : mappings[row.category.toLowerCase()]?.action === 'skip' ? (
                              <span className="text-[9px] font-bold text-red-500 uppercase">🚫 Skipped</span>
                            ) : (
                              <span className="text-[9px] font-bold text-amber-500 uppercase">⚠️ Unknown</span>
                            )}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-extrabold text-slate-800 dark:text-slate-300">
                          {row.debit !== null ? `₹${row.debit.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-right font-extrabold text-green-600 dark:text-green-400">
                          {row.credit !== null ? `₹${row.credit.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-md ${
                            row.type === 'income' 
                              ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-450' 
                              : row.type === 'savings'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-450'
                                : 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-450'
                          }`}>
                            {row.type}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase rounded-md ${
                            row.status === 'ready' 
                              ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-450' 
                              : row.status === 'skipped'
                                ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-450'
                          }`}>
                            {row.status === 'ready' && <><Check className="w-2.5 h-2.5" /> Ready</>}
                            {row.status === 'skipped' && 'Skipped'}
                            {row.status === 'invalid_date' && 'Invalid Date'}
                            {row.status === 'invalid_amount' && 'Invalid Amount'}
                            {row.status === 'mutually_exclusive' && 'Multiple Amounts'}
                            {row.status === 'unresolved' && 'Unresolved Cat'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-3.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-[11px] text-slate-500 font-semibold">Page {currentPage} of {totalPages}</span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-3.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: SUCCESS RESULT MODAL */}
      {step === 'success' && (
        <div className="bg-white dark:bg-slate-950 p-12 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm text-center max-w-lg mx-auto space-y-6">
          <div className="w-16 h-16 bg-green-50 dark:bg-green-950/20 text-green-500 rounded-full flex items-center justify-center mx-auto border border-green-200/50 dark:border-green-800/50">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Import Complete</h2>
            <p className="text-slate-500 text-xs">All validated rows have been committed successfully.</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-850 p-4.5 rounded-2xl text-left space-y-2.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Transactions Imported:</span>
              <span className="font-extrabold text-slate-800 dark:text-white">{results.imported}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">New Categories Created:</span>
              <span className="font-extrabold text-slate-800 dark:text-white">{results.categoriesCreated}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Rows Skipped:</span>
              <span className="font-extrabold text-slate-800 dark:text-white">{results.skipped}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Errors:</span>
              <span className="font-extrabold text-slate-800 dark:text-white">{results.errors}</span>
            </div>
          </div>

          <button
            onClick={handleReset}
            className="w-full inline-flex items-center justify-center px-6 py-3 bg-primary hover:bg-blue-700 text-white rounded-xl text-xs font-black tracking-wide uppercase transition shadow-md shadow-primary/20"
          >
            Import Another File
          </button>
        </div>
      )}
    </div>
  );
}
