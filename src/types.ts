export interface Season {
  id: string;
  name: string;
  note: string;
  status: "current" | "closed";
}

export interface Plate {
  id: string;
  seasonId: string;
  /** 牌号，全季不重复 */
  number: string;
}

export interface Checkout {
  id: string;
  plateId: string;
  seasonId: string;
  /** 冗余牌号，台账直接可读 */
  number: string;
  /** 探方 */
  grid: string;
  /** 地层 */
  layer: string;
  /** 遗迹单位，一块牌跟一个 */
  unit: string;
  /** 领用人 */
  borrower: string;
  checkedOutAt: string;
  returnedAt: string | null;
  /** 归还时记下的牌面状态 */
  condition: string | null;
}

export interface Ledger {
  version: number;
  seasons: Season[];
  plates: Plate[];
  checkouts: Checkout[];
}
