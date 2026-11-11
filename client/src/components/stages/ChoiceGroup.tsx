import type { LucideIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

export interface Choice<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  /** classes applied when selected */
  tone: string;
}

/** Large, thumb-friendly radio cards built on shadcn RadioGroup. Nothing is pre-selected unless `value` is set. */
export function ChoiceGroup<T extends string>({ name, value, onChange, choices, columns = 2, label }: { name: string; value: T | null; onChange: (v: T) => void; choices: Choice<T>[]; columns?: number; label: string }) {
  return (
    <RadioGroup
      aria-label={label}
      value={value ?? ''}
      onValueChange={(v) => onChange(v as T)}
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {choices.map((c) => {
        const id = `${name}-${c.value}`;
        const selected = value === c.value;
        return (
          <Label
            key={c.value}
            htmlFor={id}
            className={cn(
              'flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 px-2 py-2 text-center text-sm font-semibold transition-colors',
              selected ? c.tone : 'border-border text-muted-foreground hover:border-brand-200',
            )}
          >
            <RadioGroupItem id={id} value={c.value} className="sr-only" />
            {c.icon && <c.icon className="size-5" aria-hidden />}
            {c.label}
          </Label>
        );
      })}
    </RadioGroup>
  );
}
