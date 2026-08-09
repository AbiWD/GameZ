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

  if (error.status === 413 || error?.status === '413' || error?.message?.includes('413') || error?.message?.includes('Too Large')) {
    return 'Uploaded image is too large for the web server limit. Please choose a smaller image file.';
  }

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

export const compressImage = (file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else resolve(file);
        }, 'image/jpeg', quality);
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};
