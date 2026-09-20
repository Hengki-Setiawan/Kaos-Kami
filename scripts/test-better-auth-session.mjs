import { auth } from "../kaos-kami-web/src/lib/auth.ts";

async function main() {
  console.log("Better Auth api keys:", Object.keys(auth.api));
}

main().catch(console.error);
