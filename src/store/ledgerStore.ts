/**
 * 本机记录层：台账事件只追加、不改写，存在浏览器 localStorage。
 * 重开页面时整串读回，由规则层 replayLedger 回放出台账，每一次领用都追得到。
 */

import { useMemo, useState } from "react";
import { seedEvents } from "../data/reference";
import { replayLedger, type LedgerState, type TagEvent } from "../domain/types";

const STORAGE_KEY = "hxwl-10.tag-ledger.events.v1";

function loadEvents(): TagEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      // 首次打开：写入演示底账，之后与本机记录同存一处、互不混淆来源
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seedEvents));
      return [...seedEvents];
    }
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as TagEvent[];
    return [];
  } catch {
    return [...seedEvents];
  }
}

function persist(events: TagEvent[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // 存储不可用时页面照常工作，只是关掉后留不下记录
  }
}

export interface LedgerStore {
  events: TagEvent[];
  ledger: LedgerState;
  append: (event: TagEvent) => void;
  resetToSeed: () => void;
}

export function useLedgerStore(): LedgerStore {
  const [events, setEvents] = useState<TagEvent[]>(loadEvents);

  const ledger = useMemo(() => replayLedger(events), [events]);

  const append = (event: TagEvent) => {
    setEvents((prev) => {
      const next = [...prev, event];
      persist(next);
      return next;
    });
  };

  const resetToSeed = () => {
    persist([...seedEvents]);
    setEvents([...seedEvents]);
  };

  return { events, ledger, append, resetToSeed };
}
