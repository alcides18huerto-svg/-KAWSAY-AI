import type { ReactNode } from 'react';

/* ============================================================
   Componentes de interfaz reutilizables (Tailwind v4 + tokens KAWSAY).
   Centralizan el estilo para que las pantallas queden consistentes.
   ============================================================ */

export function Card({
  title,
  action,
  children,
  className = '',
  variant = 'default',
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning';
}) {
  const variants = {
    default: 'border-line bg-surface',
    primary: 'border-kawsay-200 bg-gradient-to-br from-kawsay-50/50 to-surface',
    success: 'border-kawsay-success/30 bg-gradient-to-br from-green-50/30 to-surface',
    warning: 'border-amber-200 bg-gradient-to-br from-amber-50/30 to-surface',
  } as const;
  
  return (
    <section
      className={`rounded-2xl border ${variants[variant]} p-6 shadow-card transition hover:shadow-raised ${className}`}
    >
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          {title && (
            <h2 className="text-base font-bold tracking-tight text-ink">{title}</h2>
          )}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Metric({
  label,
  value,
  icon,
  tone = 'brand',
}: {
  label: string;
  value: number | string;
  icon: string;
  tone?: 'brand' | 'teal' | 'purple' | 'alert';
}) {
  const tones = {
    brand: 'bg-kawsay-50 text-kawsay-600',
    teal: 'bg-kawsay-teal/10 text-kawsay-teal',
    purple: 'bg-kawsay-purple/10 text-kawsay-purple',
    alert: 'bg-kawsay-alert/10 text-kawsay-alert',
  } as const;

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-card transition hover:shadow-raised">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-ink-soft">{label}</span>
        <span
          aria-hidden
          className={`grid size-9 shrink-0 place-items-center rounded-xl text-base ${tones[tone]}`}
        >
          {icon}
        </span>
      </div>
      <strong className="tabular mt-3 block text-3xl font-bold tracking-tight text-ink">
        {value}
      </strong>
    </div>
  );
}

/** Estados del backend (DRAFT/REVIEW/APPROVED/PUBLISHED/PENDING) en español. */
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  REVIEW: 'En revisión',
  APPROVED: 'Aprobada',
  PUBLISHED: 'Publicada',
  PENDING: 'Pendiente',
};

const STATUS_TONES: Record<string, string> = {
  DRAFT: 'bg-kawsay-100 text-kawsay-800',
  REVIEW: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-kawsay-success/12 text-kawsay-success',
  PUBLISHED: 'bg-kawsay-success/12 text-kawsay-success',
  PENDING: 'bg-amber-100 text-amber-800',
};

export function Badge({ status }: { status: string }) {
  const key = status.toUpperCase();
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ${STATUS_TONES[key] ?? 'bg-kawsay-100 text-kawsay-800'}`}
    >
      {STATUS_LABELS[key] ?? status}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-line bg-canvas px-4 py-6 text-center text-sm text-ink-soft">
      {children}
    </p>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'small';
}) {
  const variants = {
    primary:
      'bg-kawsay-600 text-white shadow-card hover:bg-kawsay-700 active:scale-[0.99]',
    secondary:
      'border border-line bg-surface text-ink hover:border-kawsay-300 hover:bg-kawsay-50',
    ghost: 'text-kawsay-600 hover:bg-kawsay-50',
    small: 'border border-line bg-surface px-3 py-1.5 text-xs text-ink hover:bg-kawsay-50',
  } as const;

  const size = variant === 'small' ? '' : 'px-4 py-2.5 text-sm';

  return (
    <button
      {...props}
      className={`${props.disabled ? 'cursor-not-allowed opacity-60' : ''} inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition ${size} ${variants[variant]} ${className}`}
    />
  );
}

/** Barra de dominio. El número siempre se muestra para no depender solo del color. */
export function ProgressBar({ value }: { value: number }) {
  const safe = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const tone =
    safe >= 70 ? 'bg-kawsay-success' : safe >= 40 ? 'bg-kawsay-500' : 'bg-kawsay-alert';
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="h-2 w-24 overflow-hidden rounded-full bg-kawsay-100"
        role="progressbar"
        aria-valuenow={Math.round(safe)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${safe}%` }} />
      </div>
      <span className="tabular text-sm font-semibold text-ink">{Math.round(safe)}%</span>
    </div>
  );
}

export const inputClass =
  'w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm text-ink transition placeholder:text-ink-faint focus:border-kawsay-500 focus:bg-surface';

/**
 * Select con opciones enriquecidas. Cada opción puede llevar una segunda
 * línea de contexto (escuela, grados, nº de estudiantes…) para que el
 * docente distinga aulas y estudiantes con nombres parecidos.
 */
export function Select({
  options,
  placeholder,
  className = '',
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  placeholder?: string;
  options: { value: string; label: string; hint?: string; disabled?: boolean }[];
}) {
  return (
    <select {...props} className={`${inputClass} ${className}`}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.hint ? `${option.label} — ${option.hint}` : option.label}
        </option>
      ))}
    </select>
  );
}

/** Selección de grados 1.º–6.º con estado accesible (`aria-pressed`). */
export function GradeChips({
  selected,
  onToggle,
  onSelectAll,
  hint,
}: {
  selected: number[];
  onToggle: (grade: number) => void;
  onSelectAll?: () => void;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Grados">
        {[1, 2, 3, 4, 5, 6].map((grade) => {
          const active = selected.includes(grade);
          return (
            <button
              key={grade}
              type="button"
              aria-pressed={active}
              className={`size-11 rounded-xl text-sm font-bold transition-all ${
                active
                  ? 'bg-kawsay-600 text-white shadow-card hover:bg-kawsay-700'
                  : 'border-2 border-line bg-surface text-ink-soft hover:border-kawsay-300 hover:text-kawsay-600 hover:bg-kawsay-50'
              }`}
              onClick={() => onToggle(grade)}
            >
              {grade}.º
            </button>
          );
        })}
        {onSelectAll && (
          <button
            type="button"
            className="rounded-xl px-3 py-2 text-xs font-semibold text-kawsay-600 transition hover:bg-kawsay-50"
            onClick={onSelectAll}
          >
            Todos
          </button>
        )}
      </div>
      {hint && <p className="mt-2 text-xs text-ink-soft">{hint}</p>}
      {!selected.length && (
        <p className="mt-2 text-xs font-medium text-kawsay-alert">Selecciona al menos un grado.</p>
      )}
    </div>
  );
}

/** Aviso de contexto (por ejemplo, aula multigrado detectada). */
export function InfoNote({ children, tone = 'brand' }: { children: ReactNode; tone?: 'brand' | 'teal' }) {
  const tones = {
    brand: 'border-kawsay-300 bg-kawsay-50 text-kawsay-800',
    teal: 'border-kawsay-teal/30 bg-kawsay-teal/8 text-ink',
  } as const;
  return (
    <p className={`mb-4 flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-medium ${tones[tone]}`}>
      <span aria-hidden className="mt-px">ℹ</span>
      <span>{children}</span>
    </p>
  );
}

export const thClass =
  'px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink-soft';

export const tdClass = 'border-t border-line px-3 py-3.5 text-sm text-ink align-top';
