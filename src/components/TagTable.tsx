import { Fragment, useMemo, useState } from "react";
import { seasonName } from "../data/reference";
import { listTagsBySeason } from "../domain/selectors";
import type { LedgerState } from "../domain/types";
import { formatTime } from "../lib/time";

type Filter = "all" | "inUse" | "inStock";

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "inUse", label: "在用" },
  { id: "inStock", label: "在库" },
];

export function TagTable({
  seasonId,
  ledger,
}: {
  seasonId: string;
  ledger: LedgerState;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [keyword, setKeyword] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = useMemo(() => {
    const kw = keyword.trim();
    return listTagsBySeason(ledger, seasonId).filter((row) => {
      if (filter === "inUse" && row.status !== "在用") return false;
      if (filter === "inStock" && row.status !== "在库") return false;
      if (!kw) return true;
      const haystack = [
        row.tag.number,
        row.current?.feature ?? "",
        row.current?.trench ?? "",
        row.current?.layer ?? "",
        row.current?.person ?? "",
      ].join(" ");
      return haystack.includes(kw);
    });
  }, [ledger, seasonId, filter, keyword]);

  return (
    <section className="panel table-panel">
      <div className="section-heading">
        <div>
          <p>{seasonName(seasonId)}</p>
          <h2>编号牌台账</h2>
        </div>
        <div className="table-tools">
          <input
            className="search"
            placeholder="搜牌号 / 遗迹 / 探方 / 领用人"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <div className="seg">
            {filters.map((f) => (
              <button
                key={f.id}
                className={filter === f.id ? "seg-on" : ""}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <table className="tag-table">
          <thead>
            <tr>
              <th>牌号</th>
              <th>状态</th>
              <th>遗迹单位</th>
              <th>探方</th>
              <th>地层</th>
              <th>领用人</th>
              <th>领用时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="empty-cell">
                  本季还没有符合条件的牌，先到①建牌。
                </td>
              </tr>
            )}
            {rows.map(({ tag, status, current }) => {
              const open = expanded === tag.id;
              return (
                <Fragment key={tag.id}>
                  <tr className={status === "在用" ? "row-out" : ""}>
                    <td className="num-cell">{tag.number}</td>
                    <td>
                      <span className={status === "在用" ? "pill pill-out" : "pill pill-in"}>
                        {status}
                      </span>
                    </td>
                    <td>{current?.feature ?? "—"}</td>
                    <td>{current?.trench ?? "—"}</td>
                    <td>{current?.layer ?? "—"}</td>
                    <td>{current?.person ?? "—"}</td>
                    <td>{current ? formatTime(current.since) : "—"}</td>
                    <td className="ops-cell">
                      {current && <span className="mini-hint">请到③归还台办理退场</span>}
                      <button className="mini ghost" onClick={() => setExpanded(open ? null : tag.id)}>
                        {open ? "收起历史" : "领用历史"}
                      </button>
                    </td>
                  </tr>
                  {open && (
                    <tr className="history-row">
                      <td colSpan={8}>
                        <div className="history-box">
                          <h4>{tag.number} 号牌领用归还历史（共 {tag.assignments.length} 次领用）</h4>
                          {tag.assignments.length === 0 && <p>建牌后尚未领用。</p>}
                          {[...tag.assignments].reverse().map((a) => (
                            <div key={a.id} className="history-item">
                              <span className={a.returnedAt ? "dot dot-in" : "dot dot-out"} />
                              <div>
                                <strong>
                                  {a.feature} · {a.trench} · {a.layer} · 领用人 {a.person}
                                </strong>
                                <p>
                                  {formatTime(a.checkedOutAt)} 领用
                                  {a.returnedAt
                                    ? ` → ${formatTime(a.returnedAt)} 归还`
                                    : " → 尚未归还"}
                                  {a.condition ? ` · 牌面：${a.condition}` : ""}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
