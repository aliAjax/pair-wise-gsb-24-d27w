/** 派生查询：台账列表、未归还提醒、看板指标（规则层，纯函数）。 */

import { findActiveRefs, type ActiveRef } from "./rules";
import { activeAssignment, tagStatus, type LedgerState, type Tag } from "./types";

export interface TagRow {
  tag: Tag;
  status: "在库" | "在用";
  current: ActiveRef | null;
  times: number;
}

/** 某一季的全部牌，按牌号排序，带上当前状态。 */
export function listTagsBySeason(state: LedgerState, seasonId: string): TagRow[] {
  return state.tags
    .filter((t) => t.seasonId === seasonId)
    .sort((a, b) => a.number.localeCompare(b.number, "zh-Hans-CN", { numeric: true }))
    .map((tag) => {
      const active = activeAssignment(tag);
      return {
        tag,
        status: tagStatus(tag),
        current: active
          ? {
              seasonId: tag.seasonId,
              tagNo: tag.number,
              trench: active.trench,
              layer: active.layer,
              person: active.person,
              feature: active.feature,
              since: active.checkedOutAt,
              open: true,
            }
          : null,
        times: tag.assignments.length,
      };
    });
}

/** 全台账未归还提醒（跨季），领用时间最早的排最前。 */
export function listOverdue(state: LedgerState): ActiveRef[] {
  return findActiveRefs(state).sort((a, b) => a.since.localeCompare(b.since));
}

export interface LedgerMetrics {
  total: number;
  inUse: number;
  returned: number;
  overdue: number;
}

/** 看板指标：本季建牌 / 当前在用 / 本季归还（退场）/ 全台账未归还。 */
export function ledgerMetrics(state: LedgerState, seasonId: string): LedgerMetrics {
  const seasonTags = state.tags.filter((t) => t.seasonId === seasonId);
  const returned = seasonTags.reduce(
    (sum, t) => sum + t.assignments.filter((a) => a.returnedAt !== null).length,
    0
  );
  const inUse = seasonTags.filter((t) => activeAssignment(t) !== null).length;
  return {
    total: seasonTags.length,
    inUse,
    returned,
    overdue: findActiveRefs(state).length,
  };
}
