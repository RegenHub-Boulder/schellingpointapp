'use client'

import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CheckboxProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  id?: string
  name?: string
}

export function Checkbox({
  className,
  checked,
  onCheckedChange,
  disabled,
  id,
  name,
}: CheckboxProps) {
  const [internalChecked, setInternalChecked] = React.useState(false)
  const isChecked = checked !== undefined ? checked : internalChecked

  const handleChange = () => {
    if (disabled) return
    const newChecked = !isChecked
    if (checked === undefined) {
      setInternalChecked(newChecked)
    }
    onCheckedChange?.(newChecked)
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={isChecked}
      disabled={disabled}
      id={id}
      data-name={name}
      onClick={handleChange}
      className={cn(
        'peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        isChecked && 'bg-primary text-primary-foreground',
        className
      )}
    >
      {isChecked && (
        <Check className="h-3 w-3" />
      )}
    </button>
  )
}
