#!/usr/bin/env ts-node
import fg from "fast-glob";
import fs from "node:fs/promises";
import path from "node:path";
import { mkdirSync } from "node:fs";
import YAML from "yaml";
import { resolveConfig } from "prettier";
import { generateZodClientFromOpenAPI } from "openapi-zod-client";

const ROOT = path.resolve(__dirname, ".."); // <repo-root>/scripts から

async function main() {
  /* 1. spec を再帰探索（絶対パス返却） */
  const specs = await fg(
    "packages/api-contracts/src/yaml/**/*.{yml,yaml,json}",
    {
      cwd: ROOT,
      absolute: true,
    },
  );
  if (!specs.length) {
    console.warn("yaml が見つかりません。処理をスキップします。");
    return;
  }

  /* 2. prettier 設定を取得（無い場合は {} にフォールバック） */
  const prettier = (await resolveConfig(ROOT)) ?? {};

  /* 3. 並列生成 */
  await Promise.all(
    specs.map(async (specAbs) => {
      const raw = await fs.readFile(specAbs, "utf8");
      const openApiDoc = YAML.parse(raw); // JSON も YAML として parse 可

      /* ─── 出力先を組み立て ───
         contracts\d_calendar_svc.yaml
         → packages/api-contracts/src/zod/d_calendar_svc.ts    */
      const fileStem = path.basename(specAbs, path.extname(specAbs));
      const outDir = path.join(ROOT, "packages", "api-contracts", "src", "zod");
      mkdirSync(outDir, { recursive: true });
      const outFile = path.join(outDir, `${fileStem}.ts`);

      /* 4. 生成 */
      await generateZodClientFromOpenAPI({
        openApiDoc,
        distPath: outFile,
        prettierConfig: prettier,
        templatePath: path.join(ROOT, "scripts", "schemas-only.hbs"),
      });

      console.log(`✅  generated: ${path.relative(ROOT, outFile)}`);
    }),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
