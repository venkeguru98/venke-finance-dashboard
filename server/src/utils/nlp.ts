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

  if (lower.includes('yesterday')) {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return formatDateLocal(yesterday);
  }
  if (lower.includes('today')) {
    return formatDateLocal(now);
  }

  const dayMatch = lower.match(/\bon\s+(\d+)(?:st|nd|rd|th)?\b/i);
  if (dayMatch) {
    const day = parseInt(dayMatch[1], 10);
    if (day >= 1 && day <= 31) {
      const d = new Date(now.getFullYear(), now.getMonth(), day);
      return formatDateLocal(d);
    }
  }

  const isoMatch = lower.match(/\b(\d{4})[-/](\d{2})[-/](\d{2})\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }
  const indianMatch = lower.match(/\b(\d{2})[-/](\d{2})[-/](\d{4})\b/);
  if (indianMatch) {
    return `${indianMatch[3]}-${indianMatch[2]}-${indianMatch[1]}`;
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
