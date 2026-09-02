import fs from "fs";
import path from "path";

// OpenNext build hook to ensure @libsql/isomorphic-ws contains web.mjs in its server-functions output
const srcDir = path.resolve("node_modules/@libsql/isomorphic-ws");
const destDir = path.resolve(".open-next/server-functions/default/node_modules/@libsql/isomorphic-ws");

if (fs.existsSync(srcDir)) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  const files = ["web.mjs", "web.cjs", "node.mjs", "node.cjs", "index.d.ts"];
  for (const f of files) {
    const srcFile = path.join(srcDir, f);
    const destFile = path.join(destDir, f);
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, destFile);
      console.log(`[patch-open-next] Copied ${f} to ${destDir}`);
    }
  }
}
