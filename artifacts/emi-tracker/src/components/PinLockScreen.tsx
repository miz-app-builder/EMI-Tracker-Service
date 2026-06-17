import { useState, useEffect } from "react";
import { Shield, Delete, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBiometric } from "@/hooks/useBiometric";

type Props = {
  onUnlock: (pin: string) => boolean;
  onBiometricUnlock?: () => void;
};

const DIGITS = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

export function PinLockScreen({ onUnlock, onBiometricUnlock }: Props) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const { enabled: bioEnabled, authenticate } = useBiometric();

  async function handleBiometric() {
    setBioLoading(true);
    try {
      const ok = await authenticate();
      if (ok && onBiometricUnlock) {
        onBiometricUnlock();
      } else if (!ok) {
        setError(true);
        setTimeout(() => setError(false), 1500);
      }
    } catch {
      setError(true);
      setTimeout(() => setError(false), 1500);
    }
    setBioLoading(false);
  }

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
        <h1 className="text-xl font-bold text-foreground">Enter PIN</h1>
        <p className="text-sm text-muted-foreground">Enter your 4-digit PIN to unlock the app</p>
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
        <p className="text-sm text-destructive font-medium -mt-4">Incorrect PIN, please try again</p>
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

      {/* Biometric button — mobile only */}
      {bioEnabled && onBiometricUnlock && (
        <button
          onClick={handleBiometric}
          disabled={bioLoading}
          className="md:hidden flex flex-col items-center gap-1.5 text-primary disabled:opacity-50 transition-opacity mt-2"
        >
          <div className="h-14 w-14 rounded-full border-2 border-primary/30 flex items-center justify-center bg-primary/5">
            {bioLoading ? (
              <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            ) : (
              <Fingerprint className="h-7 w-7" />
            )}
          </div>
          <span className="text-xs font-medium">Use Biometric</span>
        </button>
      )}

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
