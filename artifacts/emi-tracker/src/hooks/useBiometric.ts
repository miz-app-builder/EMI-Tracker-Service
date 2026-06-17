import { useState, useCallback, useEffect } from "react";

const BIOMETRIC_ENABLED_KEY = "emi_biometric_enabled";
const BIOMETRIC_CREDENTIAL_KEY = "emi_biometric_credential_id";

function base64Encode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function base64Decode(str: string): Uint8Array {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

export function useBiometric() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(
    localStorage.getItem(BIOMETRIC_ENABLED_KEY) === "true"
  );

  useEffect(() => {
    if (
      window.PublicKeyCredential &&
      typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
    ) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(
        (ok) => setSupported(ok)
      );
    }
  }, []);

  const register = useCallback(async (): Promise<boolean> => {
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = crypto.getRandomValues(new Uint8Array(16));

      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "EMI Tracker", id: window.location.hostname },
          user: { id: userId, name: "emi-user", displayName: "EMI User" },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },
            { alg: -257, type: "public-key" },
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
          },
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;

      if (!credential) return false;

      localStorage.setItem(BIOMETRIC_CREDENTIAL_KEY, base64Encode(credential.rawId));
      localStorage.setItem(BIOMETRIC_ENABLED_KEY, "true");
      setEnabled(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  const authenticate = useCallback(async (): Promise<boolean> => {
    try {
      const credentialIdB64 = localStorage.getItem(BIOMETRIC_CREDENTIAL_KEY);
      if (!credentialIdB64) return false;

      const credentialId = base64Decode(credentialIdB64);
      const challenge = crypto.getRandomValues(new Uint8Array(32));

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          allowCredentials: [{ id: credentialId, type: "public-key" }],
          userVerification: "required",
          timeout: 60000,
        },
      });

      return assertion !== null;
    } catch {
      return false;
    }
  }, []);

  const disable = useCallback(() => {
    localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
    localStorage.removeItem(BIOMETRIC_CREDENTIAL_KEY);
    setEnabled(false);
  }, []);

  return { supported, enabled, register, authenticate, disable };
}
