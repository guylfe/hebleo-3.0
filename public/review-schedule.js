// The prototype scheduler's one calculation, used for both choices and storage.
// Durations are elapsed time, including across midnight; this is not FSRS.
export function scheduleReview(card, rating, now) {
  if (![1, 2, 3, 4].includes(rating) || !Number.isFinite(now)) throw new Error('Invalid review schedule.');
  const intervalDays = rating === 1 ? 0 : rating === 2 ? 1 : Math.max(1, Math.round((card.intervalDays || 1) * (rating === 3 ? 2 : 3)));
  const delayMs = rating === 1 ? 600000 : intervalDays * 86400000;
  return { delayMs, card: {...card, intervalDays, repetitions:card.repetitions + 1, due:new Date(now + delayMs).toISOString()} };
}
export function reviewIntervalLabel(delayMs) {
  const minutes = delayMs / 60000;
  return minutes < 1440 ? minutes + (minutes === 1 ? ' minute' : ' minutes') : (minutes / 1440) + (minutes === 1440 ? ' day' : ' days');
}
