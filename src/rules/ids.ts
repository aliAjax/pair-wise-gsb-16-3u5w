// ID 生成：优先使用平台随机 ID，环境不支持时回退。
export function newId(prefix: string): string {
  const c = globalThis as { crypto?: Crypto };
  const rand =
    typeof c.crypto?.randomUUID === "function"
      ? c.crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}
