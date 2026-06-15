import { useEffect, useRef, useState } from "react";

const SETTING_KEY = "emi_auto_logout_minutes";

export function getAutoLogoutMinutes(): number {
  return Number(localStorage.getItem(SETTING_KEY) ?? 0);
}

export function setAutoLogoutMinutes(minutes: number) {
  localStorage.setItem(SETTING_KEY, String(minutes));
}

export function useAutoLogout(onLogout: () => void) {
  const [warningVisible, setWarningVisible] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function getMs() {
      const mins = getAutoLogoutMinutes();
      return mins > 0 ? mins * 60 * 1000 : 0;
    }

    function clearTimers() {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningTimerRef.current) clearInterval(warningTimerRef.current);
    }

    function startLogoutSequence() {
      let secs = 60;
      setSecondLeft(secs);
      setWarningVisible(true);
      warningTimerRef.current = setInterval(() => {
        secs -= 1;
        setSecondLeft(secs);
        if (secs <= 0) {
          clearTimers();
          setWarningVisible(false);
          onLogout();
        }
      }, 1000);
    }

    function setSecondLeft(s: number) {
      setSecondsLeft(s);
    }

    function resetTimer() {
      const ms = getMs();
      if (!ms) return;
      clearTimers();
      setWarningVisible(false);
      const warningAt = Math.max(0, ms - 60_000);
      timerRef.current = setTimeout(() => {
        startLogoutSequence();
      }, warningAt);
    }

    const ms = getMs();
    if (!ms) return;

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimers();
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [onLogout]);

  const dismiss = () => {
    setWarningVisible(false);
    setSecondsLeft(60);
    if (warningTimerRef.current) clearInterval(warningTimerRef.current);
    const ms = getAutoLogoutMinutes() * 60 * 1000;
    if (ms > 0) {
      const warningAt = Math.max(0, ms - 60_000);
      timerRef.current = setTimeout(() => {
        let secs = 60;
        setSecondsLeft(secs);
        setWarningVisible(true);
        warningTimerRef.current = setInterval(() => {
          secs -= 1;
          setSecondsLeft(secs);
          if (secs <= 0) {
            if (warningTimerRef.current) clearInterval(warningTimerRef.current);
            setWarningVisible(false);
            onLogout();
          }
        }, 1000);
      }, warningAt);
    }
  };

  return { warningVisible, secondsLeft, dismiss };
}
