import axios from 'axios';

const API = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

/**
 * Centralized Authenticated Backup & Data Export Service
 * Downloads export files via authenticated Blob fetch to prevent 401 unauthenticated JSON errors.
 */
export async function downloadBackupExport(targetPathOrUrl?: string): Promise<{ success: boolean; filename: string; error?: string }> {
  try {
    const token = localStorage.getItem('token') || '';
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let url = `${API}/system/db-export`;
    if (targetPathOrUrl) {
      if (typeof targetPathOrUrl === 'string' && (targetPathOrUrl.startsWith('http') || targetPathOrUrl.startsWith('/api'))) {
        url = targetPathOrUrl;
      } else if (typeof targetPathOrUrl === 'string' && targetPathOrUrl.length > 0) {
        url = `${API}/enterprise-recovery/export?filePath=${encodeURIComponent(targetPathOrUrl)}`;
      } else if (typeof targetPathOrUrl === 'object' && targetPathOrUrl !== null) {
        const item: any = targetPathOrUrl;
        const target = item.fullPath || item.folder || item.filename || '';
        url = `${API}/enterprise-recovery/export?filePath=${encodeURIComponent(target)}`;
      }
    }

    const response = await axios.get(url, {
      headers,
      responseType: 'blob',
      withCredentials: true
    });

    // Extract filename from Content-Disposition header if available
    let filename = `venke-finance-export-${new Date().toISOString().slice(0, 10)}.sqlite`;
    const disposition = String(response.headers['content-disposition'] || '');
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename=["']?([^"';]+)["']?/);
      if (match && match[1]) {
        filename = match[1];
      }
    } else if (targetPathOrUrl && typeof targetPathOrUrl === 'string') {
      filename = targetPathOrUrl.split(/[/\\]/).pop() || filename;
    }

    // Trigger browser blob download
    const contentType = String(response.headers['content-type'] || 'application/octet-stream');
    const blob = new Blob([response.data], { type: contentType });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);

    return { success: true, filename };
  } catch (err: any) {
    let errorMsg = 'Failed to download export file.';
    if (err.response?.data instanceof Blob) {
      try {
        const text = await err.response.data.text();
        const json = JSON.parse(text);
        errorMsg = json.error || errorMsg;
      } catch (_) {}
    } else if (err.response?.data?.error) {
      errorMsg = err.response.data.error;
    }
    return { success: false, filename: '', error: errorMsg };
  }
}
