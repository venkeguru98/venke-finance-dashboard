/**
 * Date parsing and formatting helpers for Records Modules
 */

// Centralized date parser supporting multiple CSV formats:
// DD/MM/YYYY, D/M/YYYY, DD-MM-YYYY, D-M-YYYY, YYYY-MM-DD, YYYY/MM/DD
export function parseCsvDate(dateStr: string): string | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  
  // 1. Matches YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    if (isValidDateParts(year, month, day)) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return null;
  }

  // 2. Matches DD/MM/YYYY or DD-MM-YYYY (or D/M/YYYY, etc.)
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    if (isValidDateParts(year, month, day)) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return null;
  }

  return null;
}

function isValidDateParts(year: number, month: number, day: number): boolean {
  if (year < 1000 || year > 9999) return false;
  if (month < 1 || month > 12) return false;
  
  // Days in month validation
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return false;
  
  return true;
}

// Formats a date into "01 May 2027" or "1 May 2027"
// Relies on UTC component functions to avoid timezone shifting on input strings (e.g. "YYYY-MM-DD")
export function formatDisplayDate(dateInput: any): string {
  if (!dateInput) return '-';
  
  // Parse directly if it's a YYYY-MM-DD string to be 100% immune to timezone offsets
  let dateStr = String(dateInput);
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = match[1];
    const monthIndex = parseInt(match[2], 10) - 1;
    const day = match[3];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[monthIndex];
    return `${day} ${month} ${year}`;
  }

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return String(dateInput);
  
  const day = String(date.getUTCDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  
  return `${day} ${month} ${year}`;
}

// Formats a date/timestamp to "01 Jul 2026 10:30 AM"
// Relies on UTC to avoid timezone representation shifting
export function formatTimestamp(dateInput: any): string {
  if (!dateInput) return '-';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return String(dateInput);
  
  const day = String(date.getUTCDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  
  let hours = date.getUTCHours();
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const hrStr = String(hours).padStart(2, '0');
  
  return `${day} ${month} ${year} ${hrStr}:${minutes} ${ampm}`;
}
