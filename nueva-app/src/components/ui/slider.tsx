import * as React from 'react';
import { cn } from '@/lib/utils';

export function Slider({
  className,
  value,
  defaultValue,
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  ...props
}: Omit<React.ComponentProps<'input'>, 'value'> & {
  value?: number | number[];
  defaultValue?: number | number[];
  step?: number;
  onValueChange?: (v: number[]) => void;
}) {
  const rawVal = Array.isArray(value) ? value[0] : value;
  const rawDef = Array.isArray(defaultValue) ? defaultValue[0] : defaultValue;
  const [internal, setInternal] = React.useState(rawDef ?? rawVal ?? min);
  const v = rawVal !== undefined ? rawVal : internal;

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={v}
      onChange={(e) => {
        const n = Number(e.target.value);
        setInternal(n);
        onValueChange?.([n]);
      }}
      className={cn('h-2 w-full appearance-none rounded-full bg-zinc-700 accent-red-500', className)}
      {...props}
    />
  );
}
