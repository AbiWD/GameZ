import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateOpenTimerCost(startTime: string | Date, pricePerHour: number, now: Date = new Date()): number {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  const elapsedMins = Math.floor((now.getTime() - start.getTime()) / 60000);
  return (elapsedMins / 60) * pricePerHour;
}

export function escapePbFilterValue(value: string): string {
  return value.replace(/"/g, '\\"').replace(/'/g, "\\'");
}

export function getErrorMessage(error: any, fallback: string = 'An error occurred'): string {
  if (!error) return fallback;
  
  if (error?.data?.data && typeof error.data.data === 'object') {
    const fieldErrors = Object.entries(error.data.data)
      .map(([field, err]: [string, any]) => {
        const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
        return `${fieldName}: ${err?.message || 'Invalid value'}`;
      });
    if (fieldErrors.length > 0) {
      return fieldErrors.join(' | ');
    }
  }

  if (error?.data?.message) return error.data.message;
  if (error?.message) return error.message;

  return fallback;
}
