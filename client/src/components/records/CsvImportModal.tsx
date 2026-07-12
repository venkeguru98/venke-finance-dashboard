import React, { useState } from 'react';
import axios from 'axios';
import { X, Upload, Download, CheckCircle, AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';
import { parseCsvDate } from '../../utils/date';


interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  importUrl: string; // E.g. `${API}/records/lic/${policyId}/import`
  moduleType: 'lic' | 'gold' | 'chit' | 'savings' | 'debt' | 'mutual';
}

interface ParsedRow {
  rowNum: number;
  date: string;
  description: string;
  amount: number;
  type?: 'Credit' | 'Debit' | 'Borrowed' | 'Lent' | 'SIP' | 'Lumpsum' | 'Redemption';
  nav?: number;
  units?: number;
  notes?: string;
  isValid: boolean;
  error?: string;
}

export default function CsvImportModal({ isOpen, onClose, onSuccess, importUrl, moduleType }: CsvImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isValidated, setIsValidated] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  if (!isOpen) return null;

  // Generate and download sample template
  const handleDownloadSample = () => {
    let headers = 'Date,Description,Debit Amount,Credit Amount\n';
    let sampleRow = '2026-07-01,Sample Premium/Payment Out,1500.00,\n';
    
    if (moduleType === 'mutual') {
      headers = 'Date,Fund Name,Transaction Type,Investment Amount,NAV,Units,Remarks\n';
      sampleRow = '2026-07-01,SBI Small Cap Fund,SIP,5000.00,125.45,39.856,Monthly SIP Installment\n2026-07-05,SBI Small Cap Fund,Redemption,2000.00,126.10,15.860,Partial redemption';
    } else if (moduleType === 'savings') {
      sampleRow = '2026-07-01,Salary Credit,,50000.00\n2026-07-02,Rent Debit,15000.00,';
    } else if (moduleType === 'debt') {
      sampleRow = '2026-07-01,Borrowed from Ravi,,10000.00\n2026-07-02,Lent to Ashok,5000.00,';
    } else if (moduleType === 'gold') {
      sampleRow = '2026-07-01,Gold Purchase,2500.00,';
    } else if (moduleType === 'chit') {
      sampleRow = '2026-07-01,Chit Installment 1,3000.00,';
    }

    const csvContent = headers + sampleRow;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${moduleType}_sample_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Simple CSV parser
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setIsValidated(false);
    setParsedRows([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(selected);
  };

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/);
    if (lines.length === 0) return;

    // Standard columns: Date, Description, Debit Amount, Credit Amount
    const rows: ParsedRow[] = [];
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Ignore empty lines

      // Basic comma splitter (handles optional quotes around columns)
      const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
      
      const rowNum = i + 1;

      if (moduleType === 'mutual') {
        const dateStr = cols[0];
        const typeStr = cols[2];
        const amountStr = cols[3];
        const navStr = cols[4];
        const unitsStr = cols[5];
        const remarksStr = cols[6];

        let amount = Number(amountStr);
        let nav = Number(navStr);
        let units = Number(unitsStr);
        let type = (typeStr || 'SIP') as 'SIP' | 'Lumpsum' | 'Redemption';
        let isValid = true;
        let error = '';

        const parsedDate = parseCsvDate(dateStr);
        if (!parsedDate) {
          isValid = false;
          error = 'Invalid date format (supported: DD/MM/YYYY, YYYY-MM-DD).';
        } else if (!typeStr || !['SIP', 'Lumpsum', 'Redemption', 'Redeemed'].includes(typeStr)) {
          isValid = false;
          error = 'Type must be SIP, Lumpsum, or Redemption.';
        } else if (isNaN(amount) || amount <= 0) {
          isValid = false;
          error = 'Amount must be a positive number.';
        } else if (isNaN(nav) || nav <= 0) {
          isValid = false;
          error = 'NAV must be a positive number.';
        } else if (isNaN(units) || units <= 0) {
          isValid = false;
          error = 'Units must be a positive number.';
        }

        if (typeStr === 'Redeemed') type = 'Redemption';

        rows.push({
          rowNum,
          date: parsedDate || dateStr,
          description: remarksStr || `${type} Investment`,
          amount,
          nav,
          units,
          type,
          isValid,
          error
        });
        continue;
      }

      const dateStr = cols[0];
      const descStr = cols[1];
      const debitStr = cols[2];
      const creditStr = cols[3];

      let amount = 0;
      let type: 'Credit' | 'Debit' | 'Borrowed' | 'Lent' | undefined;
      let isValid = true;
      let error = '';

      // 1. Validate Date
      const parsedDate = parseCsvDate(dateStr);
      if (!parsedDate) {
        isValid = false;
        error = 'Invalid date format (supported: DD/MM/YYYY, YYYY-MM-DD).';
      }

      // 2. Validate Description
      if (isValid && !descStr) {
        isValid = false;
        error = 'Missing description.';
      }

      // 3. Parse and Validate Amounts
      const debit = debitStr ? Number(debitStr) : 0;
      const credit = creditStr ? Number(creditStr) : 0;

      if (isValid) {
        if (isNaN(debit) || isNaN(credit) || debit < 0 || credit < 0) {
          isValid = false;
          error = 'Amounts must be positive numbers.';
        } else if (debit === 0 && credit === 0) {
          isValid = false;
          error = 'Both Debit and Credit amounts cannot be empty.';
        } else if (debit > 0 && credit > 0) {
          isValid = false;
          error = 'A transaction cannot have both Debit and Credit amounts.';
        } else {
          // Map based on module rules
          if (moduleType === 'savings') {
            type = credit > 0 ? 'Credit' : 'Debit';
            amount = credit > 0 ? credit : debit;
          } else if (moduleType === 'debt') {
            type = credit > 0 ? 'Borrowed' : 'Lent';
            amount = credit > 0 ? credit : debit;
          } else {
            // For LIC, Gold, Chit: treat as premium/installment paid (money out)
            amount = debit > 0 ? debit : credit;
          }
        }
      }

      rows.push({
        rowNum,
        date: parsedDate || dateStr,
        description: descStr,
        amount,
        type,
        notes: descStr,
        isValid,
        error
      });
    }

    setParsedRows(rows);
    setIsValidated(true);
  };

  const handleConfirmImport = async () => {
    const validTransactions = parsedRows.filter(r => r.isValid);
    if (validTransactions.length === 0) {
      alert('No valid rows to import.');
      return;
    }

    setIsImporting(true);
    try {
      await axios.post(importUrl, { transactions: validTransactions });
      onSuccess(`Successfully imported ${validTransactions.length} transactions!`);
      onClose();
    } catch (_) {
      alert('Failed to import CSV transactions. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Body */}
      <div className="relative w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh] text-xs font-semibold text-slate-350">
        <div className="flex justify-between items-center pb-3 border-b border-slate-900 shrink-0">
          <div>
            <h3 className="text-base font-bold text-white uppercase tracking-wider">CSV Data Import Wizard</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">{moduleType} Module Integration</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-5 space-y-5 custom-scrollbar">
          {/* Action Row */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-900/30 border border-slate-900 p-4 rounded-2xl">
            <div className="flex items-center space-x-3">
              <label className="cursor-pointer bg-primary hover:bg-blue-600 text-white font-extrabold px-4.5 py-2.5 rounded-xl flex items-center space-x-2 transition shadow-lg shadow-primary/20">
                <Upload className="w-4.5 h-4.5" />
                <span>Upload CSV File</span>
                <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
              </label>
              {file && <span className="text-[11px] font-bold text-white truncate max-w-[180px]">{file.name}</span>}
            </div>

            <Button onClick={handleDownloadSample} variant="ghost" className="border border-slate-800 text-slate-400 hover:text-white">
              <Download className="w-4 h-4 mr-1.5" /> Download Sample CSV
            </Button>
          </div>

          {/* Validation Report */}
          {isValidated && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 shrink-0">
                <div className="p-3 bg-slate-900/40 border border-slate-900 rounded-xl text-center">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Total Rows</p>
                  <p className="text-lg font-black text-white mt-0.5">{parsedRows.length}</p>
                </div>
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-center text-green-400">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Valid Rows</p>
                  <p className="text-lg font-black mt-0.5">{validCount}</p>
                </div>
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center text-red-400">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Invalid Rows</p>
                  <p className="text-lg font-black mt-0.5">{invalidCount}</p>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-900 rounded-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400 text-[10px] font-black uppercase border-b border-slate-900">
                      <th className="py-2.5 px-3 w-16">Row</th>
                      <th className="py-2.5 px-2 w-24">Status</th>
                      <th className="py-2.5 px-2 w-28">Date</th>
                      <th className="py-2.5 px-2">Description</th>
                      <th className="py-2.5 px-2 w-28 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((r, index) => (
                      <tr key={index} className="border-b border-slate-900/50 hover:bg-slate-900/20">
                        <td className="py-2.5 px-3 text-slate-500 font-mono">#{r.rowNum}</td>
                        <td className="py-2.5 px-2">
                          {r.isValid ? (
                            <span className="inline-flex items-center text-green-400 gap-1 text-[9px] uppercase font-black bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/10">
                              <CheckCircle className="w-3 h-3" /> Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-red-400 gap-1 text-[9px] uppercase font-black bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/10" title={r.error}>
                              <AlertTriangle className="w-3 h-3" /> Error
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-white font-mono">{r.date}</td>
                        <td className="py-2.5 px-2">
                          <p className="text-white truncate max-w-[200px]" title={r.description}>{r.description}</p>
                          {!r.isValid && <p className="text-[10px] text-red-400 font-bold mt-0.5">{r.error}</p>}
                        </td>
                        <td className="py-2.5 px-2 text-right font-black text-white font-mono">
                          {r.type ? (
                            <span className={r.type === 'Credit' || r.type === 'Borrowed' || r.type === 'SIP' || r.type === 'Lumpsum' ? 'text-green-400' : 'text-red-400'}>
                              {r.type === 'Credit' || r.type === 'Borrowed' || r.type === 'SIP' || r.type === 'Lumpsum' ? '+' : '-'}₹{r.amount.toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span>₹{r.amount.toLocaleString('en-IN')}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {invalidCount > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Some rows contain formatting or validation errors. Confirming import will **skip these rows** and only process the ready transactions.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-3 border-t border-slate-900 shrink-0">
          <Button onClick={onClose} variant="ghost">Cancel</Button>
          <Button 
            onClick={handleConfirmImport} 
            variant="primary" 
            disabled={!isValidated || validCount === 0 || isImporting}
            className="px-5 bg-primary hover:bg-blue-600 font-extrabold text-white"
          >
            {isImporting ? 'Importing...' : `Confirm Import (${validCount} Rows)`}
          </Button>
        </div>
      </div>
    </div>
  );
}
