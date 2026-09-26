import { useState } from "react";
import { seasonName, tagConditions } from "../data/reference";
import { makeReturnEvent } from "../domain/events";
import { checkReturn } from "../domain/rules";
import { findActiveRefByNo } from "../domain/rules";
import type { LedgerState, TagEvent } from "../domain/types";
import { canonicalTagNo, formatTime, newEventId, nowIso } from "../lib/time";
import { Field, Notice } from "./Notice";

export function ReturnPanel({
  seasonId,
  ledger,
  onAppend,
}: {
  seasonId: string;
  ledger: LedgerState;
  onAppend: (event: TagEvent) => void;
}) {
  const [tagNo, setTagNo] = useState("");
  const [condition, setCondition] = useState(tagConditions[0]);
  const [note, setNote] = useState("");
  const [done, setDone] = useState("");

  const normalized = canonicalTagNo(tagNo);
  const status = tagNo.trim() ? checkReturn(ledger, seasonId, normalized) : null;
  const active = tagNo.trim() ? findActiveRefByNo(ledger, seasonId, normalized) : null;

  const canSubmit = status === "ok" && Boolean(condition.trim());

  const submit = () => {
    if (!canSubmit) return;
    const text = note.trim() ? `${condition}｜${note.trim()}` : condition;
    onAppend(makeReturnEvent(newEventId(), nowIso(), seasonId, normalized, text));
    setDone(normalized);
    setTagNo("");
    setNote("");
    setCondition(tagConditions[0]);
    window.setTimeout(() => setDone(""), 2600);
  };

  return (
    <div className="desk-panel">
      <div className="desk-head">
        <h2>③ 归还</h2>
        <p>遗迹验收退场后归还，牌面状态一并记下</p>
      </div>

      <div className="desk-body">
        <div className="form-grid">
          <Field label="牌号" required>
            <input
              inputMode="numeric"
              placeholder="如 012"
              value={tagNo}
              onChange={(e) => {
                setTagNo(e.target.value);
                setDone("");
              }}
            />
          </Field>
          <Field label="牌面状态" required>
            <select value={condition} onChange={(e) => setCondition(e.target.value)}>
              {tagConditions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="状态备注">
            <input
              placeholder="选填，如掉漆位置、补登原因"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
        </div>

        {active && (
          <div className="return-target">
            <span className="tag-badge">{active.tagNo}</span>
            <div>
              <strong>{active.feature}</strong>
              <p>
                原探方 {active.trench} · {seasonName(seasonId)} · 领用人 {active.person} ·{" "}
                {formatTime(active.since)} 领出
              </p>
            </div>
          </div>
        )}

        <button className="primary-action" disabled={!canSubmit} onClick={submit}>
          验收归还
        </button>

        {done && <Notice kind="ok">{done} 号牌已归还，牌面状态已记入台账。</Notice>}

        {status === "invalid" && (
          <Notice kind="error" title="牌号不合规">牌号请填 1～4 位数字。</Notice>
        )}
        {status === "unknown" && (
          <Notice kind="warn" title="本季没有这块牌">
            {normalized} 号牌在{seasonName(seasonId)}没有建牌记录，无法归还。
          </Notice>
        )}
        {status === "not-out" && (
          <Notice kind="info">
            {normalized} 号牌当前在库，没有未归还的领用，无需再办归还。
          </Notice>
        )}
      </div>
    </div>
  );
}
