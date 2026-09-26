import type { ReactNode } from "react";
import { formatTime } from "../lib/time";
import type { ActiveRef } from "../domain/rules";
import { seasonName } from "../data/reference";

export type NoticeKind = "error" | "warn" | "ok" | "info";

const kindClass: Record<NoticeKind, string> = {
  error: "notice notice-error",
  warn: "notice notice-warn",
  ok: "notice notice-ok",
  info: "notice notice-info",
};

export function Notice({
  kind,
  title,
  children,
}: {
  kind: NoticeKind;
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className={kindClass[kind]} role={kind === "error" ? "alert" : "status"}>
      {title && <strong>{title}</strong>}
      {children && <div>{children}</div>}
    </div>
  );
}

export function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {required && <em> *</em>}
      </span>
      {children}
    </label>
  );
}

/** 重复领用 / 未归还提示的公共正文：指出牌号、原探方、原领用人。 */
export function ConflictDetail({ activeRef }: { activeRef: ActiveRef }) {
  return (
    <p className="conflict-detail">
      <b>{activeRef.tagNo}</b> 号牌（{seasonName(activeRef.seasonId)}）领出未还
      <br />
      原探方：<b>{activeRef.trench}</b> · 原领用人：<b>{activeRef.person}</b>
      <br />
      关联遗迹：{activeRef.feature} · 领用时间 {formatTime(activeRef.since)}
    </p>
  );
}
