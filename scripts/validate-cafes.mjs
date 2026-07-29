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
    // Ajv 6 reports `dataPath`; newer releases call the same value
    // `instancePath`. Supporting both keeps diagnostics useful when upgraded.
    console.error(`${error.instancePath || error.dataPath || "/"}: ${error.message}`);
  }
  process.exitCode = 1;
}

// Do not let the custom checks hide the schema diagnostics when the top-level
// value is malformed. Field shape errors are owned by the schema validator.
if (Array.isArray(cafes)) {
  for (const field of ["id", "googlePlaceId"]) {
    const seen = new Map();
    for (const [index, cafe] of cafes.entries()) {
      const value = cafe?.[field];
      if (typeof value !== "string") continue;
      const previous = seen.get(value);
      if (previous !== undefined) {
        console.error(`/${index}/${field}: duplicates /${previous}/${field} (${value})`);
        process.exitCode = 1;
      }
      seen.set(value, index);
    }
  }
}

if (!process.exitCode) console.log(`Validated ${cafes.length} cafes against the JSON Schema.`);
