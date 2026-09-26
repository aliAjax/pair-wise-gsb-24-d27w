import { SEED_LEDGER } from "../data/seed";
import type { Ledger } from "../types";

/**
 * 本机记录层：台账只经由这里读写 localStorage。
 * 每次变动整账落盘，重开页面仍能追到每一次领用。
 */

const STORAGE_KEY = "hxwl-10.plate-ledger.v1";

/** 读取本机台账；没有建档或记录不可读时，用初始资料建账 */
export function loadLedger(): Ledger {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Ledger;
      if (parsed && parsed.version === 1 && Array.isArray(parsed.checkouts)) {
        return parsed;
      }
    }
  } catch {
    // 本机记录损坏时退回初始资料，不阻断页面
  }
  return structuredClone(SEED_LEDGER);
}

/** 整账落盘 */
export function saveLedger(ledger: Ledger): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ledger));
}

/** 清掉本机记录，恢复初始资料 */
export function resetLedger(): Ledger {
  window.localStorage.removeItem(STORAGE_KEY);
  return structuredClone(SEED_LEDGER);
}
