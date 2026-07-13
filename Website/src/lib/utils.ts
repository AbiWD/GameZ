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
