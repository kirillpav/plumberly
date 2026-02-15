import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';

export function formatDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (!isValid(date)) return '';
  return format(date, 'dd MMM yyyy');
}

export function formatDateTime(dateStr: string): string {
  const date = parseISO(dateStr);
  if (!isValid(date)) return '';
  return format(date, 'dd MMM yyyy, HH:mm');
}

export function formatTimeAgo(dateStr: string): string {
  const date = parseISO(dateStr);
  if (!isValid(date)) return '';
  return formatDistanceToNow(date, { addSuffix: true });
}

export function formatCalendarDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (!isValid(date)) return '';
  return format(date, 'yyyy-MM-dd');
}
