import { useState } from "react";
import "./styles.css";
import {
  CREW,
  GRIDS,
  LAYERS,
  PLATE_CONDITIONS,
  UNIT_SUGGESTIONS,
} from "./data/seed";
import {
  openCheckoutOfPlate,
  seasonNameOf,
  toConflict,
  unfinishedByNumber,
  validateCheckout,
  validateNewPlate,
  validateReissue,
  validateReturn,
} from "./rules/plateRules";
import type { RuleIssue } from "./rules/plateRules";
import { loadLedger, resetLedger, saveLedger } from "./store/ledger";
import type { Checkout, Ledger } from "./types";

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const pad = (n: number) => String(n).padStart(2, "0");

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const EMPTY_CHECKOUT = { plateId: "", grid: "", layer: "", unit: "", borrower: "" };

const statusColors = ["status-ok", "status-watch", "status-danger"];

function MetricCard({ label, value, index }: { label: string; value: string; index: number }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <i className={statusColors[index % statusColors.length]} />
    </article>
  );
}

/** 规则校验结果：消息 + 冲突详情（牌号、原探方、原领用人） */
function IssueList({ issues }: { issues: RuleIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <div className="issue-box">
      {issues.map((issue, index) => (
        <div className="issue-item" key={`${issue.code}-${index}`}>
          <p>{issue.message}</p>
          {issue.conflict && (
            <dl className="conflict">
              <div>
                <dt>牌号</dt>
                <dd>{issue.conflict.number}</dd>
              </div>
              <div>
                <dt>原探方</dt>
                <dd>{issue.conflict.grid}</dd>
              </div>
              <div>
                <dt>原领用人</dt>
                <dd>{issue.conflict.borrower}</dd>
              </div>
            </dl>
          )}
        </div>
      ))}
    </div>
  );
}

