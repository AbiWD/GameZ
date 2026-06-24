/**
 * Utility functions for handling dates in IST (Indian Standard Time)
 * IST is UTC+5:30
 */

/**
 * Format a date string or Date object to IST locale string
 */
export function formatDateIST(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  };
  
  return dateObj.toLocaleDateString('en-IN', defaultOptions);
}

/**
 * Format a date string or Date object to IST with time
 */
export function formatDateTimeIST(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get current date in IST timezone formatted as YYYY-MM-DD
 * Useful for setting min dates in date inputs
 */
export function getTodayIST(): string {
  const now = new Date();
  
  // Convert to IST
  const istDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  
  const year = istDate.getFullYear();
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const day = String(istDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}
