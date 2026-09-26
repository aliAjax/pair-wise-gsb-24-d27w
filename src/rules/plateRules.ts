import type { Checkout, Ledger, Plate } from "../types";

/**
 * 规则层：编号牌的建、领、还、重投全部校验都在这里。
 * 纯函数，不读写本机记录，页面只负责把结果摆出来。
 */

export interface Conflict {
  number: string;
  grid: string;
  borrower: string;
  unit: string;
  seasonName: string;
  checkedOutAt: string;
}

export interface RuleIssue {
  code: string;
  message: string;
  /** 冲突详情：牌号、原探方、原领用人 */
  conflict?: Conflict;
}

export const seasonNameOf = (ledger: Ledger, seasonId: string): string =>
  ledger.seasons.find((s) => s.id === seasonId)?.name ?? seasonId;

export function toConflict(ledger: Ledger, checkout: Checkout): Conflict {
  return {
    number: checkout.number,
    grid: checkout.grid,
    borrower: checkout.borrower,
    unit: checkout.unit,
    seasonName: seasonNameOf(ledger, checkout.seasonId),
    checkedOutAt: checkout.checkedOutAt,
  };
}

/** 某块牌当前未结束的领用（一块牌同一时间只跟一处） */
export function openCheckoutOfPlate(ledger: Ledger, plateId: string): Checkout | undefined {
  return ledger.checkouts.find((c) => c.plateId === plateId && c.returnedAt === null);
}

/** 某牌号在指定季之外是否还有未结束的关联（旧季号码重投前必查） */
export function unfinishedByNumber(ledger: Ledger, number: string, exceptSeasonId: string): Checkout[] {
  return ledger.checkouts.filter(
    (c) => c.number === number && c.seasonId !== exceptSeasonId && c.returnedAt === null
  );
}

/** 某遗迹单位当前是否已挂着牌 */
export function openCheckoutOfUnit(ledger: Ledger, unit: string): Checkout | undefined {
  return ledger.checkouts.find((c) => c.unit === unit && c.returnedAt === null);
}

/** 规则一：牌按发掘季建，牌号全季不重复 */
export function validateNewPlate(ledger: Ledger, seasonId: string, number: string): RuleIssue[] {
  const trimmed = number.trim();
  if (!trimmed) {
    return [{ code: "missing-number", message: "请填写牌号。" }];
  }
  if (ledger.plates.some((p) => p.seasonId === seasonId && p.number === trimmed)) {
    return [
      {
        code: "duplicate-in-season",
        message: `牌号 ${trimmed} 本季已建，牌号全季不重复。`,
      },
    ];
  }
  return [];
}

/** 规则二：旧季号码重投前，确认没有未结束的关联 */
export function validateReissue(ledger: Ledger, seasonId: string, number: string): RuleIssue[] {
  return unfinishedByNumber(ledger, seasonId, number.trim()).map((c) => ({
    code: "unfinished-history",
    message: `牌号 ${c.number} 在${seasonNameOf(ledger, c.seasonId)}仍有未归还领用，不能重投。`,
    conflict: toConflict(ledger, c),
  }));
}

/** 规则三：领用写明探方、地层和人；一块牌跟一个遗迹单位 */
export function validateCheckout(
  ledger: Ledger,
  plate: Plate,
  draft: { grid: string; layer: string; unit: string; borrower: string }
): RuleIssue[] {
  const issues: RuleIssue[] = [];
  if (!draft.grid) issues.push({ code: "missing-grid", message: "领用须写明探方。" });
  if (!draft.layer) issues.push({ code: "missing-layer", message: "领用须写明地层。" });
  if (!draft.unit.trim()) issues.push({ code: "missing-unit", message: "领用须写明遗迹单位。" });
  if (!draft.borrower) issues.push({ code: "missing-borrower", message: "领用须写明领用人。" });

  const open = openCheckoutOfPlate(ledger, plate.id);
  if (open) {
    issues.push({
      code: "plate-in-use",
      message: `牌号 ${plate.number} 已借出未归还，不能重复领用。`,
      conflict: toConflict(ledger, open),
    });
  }

  const unit = draft.unit.trim();
  const unitOpen = unit ? openCheckoutOfUnit(ledger, unit) : undefined;
  if (unitOpen) {
    issues.push({
      code: "unit-in-use",
      message: `遗迹单位 ${unitOpen.unit} 已挂牌 ${unitOpen.number}，一块牌跟一个遗迹单位。`,
      conflict: toConflict(ledger, unitOpen),
    });
  }
  return issues;
}

/** 规则四：验收退场后归还，牌面状态一并记下 */
export function validateReturn(
  ledger: Ledger,
  checkoutId: string,
  condition: string,
  accepted: boolean
): RuleIssue[] {
  const target = ledger.checkouts.find((c) => c.id === checkoutId);
  if (!target || target.returnedAt !== null) {
    return [{ code: "no-open-checkout", message: "该领用记录不存在或已归还。" }];
  }
  const issues: RuleIssue[] = [];
  if (!accepted) {
    issues.push({
      code: "not-accepted",
      message: `牌号 ${target.number}：须确认遗迹单位已验收退场，方可归还。`,
    });
  }
  if (!condition) {
    issues.push({
      code: "missing-condition",
      message: `牌号 ${target.number}：归还时须记下牌面状态。`,
    });
  }
  return issues;
}
