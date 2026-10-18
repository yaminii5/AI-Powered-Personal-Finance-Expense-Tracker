/**
 * Formats a YYYY-MM-DD date string into an ordinal human-readable format.
 * e.g., '2027-07-01' -> '1st July 2027', '2027-10-29' -> '29th Oct 2027'
 */
export function formatPlanDate(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return dateStr;

  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(monthIdx) || isNaN(day)) return dateStr;

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const monthName = months[monthIdx] || parts[1];

  const getOrdinal = (n) => {
    if (n > 3 && n < 21) return 'th';
    switch (n % 10) {
      case 1:  return 'st';
      case 2:  return 'nd';
      case 3:  return 'rd';
      default: return 'th';
    }
  };

  return `${day}${getOrdinal(day)} ${monthName} ${year}`;
}

/**
 * Formats start and end dates into a readable range.
 * e.g., '2027-07-01', '2027-10-29' -> '1st July 2027 → 29th Oct 2027'
 */
export function formatPlanDateRange(startDate, endDate) {
  if (!startDate && !endDate) return 'Flexible dates';
  if (startDate && endDate) {
    return `${formatPlanDate(startDate)} → ${formatPlanDate(endDate)}`;
  }
  if (startDate) return `From ${formatPlanDate(startDate)}`;
  return `Until ${formatPlanDate(endDate)}`;
}

