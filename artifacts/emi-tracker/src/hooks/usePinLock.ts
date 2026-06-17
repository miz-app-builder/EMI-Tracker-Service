import { useState, useCallback } from "react";

const PIN_KEY = "emi_pin_hash";

function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    hash = (hash * 31 + pin.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36) + pin.length;
}

export function usePinLock() {
  const initialHasPin = Boolean(localStorage.getItem(PIN_KEY));
  const [hasPin, setHasPin] = useState(initialHasPin);
  const [unlocked, setUnlocked] = useState(!initialHasPin);

  const verifyPin = useCallback((pin: string): boolean => {
    const stored = localStorage.getItem(PIN_KEY);
    if (!stored) { setUnlocked(true); return true; }
    const ok = hashPin(pin) === stored;
    if (ok) setUnlocked(true);
    return ok;
  }, []);

  const setPin = useCallback((pin: string): void => {
    localStorage.setItem(PIN_KEY, hashPin(pin));
    setHasPin(true);
  }, []);

  /** Verifies currentPin before removing. Returns false if PIN is wrong. */
  const removePin = useCallback((currentPin: string): boolean => {
    const stored = localStorage.getItem(PIN_KEY);
    if (stored && hashPin(currentPin) !== stored) return false;
    localStorage.removeItem(PIN_KEY);
    setHasPin(false);
    setUnlocked(true);
    return true;
  }, []);

  const lock = useCallback(() => {
    if (localStorage.getItem(PIN_KEY)) setUnlocked(false);
  }, []);

  const unlock = useCallback(() => {
    setUnlocked(true);
  }, []);

  return { hasPin, unlocked, verifyPin, setPin, removePin, lock, unlock };
}
