/** 事件工厂：把一次操作落成一条可追加的台账事件（规则层）。 */

import type { TagEvent } from "./types";

export function makeIssueEvent(
  id: string,
  at: string,
  seasonId: string,
  tagNo: string
): TagEvent {
  return { id, at, type: "issue", seasonId, tagNo };
}

export function makeCheckoutEvent(
  id: string,
  at: string,
  seasonId: string,
  tagNo: string,
  fields: { feature: string; trench: string; layer: string; person: string }
): TagEvent {
  return { id, at, type: "checkout", seasonId, tagNo, ...fields };
}

export function makeReturnEvent(
  id: string,
  at: string,
  seasonId: string,
  tagNo: string,
  condition: string
): TagEvent {
  return { id, at, type: "return", seasonId, tagNo, condition };
}
