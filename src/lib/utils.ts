import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// The shadcn/Magic UI convention: merge conditional classes, last-wins on conflicts.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
