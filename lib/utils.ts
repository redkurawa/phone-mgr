import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  const months = [
    'jan',
    'feb',
    'mar',
    'apr',
    'mei',
    'jun',
    'jul',
    'agu',
    'sep',
    'okt',
    'nov',
    'des',
  ];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  const months = [
    'jan',
    'feb',
    'mar',
    'apr',
    'mei',
    'jun',
    'jul',
    'agu',
    'sep',
    'okt',
    'nov',
    'des',
  ];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}
