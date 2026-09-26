/**
 * 建牌 / 领用 / 归还的校验规则（规则层，纯函数）。
 * 界面只负责把结果展示出来：重复领用、未归还、旧号重投的冲突都在这里判定。
 */

import { isValidTagNo } from "../lib/time";
import { activeAssignment, type Assignment, type LedgerState, type Tag } from "./types";

/** 指向一次领用关联：牌号、所属季、原探方、原领用人；open 表示尚未归还。 */
export interface ActiveRef {
  seasonId: string;
  tagNo: string;
  trench: string;
  layer: string;
  person: string;
  feature: string;
  since: string;
  open: boolean;
}

function toActiveRef(tag: Tag, assignment: Assignment): ActiveRef {
  return {
    seasonId: tag.seasonId,
    tagNo: tag.number,
    trench: assignment.trench,
    layer: assignment.layer,
    person: assignment.person,
    feature: assignment.feature,
    since: assignment.checkedOutAt,
    open: true,
  };
}

/** 全台账里所有尚未归还的领用（跨季）。 */
export function findActiveRefs(state: LedgerState): ActiveRef[] {
  const refs: ActiveRef[] = [];
  for (const tag of state.tags) {
    const active = activeAssignment(tag);
    if (active) refs.push(toActiveRef(tag, active));
  }
  return refs;
}

/** 这个号码在某一季当前有没有未结束的关联。 */
export function findActiveRefByNo(
  state: LedgerState,
  seasonId: string,
  tagNo: string
): ActiveRef | null {
  const tag = state.tags.find((t) => t.seasonId === seasonId && t.number === tagNo);
  if (!tag) return null;
  const active = activeAssignment(tag);
  return active ? toActiveRef(tag, active) : null;
}

/** 这个号码在其它季的建牌与关联情况（旧季号码重投检测用）。 */
export function findOldSeasonRefs(
  state: LedgerState,
  seasonId: string,
  tagNo: string
): ActiveRef[] {
  return state.tags
    .filter((t) => t.number === tagNo && t.seasonId !== seasonId)
    .map((t) => {
      const active = activeAssignment(t);
      if (active) return toActiveRef(t, active);
      return {
        seasonId: t.seasonId,
        tagNo: t.number,
        trench: "—",
        layer: "—",
        person: "—",
        feature: "（当季领用均已归还）",
        since: t.createdAt,
        open: false,
      };
    });
}

export type IssueStatus =
  | "invalid" // 号码格式不对
  | "duplicate-season" // 本季已建过同号牌
  | "blocked-open-association" // 旧季同号牌还有未结束的关联，禁止重投
  | "reuse-needs-ack" // 旧季号码重投：关联均已结束，须勾选确认
  | "ok"; // 新号，可直接建

export interface IssueCheck {
  status: IssueStatus;
  existing?: { seasonId: string; tagNo: string };
  openAssociation?: ActiveRef | null;
  oldRefs?: ActiveRef[];
}

/** 建牌前检查：全季不重号；旧季号码重投前必须确认没有未结束的关联。 */
export function checkIssue(state: LedgerState, seasonId: string, tagNo: string): IssueCheck {
  if (!isValidTagNo(tagNo)) return { status: "invalid" };

  const sameSeason = state.tags.find((t) => t.seasonId === seasonId && t.number === tagNo);
  if (sameSeason) {
    return { status: "duplicate-season", existing: { seasonId, tagNo } };
  }

  const oldRefs = findOldSeasonRefs(state, seasonId, tagNo);
  if (oldRefs.length === 0) return { status: "ok" };

  const openAssociation = oldRefs.find((r) => r.open) ?? null;
  if (openAssociation) {
    return { status: "blocked-open-association", openAssociation, oldRefs };
  }
  return { status: "reuse-needs-ack", oldRefs };
}

export type CheckoutStatus =
  | "invalid" // 号码格式不对
  | "unknown" // 本季没有这块牌
  | "duplicate" // 重复领用：牌还没归还
  | "ok";

export interface CheckoutCheck {
  status: CheckoutStatus;
  conflict?: ActiveRef;
}

/** 领用前检查：牌须已建；未归还的牌不能再领，冲突要指出牌号、原探方、原领用人。 */
export function checkCheckout(state: LedgerState, seasonId: string, tagNo: string): CheckoutCheck {
  if (!isValidTagNo(tagNo)) return { status: "invalid" };
  const tag = state.tags.find((t) => t.seasonId === seasonId && t.number === tagNo);
  if (!tag) return { status: "unknown" };
  const active = activeAssignment(tag);
  if (active) return { status: "duplicate", conflict: toActiveRef(tag, active) };
  return { status: "ok" };
}

export type ReturnStatus = "invalid" | "unknown" | "not-out" | "ok";

/** 归还前检查：牌须已建且当前确实领出未还。 */
export function checkReturn(state: LedgerState, seasonId: string, tagNo: string): ReturnStatus {
  if (!isValidTagNo(tagNo)) return "invalid";
  const tag = state.tags.find((t) => t.seasonId === seasonId && t.number === tagNo);
  if (!tag) return "unknown";
  return activeAssignment(tag) ? "ok" : "not-out";
}
