process.env.VOLC_ACCESSKEY = "";
process.env.VOLC_SECRETKEY = "";
process.env.VOLCENGINE_ARK_EXTRA_MODEL_IDS = "doubao-smoke-alpha,doubao-smoke-beta";

const fs = await import("node:fs/promises");
const path = await import("node:path");
const { pathToFileURL } = await import("node:url");
const ts = await import("typescript");

const appRoot = path.resolve(import.meta.dirname, "..");
const tempParent = path.join(appRoot, ".tokenmesh-smoke");
await fs.mkdir(tempParent, { recursive: true });
const tempDir = await fs.mkdtemp(path.join(tempParent, "model-registry-"));

async function transpileTsFile(sourcePath, outputPath, transform = (source) => source) {
  const source = transform(await fs.readFile(sourcePath, "utf8"));
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: sourcePath,
  });
  await fs.writeFile(outputPath, result.outputText);
}

try {
  await transpileTsFile(path.join(appRoot, "src/lib/models.ts"), path.join(tempDir, "models.js"));
  await transpileTsFile(
    path.join(appRoot, "src/lib/model-registry.ts"),
    path.join(tempDir, "model-registry.js"),
    (source) => source.replace('from "@/lib/models"', 'from "./models.js"')
  );

  const { getModelRegistrySnapshot } = await import(pathToFileURL(path.join(tempDir, "model-registry.js")).href);

  const snapshot = await getModelRegistrySnapshot();
  const providerModelIds = new Set(snapshot.models.map((model) => model.providerModelId));
  const sourceCounts = snapshot.models.reduce((counts, model) => {
    const source = model.source || "unknown";
    counts[source] = (counts[source] || 0) + 1;
    return counts;
  }, {});

  const expectedModelIds = [
    "doubao-seed-2-0-pro-260215",
    "doubao-seed-1-6-vision-250815",
    "deepseek-v4-pro",
    "doubao-smoke-alpha",
    "doubao-smoke-beta",
  ];

  const missing = expectedModelIds.filter((modelId) => !providerModelIds.has(modelId));

  if (snapshot.metadata.source !== "static-fallback") {
    throw new Error(`Expected static-fallback source without AK/SK, got ${snapshot.metadata.source}`);
  }

  if (snapshot.models.length !== 18) {
    throw new Error(`Expected 18 fallback models including 2 configured extras, got ${snapshot.models.length}`);
  }

  if (missing.length > 0) {
    throw new Error(`Missing expected model ids: ${missing.join(", ")}`);
  }

  if (sourceCounts.env !== 2) {
    throw new Error(`Expected 2 env-configured models, got ${sourceCounts.env || 0}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        modelCount: snapshot.models.length,
        source: snapshot.metadata.source,
        sourceCounts,
      },
      null,
      2
    )
  );
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
