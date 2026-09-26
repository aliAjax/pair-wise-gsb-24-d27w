import { useState } from "react";
import "./styles.css";
import { CheckoutPanel } from "./components/CheckoutPanel";
import { EventJournal } from "./components/EventJournal";
import { IssuePanel } from "./components/IssuePanel";
import { OverdueBanner } from "./components/OverdueBanner";
import { ReturnPanel } from "./components/ReturnPanel";
import { TagTable } from "./components/TagTable";
import { currentSeasonId, deskRules, seasons, seasonName } from "./data/reference";
import { ledgerMetrics } from "./domain/selectors";
import { useLedgerStore } from "./store/ledgerStore";

const metricDefs = [
  { key: "total", label: "本季建牌" },
  { key: "inUse", label: "当前在用" },
  { key: "returned", label: "验收归还" },
  { key: "overdue", label: "跨季未归还" },
] as const;

function App() {
  const { events, ledger, append, resetToSeed } = useLedgerStore();
  const [seasonId, setSeasonId] = useState(currentSeasonId);
  const metrics = ledgerMetrics(ledger, seasonId);

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">hxwl-10 · 编号牌领用归还台</p>
          <h1>考古探方 · 编号牌领用归还台</h1>
          <p className="subtitle">
            牌按发掘季建、牌号全季不重复；一块牌跟一个遗迹单位。领用写明探方、地层和人，
            遗迹验收退场后归还并登记牌面状态。旧季号码重投前先核对有没有未结束的关联。
          </p>
        </div>
        <div className="stack-card">
          <span>资料 / 规则 / 本机记录</span>
          <strong>三层分开</strong>
          <p className="stack-note">
            静态档案在 data，校验规则在 domain，每一次领用归还作为事件存进本机 localStorage，
            重开页面整串回放，逐条追得到。
          </p>
        </div>
      </section>

      <section className="metrics-grid">
        {metricDefs.map((m, index) => (
          <article key={m.key} className="metric-card">
            <span>{m.label}</span>
            <strong>{metrics[m.key]}</strong>
            <i className={`status-${index === 3 && metrics.overdue > 0 ? "danger" : index % 2 ? "watch" : "ok"}`} />
          </article>
        ))}
      </section>

      <OverdueBanner ledger={ledger} />

      <section className="workspace">
        <aside className="panel narrow">
          <h2>发掘季</h2>
          <div className="season-list">
            {seasons.map((s) => (
              <button
                key={s.id}
                className={s.id === seasonId ? "season season-on" : "season"}
                onClick={() => setSeasonId(s.id)}
              >
                <span>{s.name}</span>
                <small>{s.note}</small>
              </button>
            ))}
          </div>

          <h2>台面规矩</h2>
          <ul className="rule-list">
            {deskRules.map((rule, i) => (
              <li key={rule}>
                <i>{i + 1}</i>
                {rule}
              </li>
            ))}
          </ul>
        </aside>

        <div className="desk">
          <IssuePanel seasonId={seasonId} ledger={ledger} onAppend={append} />
          <CheckoutPanel seasonId={seasonId} ledger={ledger} onAppend={append} />
          <ReturnPanel seasonId={seasonId} ledger={ledger} onAppend={append} />
        </div>
      </section>

      <p className="context-line">
        当前办理发掘季：<b>{seasonName(seasonId)}</b>（{seasonId}）。建牌、领用、归还只对当前发掘季生效；
        跨季未归还的牌会在上方警示条和旧号重投检查中出现。
      </p>

      <TagTable seasonId={seasonId} ledger={ledger} />

      <EventJournal events={events} onReset={resetToSeed} />
    </main>
  );
}

export default App;
