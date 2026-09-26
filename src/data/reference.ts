/**
 * 资料层：发掘季、探方、地层、牌面状态等静态档案，以及首次打开时的演示底账。
 * 这里只放数据，不放规则；本机产生的记录一律走 store/ledgerStore，不写进这里。
 */

import type { TagEvent } from "../domain/types";

export interface SeasonInfo {
  id: string;
  name: string;
  note: string;
  current: boolean;
}

export const seasons: SeasonInfo[] = [
  { id: "2025B", name: "2025 秋季发掘季", note: "已验收撤场，旧牌号可按规定重投", current: false },
  { id: "2026A", name: "2026 春季发掘季", note: "已验收撤场，旧牌号可按规定重投", current: false },
  { id: "2026B", name: "2026 秋季发掘季", note: "当前发掘季", current: true },
];

export const currentSeasonId = "2026B";

export function seasonName(seasonId: string): string {
  return seasons.find((s) => s.id === seasonId)?.name ?? seasonId;
}

/** 探方目录（示例）。 */
export const trenches: string[] = ["T0203", "T0204", "T0301", "T0302", "T0405"];

/** 地层目录（示例）。 */
export const layers: string[] = ["第1层", "第2层", "第3层", "第4层", "第5层下"];

/** 常见遗迹单位类型，供填写时参考。 */
export const featureTypes: string[] = ["灰坑", "墓葬", "房址", "沟状遗迹", "灶址", "水井"];

/** 归还时登记的牌面状态。 */
export const tagConditions: string[] = [
  "牌面完好",
  "字迹磨损",
  "牌面污损",
  "牌体开裂",
  "牌体遗失补登",
];

/** 台面上的规矩，与 domain/rules.ts 一一对应。 */
export const deskRules: string[] = [
  "牌按发掘季建，牌号全季不重复",
  "一块牌只跟一个遗迹单位",
  "领用写明探方、地层、领用人",
  "遗迹验收退场后归还，并登记牌面状态",
  "旧季号码重投前，确认没有未结束的关联",
];

/**
 * 演示底账：只在 localStorage 还没有任何记录时写入一次，
 * 之后的一切领用归还都追加在本机记录里，与这份资料互不相干。
 */
export const seedEvents: TagEvent[] = [
  // —— 2025 秋季发掘季（旧季，已撤场）——
  { id: "seed-01", at: "2025-09-20T08:10:00+08:00", type: "issue", seasonId: "2025B", tagNo: "001" },
  { id: "seed-02", at: "2025-09-20T08:12:00+08:00", type: "issue", seasonId: "2025B", tagNo: "002" },
  { id: "seed-03", at: "2025-09-20T08:15:00+08:00", type: "issue", seasonId: "2025B", tagNo: "007" },
  { id: "seed-03b", at: "2025-09-20T08:18:00+08:00", type: "issue", seasonId: "2025B", tagNo: "012" },
  {
    id: "seed-04", at: "2025-09-21T09:02:00+08:00", type: "checkout", seasonId: "2025B", tagNo: "001",
    feature: "H21 灰坑", trench: "T0203", layer: "第3层", person: "王岚",
  },
  {
    id: "seed-05", at: "2025-09-22T10:40:00+08:00", type: "checkout", seasonId: "2025B", tagNo: "002",
    feature: "M7 墓葬", trench: "T0204", layer: "第4层", person: "李牧",
  },
  {
    id: "seed-05b", at: "2025-09-24T09:05:00+08:00", type: "checkout", seasonId: "2025B", tagNo: "012",
    feature: "H30 灰坑", trench: "T0302", layer: "第2层", person: "陈树",
  },
  {
    id: "seed-05c", at: "2025-10-30T16:00:00+08:00", type: "return", seasonId: "2025B", tagNo: "012",
    condition: "牌面完好",
  },
  {
    id: "seed-06", at: "2025-11-02T16:20:00+08:00", type: "return", seasonId: "2025B", tagNo: "001",
    condition: "牌面完好",
  },
  {
    id: "seed-07", at: "2025-11-05T15:30:00+08:00", type: "return", seasonId: "2025B", tagNo: "002",
    condition: "字迹磨损",
  },
  // —— 2026 春季发掘季（旧季，007 重投后领出未还，用于演示“未结束的关联”）——
  { id: "seed-08", at: "2026-03-10T08:30:00+08:00", type: "issue", seasonId: "2026A", tagNo: "007" },
  {
    id: "seed-09", at: "2026-03-12T09:10:00+08:00", type: "checkout", seasonId: "2026A", tagNo: "007",
    feature: "F3 房址", trench: "T0301", layer: "第4层", person: "赵启",
  },
  // —— 2026 秋季发掘季（当前季）——
  { id: "seed-10", at: "2026-09-20T08:05:00+08:00", type: "issue", seasonId: "2026B", tagNo: "001" },
  { id: "seed-11", at: "2026-09-20T08:06:00+08:00", type: "issue", seasonId: "2026B", tagNo: "002" },
  { id: "seed-12", at: "2026-09-20T08:07:00+08:00", type: "issue", seasonId: "2026B", tagNo: "003" },
  {
    id: "seed-13", at: "2026-09-21T08:40:00+08:00", type: "checkout", seasonId: "2026B", tagNo: "001",
    feature: "H12 灰坑", trench: "T0204", layer: "第3层", person: "王岚",
  },
  {
    id: "seed-14", at: "2026-09-22T09:15:00+08:00", type: "checkout", seasonId: "2026B", tagNo: "003",
    feature: "G4 沟状遗迹", trench: "T0302", layer: "第2层", person: "陈树",
  },
  {
    id: "seed-15", at: "2026-09-24T17:05:00+08:00", type: "return", seasonId: "2026B", tagNo: "003",
    condition: "牌面污损",
  },
];
