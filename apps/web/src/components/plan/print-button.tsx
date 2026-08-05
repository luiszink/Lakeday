'use client';

type PrintButtonProps = Readonly<{
  disabled?: boolean;
  hint?: string;
  label: string;
}>;

export function PrintButton({ disabled = false, hint, label }: PrintButtonProps) {
  return (
    <div className="print-hide">
      <button
        className="min-h-10 rounded-md border border-cyan-700 px-3 text-sm font-semibold text-cyan-200 hover:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        onClick={() => window.print()}
        type="button"
      >
        {label}
      </button>
      {disabled && hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
