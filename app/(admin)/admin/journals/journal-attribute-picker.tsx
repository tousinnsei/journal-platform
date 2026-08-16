"use client";

interface Option {
  id: string;
  name: string;
}

interface JournalAttributePickerProps {
  label: string;
  hint?: string;
  options: Option[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function JournalAttributePicker({
  label,
  hint,
  options,
  selectedIds,
  onChange,
  disabled,
}: JournalAttributePickerProps) {
  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  };

  return (
    <div>
      <label className="block text-xs text-slate-300 mb-2">
        {label}
        {hint && <span className="text-slate-500 ml-1">({hint})</span>}
      </label>
      {options.length === 0 ? (
        <p className="text-[11px] text-slate-500">
          暂无可选项，请先在「期刊属性字典」中维护。
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => {
            const isSelected = selectedIds.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                disabled={disabled}
                onClick={() => toggle(opt.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                  isSelected
                    ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                    : "bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700"
                }`}
              >
                {opt.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
