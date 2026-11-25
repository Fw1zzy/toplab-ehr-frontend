export const MAX_LOGIN_FAILURES = 25;

export function cooldownSecondsForFailures(failures: number) {
  if (failures >= MAX_LOGIN_FAILURES || failures <= 0 || failures % 5 !== 0) return 0;
  return (failures / 5) * 60;
}

export function failureTimeUtc(value: string) {
  const iso = value.trim().replace(' ', 'T');
  const time = Date.parse(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(iso) ? iso : `${iso}Z`);
  if (!Number.isFinite(time)) throw new Error('Invalid login attempt timestamp.');
  return time;
}

export function remainingCooldown(failures: number, lastFailureMs: number, now = Date.now()) {
  const seconds = cooldownSecondsForFailures(failures);
  return seconds ? Math.max(0, Math.ceil((lastFailureMs + seconds * 1000 - now) / 1000)) : 0;
}
