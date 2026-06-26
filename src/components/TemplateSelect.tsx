import type { EmailTemplateOption } from '../utils/templateRender'

interface TemplateSelectProps {
  label: string
  value: string
  options: EmailTemplateOption[]
  onChange: (id: string) => void
}

export function TemplateSelect({ label, value, options, onChange }: TemplateSelectProps) {
  const selected = options.find((option) => option.id === value)

  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      {selected && <p className="text-xs text-slate-500 mt-1">{selected.description}</p>}
    </div>
  )
}
