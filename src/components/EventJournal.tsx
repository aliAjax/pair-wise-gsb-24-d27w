import { useState } from "react";
import { seasonName } from "../data/reference";
import type { TagEvent } from "../domain/types";
import { formatTime } from "../lib/time";

type Filter = "all" | TagEvent["type"];

const typeLabel: Record<TagEvent["type"], string> = {
  issue: "建牌",
  checkout: "领用",
  return: "归还",
};

const filterOptions: { id: Filter; label: string }[] = [
  { id: "all", label: "全部事件" },
  { id: "issue", label: "建牌" },
  { id: "checkout", label: "领用" },
  { id: "return", label: "归还" },
];

/** 领用归还流水：直接读取追加式事件日志，重开页面也能逐条追溯。 */
export function EventJournal({
  events,
  onReset,
}: {
  events: TagEvent[];
  onReset: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const shown = events.filter((e) => filter === "all" || e.type === filter);

  return (
    <section className="panel journal-panel">
      <div className="section-heading">
        <div>
          <p>本机记录 · 只追加不改写</p>
          <h2>领用归还流水</h2>
        </div>
        <div className="table-tools">
          <div className="seg">
            {filterOptions.map((o) => (
              <button
                key={o.id}
                className={filter === o.id ? "seg-on" : ""}
                onClick={() => setFilter(o.id)}
              >
                {o.label}
              </button>
            ))}
          </div>
          <button className="ghost-action" onClick={onReset} title="清空本机操作，恢复演示底账">
            恢复演示底账
          </button>
        </div>
      </div>

      <ol className="journal">
        {shown.length === 0 && <li className="empty-cell">还没有此类事件。</li>}
        {[...shown].reverse().map((e) => (
          <li key={e.id} className={`journal-item j-${e.type}`}>
            <span className={`j-dot d-${e.type}`} />
            <div className="j-main">
              <div className="j-line">
                <span className={`j-type t-${e.type}`}>{typeLabel[e.type]}</span>
                <strong>{e.tagNo}</strong>
                <span className="j-season">{seasonName(e.seasonId)}</span>
              </div>
              <div className="j-detail">
                {e.type === "issue" && "号牌建档入库"}
                {e.type === "checkout" && (
                  <>
                    {e.feature} · 探方 {e.trench} · {e.layer} · 领用人 <b>{e.person}</b>
                  </>
                )}
                {e.type === "return" && <>遗迹验收退场归还 · 牌面状态：{e.condition}</>}
              </div>
            </div>
            <time>{formatTime(e.at)}</time>
          </li>
        ))}
      </ol>
    </section>
  );
}
