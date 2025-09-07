// Utility to calculate current streak from an array of submission dates
export function getCurrentStreak(submissions: Array<{ date: string }>): number {
  if (!submissions || submissions.length === 0) return 0;
  // Get unique sorted dates
  const dates = Array.from(new Set(
    submissions.map(s => new Date(s.date).toISOString().split('T')[0])
  )).sort();
  let currentStreak = 0;
  let lastDate = null;
  for (const dateStr of dates.reverse()) {
    const date = new Date(dateStr);
    if (!lastDate) {
      currentStreak = 1;
    } else {
      const daysDiff = (lastDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
    lastDate = date;
  }
  return currentStreak;
}