import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
  url: "http://localhost:5110/",
  pretendToBeVisual: true,
});

globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;
globalThis.navigator = dom.window.navigator;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
const { act } = await import("react");
const App = (await import("../node_modules/.cache/app.bundle.mjs")).default;

const flush = () => new Promise((r) => setTimeout(r, 0));

let failures = 0;
const assert = (name, cond) => {
  if (cond) console.log(`PASS ${name}`);
  else {
    failures++;
    console.error(`FAIL ${name}`);
  }
};

localStorage.clear();
const root = createRoot(document.getElementById("root"));
await act(async () => {
  root.render(React.createElement(App));
});
await flush();

const text = () => document.body.textContent;

// 首屏：演示底账已回放
assert("首屏显示台面标题", text().includes("编号牌领用归还台"));
assert("未归还警示条出现（2026A-007、2026B-001）", text().includes("2 块牌领出未归还"));
assert("警示条指出原探方原领用人", text().includes("T0301") && text().includes("赵启"));
assert("台账有 2026B 的 001/002/003", ["001", "002", "003"].every((n) => text().includes(n)));

// 本机记录已写入 localStorage
const stored = JSON.parse(localStorage.getItem("hxwl-10.tag-ledger.events.v1"));
assert("首次打开写入演示底账 18 条", stored.length === 18);

// —— 交互：在建牌台输入旧号 007，应被拦下 ——
const setInput = (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(input, value);
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
};

const panels = [...document.querySelectorAll(".desk-panel")];
const issuePanel = panels[0];
const issueInput = issuePanel.querySelector("input");
await act(async () => {
  setInput(issueInput, "7");
});
await flush();
assert("旧号 007 重投被拦并指出原探方原领用人", issuePanel.textContent.includes("未结束的关联") && issuePanel.textContent.includes("赵启"));
assert("被拦时建牌按钮禁用", issuePanel.querySelector("button.primary-action").disabled);

// —— 交互：建牌台输入本季已有的 001，应提示全季不重号 ——
await act(async () => {
  setInput(issueInput, "1");
});
await flush();
assert("001 本季已建→全季不重号提示", issuePanel.textContent.includes("全季牌号不得重复"));

// —— 交互：建牌台输入旧号 012（2025B 已归还），应要求确认 ——
await act(async () => {
  setInput(issueInput, "12");
});
await flush();
assert("012 旧关联已清→需勾选确认", issuePanel.textContent.includes("旧季号码重投，请确认"));
assert("未勾选前按钮禁用", issuePanel.querySelector("button.primary-action").disabled);

// 勾选确认后建牌
const checkbox = issuePanel.querySelector("input[type=checkbox]");
await act(async () => {
  checkbox.click();
});
await flush();
assert("勾选后按钮可用", !issuePanel.querySelector("button.primary-action").disabled);
await act(async () => {
  issuePanel.querySelector("button.primary-action").click();
});
await flush();
assert("012 建牌成功", issuePanel.textContent.includes("已建立 012 号牌"));

// —— 交互：领用台重复领用 001 ——
const checkoutPanel = panels[1];
const coInputs = checkoutPanel.querySelectorAll("input");
await act(async () => {
  setInput(coInputs[0], "1");
});
await flush();
assert(
  "重复领用 001 被拒并指出牌号/原探方/原领用人",
  checkoutPanel.textContent.includes("重复领用") &&
    checkoutPanel.textContent.includes("T0204") &&
    checkoutPanel.textContent.includes("王岚")
);

// —— 交互：归还台归还 001 ——
const returnPanel = panels[2];
const retInput = returnPanel.querySelector("input");
await act(async () => {
  setInput(retInput, "1");
});
await flush();
assert("归还台显示领出信息", returnPanel.textContent.includes("H12 灰坑"));
await act(async () => {
  returnPanel.querySelector("button.primary-action").click();
});
await flush();
assert("001 归还成功", returnPanel.textContent.includes("已归还"));
assert("警示条更新为 1 块未归还", text().includes("1 块牌领出未归还"));

// 事件已追加
const stored2 = JSON.parse(localStorage.getItem("hxwl-10.tag-ledger.events.v1"));
assert("本机记录追加到 20 条", stored2.length === 20);
assert("最后一条是 001 归还", stored2[19].type === "return" && stored2[19].tagNo === "001");

// —— 重开（卸载重挂）仍能追溯 ——
await act(async () => {
  root.unmount();
});
const root2 = createRoot(document.getElementById("root"));
await act(async () => {
  root2.render(React.createElement(App));
});
await flush();
assert("重开后流水仍在", text().includes("领用归还流水"));
assert("重开后 001 已回在库", !text().includes("2 块牌领出未归还"));

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
