/** 编号与时间的小工具：纯函数，资料、规则、界面共用。 */

/** 牌号统一为 3 位数字（001、023…），超过 3 位保持原样。 */
export function canonicalTagNo(raw: string): string {
  const trimmed = raw.trim();
  if (!/^\d{1,4}$/.test(trimmed)) return trimmed;
  return trimmed.length <= 3 ? trimmed.padStart(3, "0") : trimmed;
}

/** 是否为可建牌的号码：1~4 位数字。 */
export function isValidTagNo(raw: string): boolean {
  return /^\d{1,4}$/.test(raw.trim());
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function newEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** 2026-09-26 14:05 这样的本机时间串。 */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
