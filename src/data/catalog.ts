// 参照数据（字典）：耳朵、训练类型、提示方式、频率、快捷困难项等。
import type { Ear, PromptMethod, TrainingKind } from "../types";

export const FREQS = [250, 500, 1000, 2000, 4000, 8000] as const;

export const EAR_LABEL: Record<Ear, string> = {
  L: "左耳",
  R: "右耳",
};

export const KIND_LABEL: Record<TrainingKind, string> = {
  discrim: "听辨训练",
  direction: "方向辨别",
};

export const KIND_DEFAULT_CONTENT: Record<TrainingKind, string> = {
  discrim: "词语、短句听辨后复述",
  direction: "闭目辨别左右声源方向",
};

export const PROMPT_METHODS: { value: PromptMethod; label: string; hint: string }[] = [
  { value: "verbal", label: "口头提醒", hint: "放慢语速，靠近较好耳重复" },
  { value: "gesture", label: "手势提示", hint: "配合手势指耳、指方向" },
  { value: "card", label: "图片卡片", hint: "用图片卡提示训练内容" },
  { value: "demo", label: "示范演示", hint: "家属先做一遍再请老人模仿" },
  { value: "note", label: "便签文字", hint: "大字便签写明任务与分钟数" },
];

export const PROMPT_LABEL: Record<PromptMethod, string> = Object.fromEntries(
  PROMPT_METHODS.map((m) => [m.value, m.label]),
) as Record<PromptMethod, string>;

export const CONTACT_CHANNELS = ["电话", "微信视频", "上门", "门诊"];

export const QUICK_DIFFICULTY = [
  "嘈杂环境听不清",
  "方向辨别偏侧",
  "听得到听不清",
  "需要重复多次",
  "训练后疲劳明显",
  "助听器啸叫",
];
