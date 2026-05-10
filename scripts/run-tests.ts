import { runNormalizeTests } from "../src/lib/analysis/normalize.test";
import { runRepairTests } from "../src/lib/analysis/repair.test";
import { runSchemaTests } from "../src/lib/analysis/schema.test";
import { runExternalUrlTests } from "../src/lib/security/external-url.test";

async function main() {
  const tests: Array<[string, () => Promise<void> | void]> = [
    ["schema", runSchemaTests],
    ["repair", runRepairTests],
    ["normalize", runNormalizeTests],
    ["external-url", runExternalUrlTests]
  ];

  for (const [name, runner] of tests) {
    await runner();
    console.log(`PASS ${name}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
