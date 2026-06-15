export type SmsParseResult = {
  amount: number | null;
  transactionId: string | null;
  accountNumber: string | null;
  paymentMethod: "bKash" | "Nagad" | "Rocket" | null;
};

export function parseSms(raw: string): SmsParseResult {
  const text = raw.trim();
  const result: SmsParseResult = {
    amount: null,
    transactionId: null,
    accountNumber: null,
    paymentMethod: null,
  };

  if (!text) return result;

  if (/bkash/i.test(text)) result.paymentMethod = "bKash";
  else if (/nagad/i.test(text)) result.paymentMethod = "Nagad";
  else if (/rocket/i.test(text)) result.paymentMethod = "Rocket";

  const amountPatterns = [
    /Tk\.?\s*([\d,]+(?:\.\d+)?)/i,
    /([\d,]+(?:\.\d+)?)\s*(?:Taka|taka|BDT)/i,
    /৳\s*([\d,]+(?:\.\d+)?)/,
    /Amount[:\s]+([\d,]+(?:\.\d+)?)/i,
    /Sent\s+([\d,]+(?:\.\d+)?)/i,
    /received\s+([\d,]+(?:\.\d+)?)/i,
  ];
  for (const re of amountPatterns) {
    const m = text.match(re);
    if (m) {
      const val = parseFloat(m[1].replace(/,/g, ""));
      if (!isNaN(val) && val > 0) { result.amount = val; break; }
    }
  }

  const txnPatterns = [
    /(?:TrxID|TxnID|Txn\s*ID|Transaction\s*ID)\s*[:\-]?\s*([A-Z0-9]{6,25})/i,
    /(?:Ref|Reference|Ref\.)\s*[:\-]?\s*([A-Z0-9]{6,25})/i,
    /\b([A-Z]{2,4}[0-9]{8,18})\b/,
  ];
  for (const re of txnPatterns) {
    const m = text.match(re);
    if (m) { result.transactionId = m[1]; break; }
  }

  const phoneMatch = text.match(/\b(01[3-9]\d{8})\b/);
  if (phoneMatch) result.accountNumber = phoneMatch[1];

  return result;
}

export function hasParsedAnything(r: SmsParseResult): boolean {
  return r.amount !== null || r.transactionId !== null || r.accountNumber !== null || r.paymentMethod !== null;
}
