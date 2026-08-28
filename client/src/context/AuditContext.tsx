import React, { createContext, useContext, useState, useEffect } from 'react';

export interface FieldDiff {
  field: string;
  oldVal: string;
  newVal: string;
}

export interface PendingMutation {
  id: string; // Composite key: e.g. "Transactions Tab:435"
  recordId: string | number;
  section: 'Transactions Tab' | 'Budget Planner' | 'Investments' | 'Settings' | 'Financial Records';
  title: string;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  timestamp: string;
  fields: FieldDiff[];
  originalRecord?: any;
}

interface AuditContextType {
  pendingMutations: PendingMutation[];
  trackMutation: (data: {
    section: 'Transactions Tab' | 'Budget Planner' | 'Investments' | 'Settings' | 'Financial Records';
    recordId: string | number;
    title: string;
    type: 'INSERT' | 'UPDATE' | 'DELETE';
    fields: FieldDiff[];
    originalRecord?: any;
  }) => void;
  removeMutation: (id: string) => void;
  clearMutations: () => void;
  commitMutations: () => void;
  revertAllMutations: () => void;
}

const AuditContext = createContext<AuditContextType | undefined>(undefined);

// Normalization helper to prevent type mismatch phantom mutations (e.g. 1500 vs "1500")
export const normalizeVal = (val: any): string => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  return JSON.stringify(val);
};

export const AuditProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pendingMutations, setPendingMutations] = useState<PendingMutation[]>(() => {
    try {
      const saved = localStorage.getItem('venke_pending_mutations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync mutations to localStorage for persistence across reloads
  useEffect(() => {
    try {
      localStorage.setItem('venke_pending_mutations', JSON.stringify(pendingMutations));
    } catch (e) {
      console.warn('[AuditStore] Failed to save pending mutations to storage:', e);
    }
  }, [pendingMutations]);

  const trackMutation: AuditContextType['trackMutation'] = (data) => {
    const compositeId = `${data.section}:${data.recordId}`;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Filter out fields where normalized oldVal equals newVal (no actual change)
    const validFields = data.fields.filter(f => normalizeVal(f.oldVal) !== normalizeVal(f.newVal));

    setPendingMutations(prev => {
      const existingIdx = prev.findIndex(m => m.id === compositeId);

      if (validFields.length === 0) {
        // If modified fields are reverted back to baseline values, remove from pending store
        if (existingIdx !== -1) {
          return prev.filter(m => m.id !== compositeId);
        }
        return prev;
      }

      if (existingIdx !== -1) {
        // Merge with existing mutation for the same composite key
        const updated = [...prev];
        const existing = updated[existingIdx];

        // Combine fields, replacing older diffs for the same field name
        const fieldMap = new Map<string, FieldDiff>();
        existing.fields.forEach(f => fieldMap.set(f.field.toUpperCase(), f));
        validFields.forEach(f => fieldMap.set(f.field.toUpperCase(), f));

        const mergedFields = Array.from(fieldMap.values()).filter(f => normalizeVal(f.oldVal) !== normalizeVal(f.newVal));

        if (mergedFields.length === 0) {
          return prev.filter(m => m.id !== compositeId);
        }

        updated[existingIdx] = {
          ...existing,
          title: data.title || existing.title,
          type: data.type,
          timestamp: nowTime,
          fields: mergedFields,
          originalRecord: data.originalRecord || existing.originalRecord
        };
        return updated;
      }

      // Add new composite entry
      return [
        ...prev,
        {
          id: compositeId,
          recordId: data.recordId,
          section: data.section,
          title: data.title,
          type: data.type,
          timestamp: nowTime,
          fields: validFields,
          originalRecord: data.originalRecord
        }
      ];
    });
  };

  const removeMutation = (id: string) => {
    setPendingMutations(prev => prev.filter(m => m.id !== id));
  };

  const clearMutations = () => {
    setPendingMutations([]);
    localStorage.removeItem('venke_pending_mutations');
  };

  const commitMutations = () => {
    clearMutations();
  };

  const revertAllMutations = () => {
    clearMutations();
  };

  return (
    <AuditContext.Provider
      value={{
        pendingMutations,
        trackMutation,
        removeMutation,
        clearMutations,
        commitMutations,
        revertAllMutations
      }}
    >
      {children}
    </AuditContext.Provider>
  );
};

export const useAudit = () => {
  const context = useContext(AuditContext);
  if (!context) {
    throw new Error('useAudit must be used within an AuditProvider');
  }
  return context;
};
