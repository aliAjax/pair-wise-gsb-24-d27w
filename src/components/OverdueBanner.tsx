import { seasonName } from "../data/reference";
import { listOverdue } from "../domain/selectors";
import type { LedgerState } from "../domain/types";
import { formatTime } from "../lib/time";

/** 全台账（跨发掘季）尚未归还的牌，逐条指出牌号、原探方、原领用人。 */
export function OverdueBanner({ ledger }: { ledger: LedgerState }) {
  const overdue = listOverdue(ledger);
  if (overdue.length === 0) {
    return (
      <section className="panel banner banner-ok">
        <strong>在库清晰</strong>
        <span>各发掘季没有未归还的编号牌。</span>
      </section>
    );
  }
  return (
    <section className="panel banner banner-warn">
      <div className="banner-title">
        <strong>有 {overdue.length} 块牌领出未归还</strong>
        <span>跨发掘季核对，旧季号码重投前先处理这些关联：</span>
      </div>
      <ul className="banner-list">
        {overdue.map((r) => (
          <li key={`${r.seasonId}-${r.tagNo}`}>
            <span className="tag-badge">{r.tagNo}</span>
            <span>
              {seasonName(r.seasonId)} · {r.feature} · 原探方 <b>{r.trench}</b> · 原领用人{" "}
              <b>{r.person}</b>
            </span>
            <time>自 {formatTime(r.since)}</time>
          </li>
        ))}
      </ul>
    </section>
  );
}
