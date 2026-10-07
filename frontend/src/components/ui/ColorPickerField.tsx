// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

interface ColorPickerFieldProps {
  label: string
  /** Current hex value, e.g. "#14B8A6". */
  value: string
  onChange: (hex: string) => void
  /** Optional class for the label to match surrounding form styling. */
  labelClassName?: string
  hint?: string
}

const DEFAULT_LABEL_CLASS = 'block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider'

/** Loose validation for a #RGB or #RRGGBB hex string. */
const isHex = (v: string) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)

/**
 * Labelled colour input: a native colour-picker swatch paired with an editable
 * hex text field, kept in sync. Reusable across org branding forms.
 */
export default function ColorPickerField({
  label,
  value,
  onChange,
  labelClassName = DEFAULT_LABEL_CLASS,
  hint,
}: ColorPickerFieldProps) {
  // The native <input type="color"> only understands #rrggbb; fall back to a
  // neutral swatch while the user is mid-typing an invalid/partial hex.
  const swatchValue = isHex(value) ? value : '#000000'

  return (
    <div>
      <label className={labelClassName}>{label}</label>
      <div className="flex items-center gap-2.5">
        <input
          type="color"
          aria-label={`${label} colour picker`}
          value={swatchValue}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 shrink-0 rounded-lg border border-slate-200 bg-white p-1 cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#14B8A6"
          spellCheck={false}
          // Flexes instead of a fixed width: a fixed 8rem plus the swatch
          // overflows any container narrower than ~12rem, which showed up as a
          // horizontal scrollbar inside the certificate inspector. Capped so it
          // still looks like a hex field in a full-width form.
          className={`min-w-0 flex-1 max-w-48 px-3 py-2.5 rounded-xl bg-white border outline-none transition-all text-[14px] font-mono text-slate-700 focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal ${
            value && !isHex(value) ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : 'border-slate-200'
          }`}
        />
      </div>
      {value && !isHex(value) ? (
        <p className="mt-1 text-[11px] text-red-500">Enter a valid hex colour (e.g. #14B8A6)</p>
      ) : (
        hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>
      )}
    </div>
  )
}
