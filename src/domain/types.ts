/**
 * 编号牌台账的领域模型与状态机（规则层，纯函数，不碰存储与界面）。
 *
 * 一本台账 = 一串按时间追加的事件（建牌 / 领用 / 归还）。
 * 页面状态由 replayLedger 从事件流整体回放得出，重开页面后仍能逐条追溯。
 */

/** 一次领用关联：一块牌 ↔ 一个遗迹单位，写明探方、地层、领用人。 */
export interface Assignment {
  id: string;
  feature: string;
  trench: string;
  layer: string;
  person: string;
  checkedOutAt: string;
  returnedAt: string | null;
  condition: string | null;
}

/** 一块编号牌：按发掘季建，牌号全季唯一。 */
export interface Tag {
  id: string;
  seasonId: string;
  number: string;
  createdAt: string;
  assignments: Assignment[];
}

export type TagEventType = "issue" | "checkout" | "return";

/** 台账事件：只允许追加，不允许改写。 */
export interface TagEvent {
  id: string;
  at: string;
  type: TagEventType;
  seasonId: string;
  tagNo: string;
  feature?: string;
  trench?: string;
  layer?: string;
  person?: string;
  condition?: string;
}

export interface LedgerState {
  tags: Tag[];
}

export const emptyLedger: LedgerState = { tags: [] };

/** 这块牌当前未结束的领用（有且最多有一条）。 */
export function activeAssignment(tag: Tag): Assignment | null {
  return tag.assignments.find((a) => a.returnedAt === null) ?? null;
}

export function tagStatus(tag: Tag): "在库" | "在用" {
  return activeAssignment(tag) ? "在用" : "在库";
}

/** 把一条事件套用到台账上，返回新状态（不改原状态）。 */
export function applyEvent(state: LedgerState, event: TagEvent): LedgerState {
  if (event.type === "issue") {
    const tag: Tag = {
      id: event.id,
      seasonId: event.seasonId,
      number: event.tagNo,
      createdAt: event.at,
      assignments: [],
    };
    return { tags: [...state.tags, tag] };
  }

  const tags = state.tags.map((tag) => {
    if (!(tag.seasonId === event.seasonId && tag.number === event.tagNo)) return tag;
    if (event.type === "checkout") {
      const assignment: Assignment = {
        id: event.id,
        feature: event.feature ?? "",
        trench: event.trench ?? "",
        layer: event.layer ?? "",
        person: event.person ?? "",
        checkedOutAt: event.at,
        returnedAt: null,
        condition: null,
      };
      return { ...tag, assignments: [...tag.assignments, assignment] };
    }
    // return：结束当前未归还的那条领用，并记下牌面状态
    const assignments = tag.assignments.map((a) =>
      a.returnedAt === null
        ? { ...a, returnedAt: event.at, condition: event.condition ?? "" }
        : a
    );
    return { ...tag, assignments };
  });
  return { tags };
}

/** 从事件流整体回放出台账。 */
export function replayLedger(events: TagEvent[]): LedgerState {
  return events.reduce(applyEvent, emptyLedger);
}
