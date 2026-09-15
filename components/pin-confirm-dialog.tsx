"use client";

import { useEffect, useRef, useState } from "react";
import { KeyRound, LoaderCircle } from "lucide-react";
import { InlineAlert, Modal } from "@/components/ui-system";

type PinConfirmDialogProps = {
  open: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  onConfirm: (pin: string) => Promise<void>;
};

export function PinConfirmDialog(props: PinConfirmDialogProps) {
  if (!props.open) return null;
  return <PinDialogSession {...props} />;
}

function PinDialogSession({ title = "Potwierdź operację", description = "Wpisz 4-cyfrowy PIN. Operacja rozpocznie się automatycznie po czwartej cyfrze.", onClose, onConfirm }: PinConfirmDialogProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timeout);
  }, []);
  useEffect(() => {
    if (error && !loading) inputRef.current?.focus();
  }, [error, loading]);

  async function attempt(nextPin: string) {
    setLoading(true);
    setError("");
    try {
      await onConfirm(nextPin);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Nie udało się potwierdzić operacji.");
      setPin("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open title={title} description={description} onClose={() => { if (!loading) onClose(); }} size="small">
      <div className="pin-dialog">
        <div className="pin-dialog-icon"><KeyRound aria-hidden /></div>
        {error && <InlineAlert tone="error">{error}</InlineAlert>}
        <label htmlFor="pin-confirm-input">PIN zalogowanego użytkownika</label>
        <input
          ref={inputRef}
          className="input pin-input"
          id="pin-confirm-input"
          aria-label="PIN zalogowanego użytkownika"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          pattern="[0-9]{4}"
          maxLength={4}
          value={pin}
          disabled={loading}
          onChange={(event) => {
            const nextPin = event.target.value.replace(/\D/g, "").slice(0, 4);
            setPin(nextPin);
            if (nextPin.length === 4) void attempt(nextPin);
          }}
        />
        {loading
          ? <p className="pin-progress"><LoaderCircle className="spin" aria-hidden />Sprawdzanie PIN-u…</p>
          : <p className="muted small">Brak dodatkowego przycisku — czwarta cyfra zatwierdza automatycznie.</p>}
      </div>
    </Modal>
  );
}
