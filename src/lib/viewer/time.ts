function parts(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  return {
    hours: Math.floor(seconds / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
  };
}

const pad = (value: number) => value.toString().padStart(2, "0");

/** 754 → "12:34", 7384 → "2:03:04". */
export function formatPlaybackTime(totalSeconds: number): string {
  const { hours, minutes, seconds } = parts(totalSeconds);
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/** For screen readers: 3725 → "1 hour 2 minutes 5 seconds". */
export function describePlaybackTime(totalSeconds: number): string {
  const { hours, minutes, seconds } = parts(totalSeconds);
  const unit = (value: number, name: string) => `${value} ${name}${value === 1 ? "" : "s"}`;
  const described = [
    hours > 0 && unit(hours, "hour"),
    minutes > 0 && unit(minutes, "minute"),
    (seconds > 0 || (hours === 0 && minutes === 0)) && unit(seconds, "second"),
  ].filter(Boolean);
  return described.join(" ");
}
