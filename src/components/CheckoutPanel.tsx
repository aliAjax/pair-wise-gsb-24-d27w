import { useState } from "react";
import { featureTypes, layers, seasonName, trenches } from "../data/reference";
import { makeCheckoutEvent } from "../domain/events";
import { checkCheckout } from "../domain/rules";
import type { LedgerState, TagEvent } from "../domain/types";
import { canonicalTagNo, newEventId, nowIso } from "../lib/time";
import { ConflictDetail, Field, Notice } from "./Notice";

interface CheckoutForm {
  tagNo: string;
  feature: string;
  trench: string;
  layer: string;
  person: string;
}

const emptyForm: CheckoutForm = { tagNo: "", feature: "", trench: "", layer: "", person: "" };

export function CheckoutPanel({
  seasonId,
  ledger,
  onAppend,
}: {
  seasonId: string;
  ledger: LedgerState;
  onAppend: (event: TagEvent) => void;
}) {
  const [form, setForm] = useState<CheckoutForm>(emptyForm);
  const [done, setDone] = useState("");

  const set = (key: keyof CheckoutForm) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const normalized = canonicalTagNo(form.tagNo);
  const check = form.tagNo.trim() ? checkCheckout(ledger, seasonId, normalized) : null;

  const fieldsFilled = form.feature.trim() && form.trench.trim() && form.layer.trim() && form.person.trim();
  const canSubmit = check?.status === "ok" && Boolean(fieldsFilled);

  const submit = () => {
    if (!canSubmit) return;
    onAppend(
      makeCheckoutEvent(newEventId(), nowIso(), seasonId, normalized, {
        feature: form.feature.trim(),
        trench: form.trench.trim(),
        layer: form.layer.trim(),
        person: form.person.trim(),
      })
    );
    setDone(normalized);
    setForm(emptyForm);
    window.setTimeout(() => setDone(""), 2600);
  };

  return (
    <div className="desk-panel">
      <div className="desk-head">
        <h2>② 领用</h2>
        <p>一块牌跟一个遗迹单位，写明探方、地层和人</p>
      </div>

      <div className="desk-body">
        <div className="form-grid">
          <Field label="牌号" required>
            <input
              inputMode="numeric"
              placeholder="如 012"
              value={form.tagNo}
              onChange={set("tagNo")}
            />
          </Field>
          <Field label="遗迹单位" required>
            <input
              list="feature-types"
              placeholder="如 H12 灰坑"
              value={form.feature}
              onChange={set("feature")}
            />
          </Field>
          <Field label="探方" required>
            <input list="trench-list" placeholder="选择或填写探方" value={form.trench} onChange={set("trench")} />
          </Field>
          <Field label="地层" required>
            <input list="layer-list" placeholder="选择或填写地层" value={form.layer} onChange={set("layer")} />
          </Field>
          <Field label="领用人" required>
            <input placeholder="发掘队员姓名" value={form.person} onChange={set("person")} />
          </Field>
        </div>

        <datalist id="feature-types">
          {featureTypes.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <datalist id="trench-list">
          {trenches.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <datalist id="layer-list">
          {layers.map((l) => (
            <option key={l} value={l} />
          ))}
        </datalist>

        <button className="primary-action" disabled={!canSubmit} onClick={submit}>
          登记领用
        </button>

        {done && <Notice kind="ok">{done} 号牌已在{seasonName(seasonId)}领出。</Notice>}

        {check?.status === "invalid" && (
          <Notice kind="error" title="牌号不合规">牌号请填 1～4 位数字。</Notice>
        )}

        {check?.status === "unknown" && (
          <Notice kind="warn" title="本季没有这块牌">
            {normalized} 号牌在{seasonName(seasonId)}尚未建立，请先到①建牌；若属旧季号码，建牌时会要求核对旧关联。
          </Notice>
        )}

        {check?.status === "duplicate" && check.conflict && (
          <Notice kind="error" title="重复领用：牌号已被领出且未归还">
            <ConflictDetail activeRef={check.conflict} />
            <p>请先由原领用人归还，或换一块在库牌。</p>
          </Notice>
        )}

        {check?.status === "ok" && !fieldsFilled && (
          <Notice kind="info">{normalized} 号牌在库，请补齐探方、地层、遗迹单位和领用人。</Notice>
        )}
      </div>
    </div>
  );
}
