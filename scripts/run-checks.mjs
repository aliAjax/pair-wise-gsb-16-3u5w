// 一键校验：esbuild 打包规则冒烟测试与 SSR 冒烟测试后在 Node 执行。
// 用法：node scripts/run-checks.mjs
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { join } from "node:path";

const targets = [
  { entry: "scripts/check-rules.ts", format: "esm", out: "check-rules.mjs" },
  { entry: "scripts/ssr-smoke.tsx", format: "cjs", out: "ssr-smoke.cjs", css: true },
];

for (const t of targets) {
  const outfile = join(tmpdir(), t.out);
  await build({
    entryPoints: [t.entry],
    bundle: true,
    platform: "node",
    format: t.format,
    outfile,
    loader: t.css ? { ".css": "empty" } : undefined,
  });
  await import(pathToFileURL(outfile).href);
}
