import { useState } from "react";
import { parseSms, hasParsedAnything, type SmsParseResult } from "@/lib/smsParser";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ChevronDown, ChevronUp, CheckCircle2, Sparkles, X } from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface SmsPastePanelProps {
  onApply: (result: SmsParseResult) => void;
}

export function SmsPastePanel({ onApply }: SmsPastePanelProps) {
  const [open, setOpen] = useState(false);
  const [smsText, setSmsText] = useState("");
  const [applied, setApplied] = useState(false);

  const parsed = parseSms(smsText);
  const hasResult = hasParsedAnything(parsed);

  function handleApply() {
    onApply(parsed);
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  }

  function handleClear() {
    setSmsText("");
    setApplied(false);
  }

  return (
    <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
      >
        <span className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          SMS থেকে auto-fill করুন
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-primary/20 pt-3">
          <p className="text-xs text-muted-foreground">
            bKash / Nagad / Rocket-এর confirmation SMS এখানে paste করুন।
          </p>

          <div className="relative">
            <Textarea
              value={smsText}
              onChange={(e) => { setSmsText(e.target.value); setApplied(false); }}
              placeholder="উদাহরণ: You have sent Tk 1500.00 to 01711XXXXXX from your bKash account. TrxID A2B3C4D5E6."
              rows={3}
              className="text-xs resize-none pr-8"
            />
            {smsText && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {smsText && (
            <div className="space-y-2">
              {hasResult ? (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-primary" /> পাওয়া গেছে
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {parsed.paymentMethod && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        📱 {parsed.paymentMethod}
                      </Badge>
                    )}
                    {parsed.amount !== null && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        💰 {formatCurrency(parsed.amount)}
                      </Badge>
                    )}
                    {parsed.accountNumber && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        📞 {parsed.accountNumber}
                      </Badge>
                    )}
                    {parsed.transactionId && (
                      <Badge variant="secondary" className="gap-1 text-xs font-mono">
                        🔑 {parsed.transactionId}
                      </Badge>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleApply}
                    className="w-full gap-2 mt-1"
                    variant={applied ? "outline" : "default"}
                  >
                    {applied ? (
                      <><CheckCircle2 className="h-4 w-4 text-green-500" /> Applied!</>
                    ) : (
                      <><Sparkles className="h-4 w-4" /> Form-এ apply করুন</>
                    )}
                  </Button>
                </>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  SMS recognize করা যাচ্ছে না। bKash / Nagad / Rocket-এর SMS try করুন।
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
