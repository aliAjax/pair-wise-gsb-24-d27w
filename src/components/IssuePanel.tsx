import { useMemo, useState } from "react";
import { seasonName } from "../data/reference";
import { makeIssueEvent } from "../domain/events";
import { checkIssue } from "../domain/rules";
import type { LedgerState, TagEvent } from "../domain/types";
import { canonicalTagNo, newEventId, nowIso } from "../lib/time";
import { Field, Notice } from "./Notice";

export function IssuePanel({
  seasonId,
  ledger,
  onAppend,
}: {
  seasonId: string;
  ledger: LedgerState;
  onAppend: (event: TagEvent) => void;
}) {
  const [tagNo, setTagNo] = useState("");
  const [ackReuse, setAckReuse] = useState(false);
  const [done, setDone] = useState("");

  const normalized = canonicalTagNo(tagNo);
  const check = useMemo(
    () => (tagNo.trim() ? checkIssue(ledger, seasonId, normalized) : null),
    [ledger, seasonId, tagNo, normalized]
  );

  const submit = () => {
    const result = checkIssue(ledger, seasonId, normalized);
    if (result.status === "invalid" || result.status === "duplicate-season") return;
    if (result.status === "blocked-open-association") return;
    if (result.status === "reuse-needs-ack" && !ackReuse) return;
    onAppend(makeIssueEvent(newEventId(), nowIso(), seasonId, normalized));
    setDone(normalized);
    setTagNo("");
    setAckReuse(false);
    window.setTimeout(() => setDone(""), 2600);
  };

  return (
    <div className="desk-panel">
      <div className="desk-head">
        <h2>① 建牌</h2>
        <p>牌按发掘季建，牌号全季不重复</p>
      </div>

      <div className="desk-body">
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
        <button
          className="primary-action"
          disabled={
            !check ||
            check.status === "invalid" ||
            check.status === "duplicate-season" ||
            check.status === "blocked-open-association" ||
            (check.status === "reuse-needs-ack" && !ackReuse)
          }
          onClick={submit}
        >
          建立编号牌
        </button>

        {done && <Notice kind="ok">{seasonName(seasonId)}已建立 {done} 号牌，可到②领用。</Notice>}

        {check?.status === "invalid" && (
          <Notice kind="error" title="牌号不合规">
            牌号请填 1～4 位数字。
          </Notice>
        )}

        {check?.status === "duplicate-season" && (
          <Notice kind="error" title="全季牌号不得重复">
            {normalized} 号牌在{seasonName(seasonId)}已经建过，请改从旧清单里挑选其它号码。
          </Notice>
        )}

        {check?.status === "blocked-open-association" && check.openAssociation && (
          <Notice kind="error" title="旧季号码重投被拦下：还有未结束的关联">
            <p className="conflict-detail">
              <b>{normalized}</b> 号牌在{seasonName(check.openAssociation.seasonId)}领出未还
              <br />
              原探方：<b>{check.openAssociation.trench}</b> · 原领用人：
              <b>{check.openAssociation.person}</b>
              <br />
              关联遗迹：{check.openAssociation.feature}，须先归还旧关联才能在本季重投。
            </p>
          </Notice>
        )}

        {check?.status === "reuse-needs-ack" && (
          <Notice kind="warn" title="旧季号码重投，请确认">
            <p className="conflict-detail">
              {normalized} 号牌曾在
              {check.oldRefs?.map((r) => seasonName(r.seasonId)).join("、")}建过，
              核对情况：{check.oldRefs?.map((r) => r.feature).join("；")}。
            </p>
            <label className="check-line">
              <input
                type="checkbox"
                checked={ackReuse}
                onChange={(e) => setAckReuse(e.target.checked)}
              />
              已确认旧季 {normalized} 号牌没有未结束的关联，号码可以重投本季
            </label>
          </Notice>
        )}
      </div>
    </div>
  );
}
