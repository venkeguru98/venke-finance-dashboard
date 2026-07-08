// Helper to format Date object into YYYY-MM-DD local time string
export function formatDateLocal(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Helper to parse dates like "on 1st", "on 15th", "yesterday", or raw dates
export function parseNaturalDate(text: string): string {
  const now = new Date();
  const lower = text.toLowerCase();

  // 1. Relative dates
  if (lower.includes('yesterday')) {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return formatDateLocal(yesterday);
  }
  if (lower.includes('today')) {
    return formatDateLocal(now);
  }

  // 2. Full dates in numeric formats (e.g. 2026-05-02, 02/05/2026, 2/5/2026)
  // Check YYYY-MM-DD
  const isoMatch = lower.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = String(parseInt(isoMatch[2], 10)).padStart(2, '0');
    const d = String(parseInt(isoMatch[3], 10)).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Check DD-MM-YYYY
  const indianMatch = lower.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/);
  if (indianMatch) {
    const y = parseInt(indianMatch[3], 10);
    const m = String(parseInt(indianMatch[2], 10)).padStart(2, '0');
    const d = String(parseInt(indianMatch[1], 10)).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 3. Month names in words (e.g. "02nd may 2026", "may 2nd", "may 2")
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  
  // Extract year if specified as 4 digits (e.g. 2010-2039)
  let year = now.getFullYear();
  const yearMatch = lower.match(/\b(202\d|203\d|201\d)\b/);
  if (yearMatch) {
    year = parseInt(yearMatch[1], 10);
  }

  // Look for: "2nd may", "02 may", "2 of may", "2nd of may"
  const dayMonthMatch = lower.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/);
  
  // Look for: "may 2nd", "may 2", "may 02"
  const monthDayMatch = lower.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\b/);

  if (dayMonthMatch) {
    const day = parseInt(dayMonthMatch[1], 10);
    const monthWord = dayMonthMatch[2];
    let monthIdx = months.findIndex(m => monthWord.startsWith(m));
    if (monthIdx === -1) monthIdx = monthNames.findIndex(m => monthWord.startsWith(m));
    
    if (day >= 1 && day <= 31 && monthIdx >= 0) {
      const d = new Date(year, monthIdx, day);
      return formatDateLocal(d);
    }
  } else if (monthDayMatch) {
    const monthWord = monthDayMatch[1];
    const day = parseInt(monthDayMatch[2], 10);
    let monthIdx = months.findIndex(m => monthWord.startsWith(m));
    if (monthIdx === -1) monthIdx = monthNames.findIndex(m => monthWord.startsWith(m));
    
    if (day >= 1 && day <= 31 && monthIdx >= 0) {
      const d = new Date(year, monthIdx, day);
      return formatDateLocal(d);
    }
  }

  // If a month word is found but no day was matched, check if we should set to current day or 1st of that month
  let monthIdx = -1;
  for (let i = 0; i < 12; i++) {
    if (lower.includes(months[i]) || lower.includes(monthNames[i])) {
      monthIdx = i;
      break;
    }
  }
  if (monthIdx >= 0) {
    const day = now.getDate();
    const testDate = new Date(year, monthIdx, day);
    if (testDate.getMonth() !== monthIdx) {
      return formatDateLocal(new Date(year, monthIdx, 1));
    }
    return formatDateLocal(testDate);
  }

  // 4. Default Day-only matching (e.g. "on 15th" or "on 15") -> defaults to current month/year
  const dayMatch = lower.match(/\bon\s+(\d{1,2})(?:st|nd|rd|th)?\b/i);
  if (dayMatch) {
    const day = parseInt(dayMatch[1], 10);
    if (day >= 1 && day <= 31) {
      const d = new Date(now.getFullYear(), now.getMonth(), day);
      return formatDateLocal(d);
    }
  }

  return formatDateLocal(now);
}

// Helper to guess payment method
export function parsePaymentMethod(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('upi') || lower.includes('gpay') || lower.includes('phonepe') || lower.includes('paytm') || lower.includes('scan')) {
    return 'UPI';
  }
  if (lower.includes('cash') || lower.includes('hand')) {
    return 'Cash';
  }
  if (lower.includes('card') || lower.includes('credit') || lower.includes('debit')) {
    return 'Credit Card';
  }
  if (lower.includes('bank') || lower.includes('transfer') || lower.includes('neft') || lower.includes('rtgs')) {
    return 'Bank Transfer';
  }
  return 'UPI';
}

// Helper to guess type (income, expense, savings)
export function parseType(text: string): 'income' | 'expense' | 'savings' {
  const lower = text.toLowerCase();
  if (lower.includes('salary') || lower.includes('got') || lower.includes('received') || lower.includes('earned') || lower.includes('income') || lower.includes('bonus')) {
    return 'income';
  }
  if (lower.includes('invested') || lower.includes('saved') || lower.includes('sip') || lower.includes('mutual fund') || lower.includes('deposit') || lower.includes('gold')) {
    return 'savings';
  }
  return 'expense';
}

// Main parser logic for a single line
export function parseSingleLine(text: string, categories: any[]): any {
  const cleanText = text.trim();
  if (!cleanText) return null;

  // 1. Parse Amount
  let amount = 0;
  const amountRegexes = [
    /(?:₹|inr|rs\.?|rupees?)\s*([\d,]+(?:\.\d+)?)/i,
    /([\d,]+(?:\.\d+)?)\s*(?:₹|inr|rs\.?|rupees?)/i,
    /\b([\d,]+(?:\.\d+)?)\b/
  ];

  for (const rx of amountRegexes) {
    const match = cleanText.match(rx);
    if (match) {
      const val = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) {
        amount = val;
        break;
      }
    }
  }

  // 2. Parse Type
  const type = parseType(cleanText);

  // 3. Match Category
  let matchedCategory = null;
  const lowerText = cleanText.toLowerCase();

  const typedCategories = categories.filter(c => c.type === type);
  for (const cat of typedCategories) {
    if (lowerText.includes(cat.name.toLowerCase())) {
      matchedCategory = cat;
      break;
    }
  }

  if (!matchedCategory) {
    for (const cat of categories) {
      if (lowerText.includes(cat.name.toLowerCase())) {
        matchedCategory = cat;
        break;
      }
    }
  }

  if (!matchedCategory) {
    const fallbackCat = categories.find(c => c.name.toLowerCase() === 'others' && c.type === type) 
      || categories.find(c => c.type === type) 
      || categories[0];
    matchedCategory = fallbackCat;
  }

  // 4. Parse Date
  const date = parseNaturalDate(cleanText);

  // 5. Parse Payment Method
  const paymentMethod = parsePaymentMethod(cleanText);

  // 6. Generate Clean Notes/Description
  let notes = cleanText;
  notes = notes.charAt(0).toUpperCase() + notes.slice(1);

  return {
    amount,
    type,
    category_id: matchedCategory ? matchedCategory.id : null,
    category_name: matchedCategory ? matchedCategory.name : 'Others',
    date,
    payment_method: paymentMethod,
    notes
  };
}
