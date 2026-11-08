/** A destructive action asks twice: the first press arms it, moving away disarms it. */
import { useState } from 'react';

interface Props {
  label: string;
  confirm: string;
  onConfirm: () => void;
}

export default function ClearButton({ label, confirm, onConfirm }: Props) {
  const [armed, setArmed] = useState(false);
  return (
    <button
      type="button"
      className="ghost danger"
      data-armed={armed || undefined}
      onBlur={() => setArmed(false)}
      onClick={() => {
        if (armed) onConfirm();
        setArmed(!armed);
      }}
    >
      {armed ? confirm : label}
    </button>
  );
}
