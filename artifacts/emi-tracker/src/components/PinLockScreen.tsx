import { useState, useRef, useEffect } from "react";
import { Shield, Delete } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  onUnlock: (pin: string) => boolean;
};

const DIGITS = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

export function PinLockScreen({ onUnlock }: Props) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (pin.length === 4) {
      const ok = onUnlock(pin);
      if (!ok) {
        setShake(true);
        setError(true);
        setTimeout(() => { setShake(false); setPin(""); setError(false); }, 800);
      }
    }
  }, [pin, onUnlock]);

  function pressDigit(d: string) {
    if (d === "⌫") { setPin((p) => p.slice(0, -1)); return; }
    if (!d) return;
    if (pin.length >= 4) return;
    setPin((p) => p + d);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key >= "0" && e.key <= "9") pressDigit(e.key);
      if (e.key === "Backspace") pressDigit("⌫");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pin]);

  return (
    <div className="fixed inset-0 z-[200] bg-background flex flex-col items-center justify-center gap-8 select-none">
      <div className="flex flex-col items-center gap-3">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Shield className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-xl font-bold text-foreground">PIN লিখুন</h1>
        <p className="text-sm text-muted-foreground">অ্যাপ খুলতে আপনার ৪-ডিজিটের PIN দিন</p>
      </div>

      <div className={`flex gap-4 ${shake ? "animate-shake" : ""}`}>
        {[0,1,2,3].map((i) => (
          <div
            key={i}
            className={`h-4 w-4 rounded-full border-2 transition-all duration-200 ${
              i < pin.length
                ? error ? "bg-destructive border-destructive" : "bg-primary border-primary"
                : "border-muted-foreground/40"
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-sm text-destructive font-medium -mt-4">ভুল PIN, আবার চেষ্টা করুন</p>
      )}

      <div className="grid grid-cols-3 gap-3 w-64">
        {DIGITS.map((d, i) => (
          d === "" ? (
            <div key={i} />
          ) : (
            <Button
              key={i}
              variant={d === "⌫" ? "ghost" : "outline"}
              size="lg"
              className="h-16 text-xl font-semibold rounded-xl"
              onClick={() => pressDigit(d)}
            >
              {d === "⌫" ? <Delete className="h-5 w-5" /> : d}
            </Button>
          )
        ))}
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%,60% { transform: translateX(-8px); }
          40%,80% { transform: translateX(8px); }
        }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}</style>
    </div>
  );
}
