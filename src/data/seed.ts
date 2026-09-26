import type { Ledger } from "../types";

/**
 * 资料层：基础名录与初始台账。
 * 只负责“有什么”，不含校验规则，也不直接碰本机记录。
 */

export const GRIDS = ["T0203", "T0204", "T0301", "T0302", "T0401", "T0402"];

export const LAYERS = ["第1层", "第2层", "第3层", "第3b层", "第4层", "第5层"];

export const UNIT_SUGGESTIONS = [
  "H12灰坑",
  "H13灰坑",
  "H15灰坑",
  "F2房址",
  "F3房址",
  "M3墓葬",
  "G5沟",
];

export const CREW = ["陈岩", "李青", "王蔚", "赵衡", "宋禾"];

export const PLATE_CONDITIONS = ["完好", "边缘磨损", "牌面污损", "字迹褪色", "缺角"];

/**
 * 初始台账资料：首次启动时由本机记录层写入 localStorage，
 * 之后一律以本机记录为准，改动这里不会影响已建档的机器。
 */
export const SEED_LEDGER: Ledger = {
  version: 1,
  seasons: [
    { id: "S2025S", name: "2025 春季发掘", note: "已验收撤场", status: "closed" },
    { id: "S2025A", name: "2025 秋季发掘", note: "已验收撤场", status: "closed" },
    { id: "S2026A", name: "2026 秋季发掘", note: "当前发掘季", status: "current" },
  ],
  plates: [
    { id: "p-2025s-001", seasonId: "S2025S", number: "KP-001" },
    { id: "p-2025s-002", seasonId: "S2025S", number: "KP-002" },
    { id: "p-2025s-009", seasonId: "S2025S", number: "KP-009" },
    { id: "p-2025a-001", seasonId: "S2025A", number: "KP-001" },
    { id: "p-2025a-017", seasonId: "S2025A", number: "KP-017" },
    { id: "p-2026a-001", seasonId: "S2026A", number: "KP-001" },
    { id: "p-2026a-002", seasonId: "S2026A", number: "KP-002" },
    { id: "p-2026a-003", seasonId: "S2026A", number: "KP-003" },
  ],
  checkouts: [
    {
      id: "c-2025s-1",
      plateId: "p-2025s-001",
      seasonId: "S2025S",
      number: "KP-001",
      grid: "T0203",
      layer: "第3层",
      unit: "H12灰坑",
      borrower: "陈岩",
      checkedOutAt: "2025-03-12T08:30:00",
      returnedAt: "2025-05-28T16:40:00",
      condition: "完好",
    },
    {
      id: "c-2025s-2",
      plateId: "p-2025s-002",
      seasonId: "S2025S",
      number: "KP-002",
      grid: "T0204",
      layer: "第2层",
      unit: "G5沟",
      borrower: "李青",
      checkedOutAt: "2025-03-15T09:00:00",
      returnedAt: "2025-05-30T15:20:00",
      condition: "边缘磨损",
    },
    {
      id: "c-2025s-3",
      plateId: "p-2025s-009",
      seasonId: "S2025S",
      number: "KP-009",
      grid: "T0401",
      layer: "第3层",
      unit: "F3房址",
      borrower: "宋禾",
      checkedOutAt: "2025-04-02T08:50:00",
      returnedAt: "2025-05-30T16:10:00",
      condition: "字迹褪色",
    },
    {
      id: "c-2025a-1",
      plateId: "p-2025a-001",
      seasonId: "S2025A",
      number: "KP-001",
      grid: "T0204",
      layer: "第3b层",
      unit: "H13灰坑",
      borrower: "李青",
      checkedOutAt: "2025-09-18T08:10:00",
      returnedAt: "2025-11-20T17:05:00",
      condition: "牌面污损",
    },
    {
      id: "c-2025a-2",
      plateId: "p-2025a-017",
      seasonId: "S2025A",
      number: "KP-017",
      grid: "T0301",
      layer: "第4层",
      unit: "F2房址",
      borrower: "王蔚",
      checkedOutAt: "2025-10-09T09:25:00",
      returnedAt: null,
      condition: null,
    },
    {
      id: "c-2026a-1",
      plateId: "p-2026a-001",
      seasonId: "S2026A",
      number: "KP-001",
      grid: "T0203",
      layer: "第1层",
      unit: "H15灰坑",
      borrower: "赵衡",
      checkedOutAt: "2026-09-21T08:40:00",
      returnedAt: "2026-09-24T16:30:00",
      condition: "完好",
    },
    {
      id: "c-2026a-2",
      plateId: "p-2026a-002",
      seasonId: "S2026A",
      number: "KP-002",
      grid: "T0302",
      layer: "第2层",
      unit: "M3墓葬",
      borrower: "陈岩",
      checkedOutAt: "2026-09-20T10:15:00",
      returnedAt: null,
      condition: null,
    },
  ],
};
