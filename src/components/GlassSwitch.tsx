"use client";

interface GlassSwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}

export function GlassSwitch({ checked, onChange, label, disabled = false }: GlassSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className="lg-switch"
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onChange(!checked);
      }}
    >
      <span className="lg-switch-thumb" aria-hidden="true" />
    </button>
  );
}