function App() {
  const [ledger, setLedger] = useState<Ledger>(loadLedger);

  // 建牌
  const [newNumber, setNewNumber] = useState("");
  const [reissueAck, setReissueAck] = useState(false);
  const [plateIssues, setPlateIssues] = useState<RuleIssue[]>([]);

  // 领用
  const [checkoutDraft, setCheckoutDraft] = useState(EMPTY_CHECKOUT);
  const [checkoutIssues, setCheckoutIssues] = useState<RuleIssue[]>([]);

  // 归还
  const [returnDrafts, setReturnDrafts] = useState<
    Record<string, { condition: string; accepted: boolean }>
  >({});
  const [returnIssues, setReturnIssues] = useState<RuleIssue[]>([]);

  const commit = (next: Ledger) => {
    saveLedger(next);
    setLedger(next);
  };

  const currentSeason =
    ledger.seasons.find((s) => s.status === "current") ?? ledger.seasons[ledger.seasons.length - 1];

  const seasonPlates = ledger.plates.filter((p) => p.seasonId === currentSeason.id);
  const openAll = ledger.checkouts.filter((c) => c.returnedAt === null);
  const openSeason = openAll.filter((c) => c.seasonId === currentSeason.id);
  const idleCount = seasonPlates.filter((p) => !openCheckoutOfPlate(ledger, p.id)).length;

  // 建牌输入的即时核查（最终仍以规则层校验为准）
  const trimmed = newNumber.trim();
  const dupInSeason =
    trimmed !== "" &&
    ledger.plates.some((p) => p.seasonId === currentSeason.id && p.number === trimmed);
  const oldSeasonUses =
    trimmed === ""
      ? []
      : ledger.plates.filter((p) => p.number === trimmed && p.seasonId !== currentSeason.id);
  const unfinishedOld = trimmed === "" ? [] : unfinishedByNumber(ledger, trimmed, currentSeason.id);
  const needsReissueAck = oldSeasonUses.length > 0 && unfinishedOld.length === 0;
  const registerDisabled =
    trimmed === "" || dupInSeason || unfinishedOld.length > 0 || (needsReissueAck && !reissueAck);

  const handleRegister = () => {
    const number = newNumber.trim();
    const issues = [
      ...validateNewPlate(ledger, currentSeason.id, number),
      ...validateReissue(ledger, currentSeason.id, number),
    ];
    if (issues.length > 0) {
      setPlateIssues(issues);
      return;
    }
    if (needsReissueAck && !reissueAck) {
      setPlateIssues([
        { code: "reissue-confirm", message: `牌号 ${number} 为旧季号码，重投前请勾选确认。` },
      ]);
      return;
    }
    commit({
      ...ledger,
      plates: [...ledger.plates, { id: uid(), seasonId: currentSeason.id, number }],
    });
    setNewNumber("");
    setReissueAck(false);
    setPlateIssues([]);
  };

  const updateCheckoutDraft = (patch: Partial<typeof EMPTY_CHECKOUT>) => {
    setCheckoutDraft((prev) => ({ ...prev, ...patch }));
    setCheckoutIssues([]);
  };

  const handleCheckout = () => {
    const plate = ledger.plates.find((p) => p.id === checkoutDraft.plateId);
    if (!plate) {
      setCheckoutIssues([{ code: "missing-plate", message: "请选择要领用的编号牌。" }]);
      return;
    }
    const issues = validateCheckout(ledger, plate, checkoutDraft);
    if (issues.length > 0) {
      setCheckoutIssues(issues);
      return;
    }
    const record: Checkout = {
      id: uid(),
      plateId: plate.id,
      seasonId: plate.seasonId,
      number: plate.number,
      grid: checkoutDraft.grid,
      layer: checkoutDraft.layer,
      unit: checkoutDraft.unit.trim(),
      borrower: checkoutDraft.borrower,
      checkedOutAt: new Date().toISOString(),
      returnedAt: null,
      condition: null,
    };
    commit({ ...ledger, checkouts: [...ledger.checkouts, record] });
    setCheckoutDraft(EMPTY_CHECKOUT);
    setCheckoutIssues([]);
  };

  const setReturnDraft = (id: string, patch: Partial<{ condition: string; accepted: boolean }>) => {
    setReturnDrafts((prev) => {
      const current = prev[id] ?? { condition: "", accepted: false };
      return { ...prev, [id]: { ...current, ...patch } };
    });
    setReturnIssues([]);
  };

  const handleReturn = (checkoutId: string) => {
    const draft = returnDrafts[checkoutId] ?? { condition: "", accepted: false };
    const issues = validateReturn(ledger, checkoutId, draft.condition, draft.accepted);
    if (issues.length > 0) {
      setReturnIssues(issues);
      return;
    }
    commit({
      ...ledger,
      checkouts: ledger.checkouts.map((c) =>
        c.id === checkoutId
          ? { ...c, returnedAt: new Date().toISOString(), condition: draft.condition }
          : c
      ),
    });
    setReturnIssues([]);
  };

  const handleReset = () => {
    if (!window.confirm("清空本机记录并恢复初始资料？")) return;
    setLedger(resetLedger());
    setNewNumber("");
    setReissueAck(false);
    setPlateIssues([]);
    setCheckoutDraft(EMPTY_CHECKOUT);
    setCheckoutIssues([]);
    setReturnDrafts({});
    setReturnIssues([]);
  };

  const sortedRecords = [...ledger.checkouts].sort((a, b) =>
    b.checkedOutAt.localeCompare(a.checkedOutAt)
  );

  const metrics = [
    { label: "本季在册牌", value: String(seasonPlates.length) },
    { label: "本季借出中", value: String(openSeason.length) },
    { label: "在架可领", value: String(idleCount) },
    { label: "未归还（含旧季）", value: String(openAll.length) },
  ];

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">hxwl-10 · 考古探方记录 · port 5110</p>
          <h1>探方编号牌领用归还台</h1>
          <p className="subtitle">
            编号牌按发掘季建立、牌号全季不重复；一块牌跟一个遗迹单位，领用写明探方、地层与领用人，
            遗迹验收退场后归还并记下牌面状态。台账存于本机，重开页面仍能追到每次领用。
          </p>
        </div>
        <div className="stack-card">
          <span>当前发掘季</span>
          <strong>{currentSeason.name}</strong>
          <p className="stack-note">
            {currentSeason.note} · 在册 {seasonPlates.length} 块 · 借出 {openSeason.length} 块
          </p>
        </div>
      </section>

      <section className="metrics-grid">
        {metrics.map((metric, index) => (
          <MetricCard key={metric.label} label={metric.label} value={metric.value} index={index} />
        ))}
      </section>

      {openAll.length > 0 && (
        <section className="panel alert-strip">
          <div className="section-heading">
            <div>
              <p>未归还提示</p>
              <h2>以下编号牌尚未归还</h2>
            </div>
          </div>
          <div className="alert-list">
            {openAll.map((c) => (
              <article key={c.id} className="alert-card">
                <strong>牌号 {c.number}</strong>
                <span>原探方 {c.grid}</span>
                <span>原领用人 {c.borrower}</span>
                <span className="alert-meta">
                  {seasonNameOf(ledger, c.seasonId)} · {fmtTime(c.checkedOutAt)} 领用
                </span>
                {c.seasonId !== currentSeason.id && <em className="tag tag-danger">跨季未归还</em>}
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="workspace">
        <aside className="panel narrow">
          <h2>建牌 · {currentSeason.name}</h2>
          <label>
            <span>牌号（全季不重复）</span>
            <input
              value={newNumber}
              placeholder="如 KP-004"
              onChange={(e) => {
                setNewNumber(e.target.value);
                setReissueAck(false);
                setPlateIssues([]);
              }}
            />
          </label>

          {dupInSeason && <p className="hint-danger">牌号 {trimmed} 本季已建，牌号全季不重复。</p>}

          {unfinishedOld.length > 0 && (
            <div className="issue-box">
              <div className="issue-item">
                <p>旧季号码重投被拦下：以下关联未结束</p>
              </div>
              {unfinishedOld.map((c) => {
                const k = toConflict(ledger, c);
                return (
                  <dl className="conflict" key={c.id}>
                    <div>
                      <dt>牌号</dt>
                      <dd>{k.number}</dd>
                    </div>
                    <div>
                      <dt>原探方</dt>
                      <dd>{k.grid}</dd>
                    </div>
                    <div>
                      <dt>原领用人</dt>
                      <dd>{k.borrower}</dd>
                    </div>
                  </dl>
                );
              })}
            </div>
          )}

          {needsReissueAck && (
            <div className="notice-box">
              <p>
                牌号 {trimmed} 曾在
                {[...new Set(oldSeasonUses.map((p) => seasonNameOf(ledger, p.seasonId)))].join("、")}
                使用，旧季关联均已结束。
              </p>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={reissueAck}
                  onChange={(e) => setReissueAck(e.target.checked)}
                />
                <span>确认无未结束关联，重投本季</span>
              </label>
            </div>
          )}

          <div className="form-actions">
            <button className="primary-action" onClick={handleRegister} disabled={registerDisabled}>
              登记建牌
            </button>
          </div>
          <IssueList issues={plateIssues} />

          <h2>规则</h2>
          <ul className="rule-list">
            <li>牌按发掘季建，牌号全季不重复</li>
            <li>一块牌跟一个遗迹单位</li>
            <li>领用写明探方、地层、领用人</li>
            <li>验收退场后归还，记下牌面状态</li>
            <li>旧季号码重投前确认无未结束关联</li>
          </ul>
        </aside>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p>领用</p>
              <h2>编号牌领用登记</h2>
            </div>
          </div>
          <div className="form-grid">
            <label>
              <span>编号牌</span>
              <select
                value={checkoutDraft.plateId}
                onChange={(e) => updateCheckoutDraft({ plateId: e.target.value })}
              >
                <option value="">选择编号牌</option>
                {seasonPlates.map((p) => {
                  const open = openCheckoutOfPlate(ledger, p.id);
                  return (
                    <option key={p.id} value={p.id}>
                        {open
                          ? `${p.number}（借出中 · ${open.grid} · ${open.borrower}）`
                          : `${p.number}（在架）`}
                    </option>
                  );
                })}
              </select>
            </label>
            <label>
              <span>领用人</span>
              <select
                value={checkoutDraft.borrower}
                onChange={(e) => updateCheckoutDraft({ borrower: e.target.value })}
              >
                <option value="">选择领用人</option>
                {CREW.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>探方</span>
              <select
                value={checkoutDraft.grid}
                onChange={(e) => updateCheckoutDraft({ grid: e.target.value })}
              >
                <option value="">选择探方</option>
                {GRIDS.map((grid) => (
                  <option key={grid} value={grid}>
                    {grid}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>地层</span>
              <select
                value={checkoutDraft.layer}
                onChange={(e) => updateCheckoutDraft({ layer: e.target.value })}
              >
                <option value="">选择地层</option>
                {LAYERS.map((layer) => (
                  <option key={layer} value={layer}>
                    {layer}
                  </option>
                ))}
              </select>
            </label>
            <label className="full">
              <span>遗迹单位（一块牌跟一个遗迹单位）</span>
              <input
                list="unit-suggestions"
                value={checkoutDraft.unit}
                placeholder="如 H16灰坑"
                onChange={(e) => updateCheckoutDraft({ unit: e.target.value })}
              />
              <datalist id="unit-suggestions">
                {UNIT_SUGGESTIONS.map((unit) => (
                  <option key={unit} value={unit} />
                ))}
              </datalist>
            </label>
          </div>
          <div className="form-actions">
            <button className="primary-action" onClick={handleCheckout}>
              领用登记
            </button>
          </div>
          <IssueList issues={checkoutIssues} />
        </section>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p>归还</p>
            <h2>验收退场后归还</h2>
          </div>
        </div>
        {openAll.length === 0 ? (
          <p className="empty">当前没有未归还的编号牌。</p>
        ) : (
          <div className="return-grid">
            {openAll.map((c) => {
              const draft = returnDrafts[c.id] ?? { condition: "", accepted: false };
              return (
                <article key={c.id} className="return-card">
                  <div className="return-head">
                    <strong>牌号 {c.number}</strong>
                    <span className="tag tag-warn">{seasonNameOf(ledger, c.seasonId)}</span>
                    {c.seasonId !== currentSeason.id && (
                      <span className="tag tag-danger">跨季未归还</span>
                    )}
                  </div>
                  <p>
                    探方 {c.grid} · 地层 {c.layer} · 遗迹单位 {c.unit}
                  </p>
                  <p>
                    领用人 {c.borrower} · {fmtTime(c.checkedOutAt)} 领用
                  </p>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={draft.accepted}
                      onChange={(e) => setReturnDraft(c.id, { accepted: e.target.checked })}
                    />
                    <span>遗迹单位已验收退场</span>
                  </label>
                  <label>
                    <span>牌面状态</span>
                    <select
                      value={draft.condition}
                      onChange={(e) => setReturnDraft(c.id, { condition: e.target.value })}
                    >
                      <option value="">选择牌面状态</option>
                      {PLATE_CONDITIONS.map((condition) => (
                        <option key={condition} value={condition}>
                          {condition}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="primary-action" onClick={() => handleReturn(c.id)}>
                    归还登记
                  </button>
                </article>
              );
            })}
          </div>
        )}
        <IssueList issues={returnIssues} />
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p>牌架</p>
            <h2>{currentSeason.name} · 在册编号牌</h2>
          </div>
        </div>
        <div className="rack">
          {seasonPlates.map((p) => {
            const open = openCheckoutOfPlate(ledger, p.id);
            return (
              <div key={p.id} className={open ? "rack-chip busy" : "rack-chip"}>
                <strong>{p.number}</strong>
                <span>{open ? `借出中 · ${open.grid} · ${open.borrower}` : "在架可领"}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p>台账</p>
            <h2>领用归还记录（本机保存）</h2>
          </div>
          <button onClick={handleReset}>重置演示数据</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>牌号</th>
                <th>发掘季</th>
                <th>探方</th>
                <th>地层</th>
                <th>遗迹单位</th>
                <th>领用人</th>
                <th>领用时间</th>
                <th>归还时间</th>
                <th>牌面状态</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {sortedRecords.map((c) => (
                <tr key={c.id}>
                  <td>{c.number}</td>
                  <td>{seasonNameOf(ledger, c.seasonId)}</td>
                  <td>{c.grid}</td>
                  <td>{c.layer}</td>
                  <td>{c.unit}</td>
                  <td>{c.borrower}</td>
                  <td>{fmtTime(c.checkedOutAt)}</td>
                  <td>{c.returnedAt ? fmtTime(c.returnedAt) : "—"}</td>
                  <td>{c.condition ?? "—"}</td>
                  <td>
                    {c.returnedAt ? (
                      <span className="tag tag-ok">已归还</span>
                    ) : (
                      <span className="tag tag-danger">借出中</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default App;
