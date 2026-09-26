import { seedEvents } from "../src/data/reference";
import { makeCheckoutEvent, makeIssueEvent, makeReturnEvent } from "../src/domain/events";
import { checkCheckout, checkIssue, checkReturn } from "../src/domain/rules";
import { activeAssignment, replayLedger } from "../src/domain/types";

let failures = 0;
function assert(name: string, cond: boolean) {
  if (cond) {
    console.log(`PASS ${name}`);
  } else {
    failures++;
    console.error(`FAIL ${name}`);
  }
}

// 演示底账回放
let state = replayLedger(seedEvents);

// 2026B 已有 001 且在用
assert("本季重号建牌被拒", checkIssue(state, "2026B", "001").status === "duplicate-season");

// 003 在库，可再领用
assert("在库牌可领用", checkCheckout(state, "2026B", "003").status === "ok");

// 001 在用：重复领用，冲突要含牌号、原探方、原领用人
const dup = checkCheckout(state, "2026B", "001");
assert(
  "重复领用指出牌号/原探方/原领用人",
  dup.status === "duplicate" &&
    dup.conflict!.tagNo === "001" &&
    dup.conflict!.trench === "T0204" &&
    dup.conflict!.person === "王岚"
);

// 007 旧季（2026A）有未结束关联：本季重投被拦下
const blocked = checkIssue(state, "2026B", "007");
assert(
  "旧号重投有未结束关联被拦",
  blocked.status === "blocked-open-association" &&
    blocked.openAssociation!.trench === "T0301" &&
    blocked.openAssociation!.person === "赵启"
);

// 001 在 2026B 正被领用：跨季重投 001 也应被拦下
const blockedCross = checkIssue(state, "2026A", "001");
assert(
  "他季在用中的号码重投被拦",
  blockedCross.status === "blocked-open-association" &&
    blockedCross.openAssociation!.seasonId === "2026B"
);

// 002 在 2025B 已归还、2026B 建了但未领用：在 2026A 重投应要求确认
const reuse = checkIssue(state, "2026A", "002");
assert(
  "旧号关联均已结束→重投需确认",
  reuse.status === "reuse-needs-ack" && reuse.oldRefs!.every((r) => !r.open)
);

// 新号直接可建
assert("全新号码可建", checkIssue(state, "2026B", "088").status === "ok");

// 把 2026A 的 007 归还后，2026B 重投 007 变为需确认
state = replayLedger([
  ...seedEvents,
  makeReturnEvent("e1", "2026-09-25T10:00:00+08:00", "2026A", "007", "字迹磨损"),
]);
assert(
  "旧关联归还后重投转为需确认",
  checkIssue(state, "2026B", "007").status === "reuse-needs-ack"
);

// 确认后建牌 + 领用 + 归还，状态机闭环
const s2 = replayLedger([
  ...seedEvents,
  makeIssueEvent("e2", "2026-09-25T10:05:00+08:00", "2026B", "007"),
  makeCheckoutEvent("e3", "2026-09-25T10:10:00+08:00", "2026B", "007", {
    feature: "H40 灰坑", trench: "T0405", layer: "第2层", person: "陈树",
  }),
]);
const t007 = s2.tags.find((t) => t.seasonId === "2026B" && t.number === "007")!;
assert("领用后在用", activeAssignment(t007)?.person === "陈树");
assert("归还检查：领出可还", checkReturn(s2, "2026B", "007") === "ok");

const s3 = replayLedger([
  ...seedEvents,
  { id: "e2", at: "2026-09-25T10:05:00+08:00", type: "issue", seasonId: "2026B", tagNo: "007" },
  {
    id: "e3", at: "2026-09-25T10:10:00+08:00", type: "checkout", seasonId: "2026B", tagNo: "007",
    feature: "H40 灰坑", trench: "T0405", layer: "第2层", person: "陈树",
  },
  { id: "e4", at: "2026-09-26T16:00:00+08:00", type: "return", seasonId: "2026B", tagNo: "007", condition: "牌面完好" },
]);
const t007b = s3.tags.find((t) => t.seasonId === "2026B" && t.number === "007")!;
assert("归还后在库", activeAssignment(t007b) === null);
assert("牌面状态已记下", t007b.assignments[0]?.condition === "牌面完好");
assert("未领出的牌不能还", checkReturn(s3, "2026B", "002") === "not-out");
assert("本季没建的牌不能还", checkReturn(s3, "2026B", "099") === "unknown");

// 事件顺序无关假设：归还事件必须晚于领用（按追加顺序）；乱序归还不应误标
const partial = replayLedger(seedEvents);
const c001 = partial.tags.find((t) => t.seasonId === "2026B" && t.number === "001")!;
assert("2026B-001 仍在用（王岚）", activeAssignment(c001)?.person === "王岚");

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
