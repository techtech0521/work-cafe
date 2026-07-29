import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Ajv = require("ajv");

const dataPath = new URL("../data/cafes.json", import.meta.url);
const schemaPath = new URL("../data/cafes.schema.json", import.meta.url);
const [cafes, schema] = await Promise.all(
  [dataPath, schemaPath].map(async (path) => JSON.parse(await readFile(path, "utf8"))),
);

const ajv = new Ajv({ allErrors: true, jsonPointers: true });
const validate = ajv.compile(schema);
if (!validate(cafes)) {
  for (const error of validate.errors ?? []) {
    console.error(`${error.instancePath || "/"}: ${error.message}`);
  }
  process.exitCode = 1;
}

for (const field of ["id", "googlePlaceId"]) {
  const seen = new Map();
  for (const [index, cafe] of cafes.entries()) {
    const previous = seen.get(cafe[field]);
    if (previous !== undefined) {
      console.error(`/${index}/${field}: duplicates /${previous}/${field} (${cafe[field]})`);
      process.exitCode = 1;
    }
    seen.set(cafe[field], index);
  }
}

if (!process.exitCode) console.log(`Validated ${cafes.length} cafes against the JSON Schema.`);
