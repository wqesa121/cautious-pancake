import { useEffect, useRef, useState } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectMenuProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
}

export default function SelectMenu({ value, options, onChange, className = "" }: SelectMenuProps) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  useEffect(() => {
    if (!open || !rootRef.current) return;

    const rect = rootRef.current.getBoundingClientRect();
    const optionHeight = 42;
    const menuPadding = 12;
    const estimatedMenuHeight = options.length * optionHeight + menuPadding;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    // If below is tight and above has more room, open upward.
    setOpenUp(spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow);
  }, [open, options.length]);

  return (
    <div ref={rootRef} className={`relative min-w-[170px] ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full h-10 px-3 rounded-xl border bg-white text-left text-sm font-semibold shadow-sm transition-all ${
          open
            ? "border-primary-400 ring-2 ring-primary-200/70 text-slate-900"
            : "border-slate-200 text-slate-800 hover:border-slate-300"
        }`}
      >
        <span>{selected?.label || "Выбрать"}</span>
        <span
          className={`absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          className={`absolute z-30 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ${
            openUp ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]"
          }`}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                option.value === value
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
