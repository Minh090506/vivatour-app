import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format number as Vietnamese currency (VND)
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}

// Format date as Vietnamese locale
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('vi-VN');
}
