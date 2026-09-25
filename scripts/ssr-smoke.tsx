// 服务端渲染冒烟：不依赖浏览器系统库，验证整页可渲染且关键业务信息在位。
// 用最小 localStorage 桩，保证种子数据生效。
import React from "react";
import { renderToString } from "react-dom/server";

const storage = new Map<string, string>();
(globalThis as { localStorage?: Storage }).localStorage = {
  getItem: (k: string) => (storage.has(k) ? storage.get(k)! : null),
  setItem: (k: string, v: string) => void storage.set(k, v),
  removeItem: (k: string) => void storage.delete(k),
  clear: () => storage.clear(),
  key: () => null,
  length: 0,
} as unknown as Storage;

import App from "../src/App";

const html = renderToString(React.createElement(App));

const checks: [RegExp | string, string][] = [
  ["社区听力康复作业台", "标题"],
  ["本周计划", "周计划区"],
  ["家属配合与提示偏好", "家属提示偏好长期保存"],
  ["复诊名单", "复诊名单标签"],
  ["患者档案", "患者档案标签"],
  [/刘桂兰|赵德山/, "在册老人"],
  ["听力曲线", "听力曲线"],
  ["左耳", "左耳字样"],
  ["右耳", "右耳字样"],
  ["方向辨别", "方向训练类型"],
];

for (const [needle, label] of checks) {
  const ok = typeof needle === "string" ? html.includes(needle) : needle.test(html);
  if (!ok) throw new Error(`SSR 缺少内容：${label}`);
}
console.log("SSR 渲染长度", html.length);
console.log("SSR 冒烟通过 ✓");
