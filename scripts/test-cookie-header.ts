import { auth } from "../kaos-kami-web/src/lib/auth.ts";

async function main() {
  const loginRes = await auth.api.signInEmail({
    body: {
      email: "hengkivibecoding@gmail.com",
      password: "KaosKami2026!"
    },
    asResponse: true
  });

  const rawSetCookie = loginRes.headers.get("set-cookie") || "";
  console.log("Raw set-cookie:", rawSetCookie);

  // Parse into clean Cookie header: only "name=val; name2=val2"
  const cookies = rawSetCookie
    .split(/,\s*(?=[a-zA-Z0-9_\-]+=)/)
    .map(c => c.split(";")[0].trim())
    .join("; ");
  console.log("Clean Cookie header:", cookies);

  // Now test fetch to localhost:3000/api/auth/get-session
  const res = await fetch("http://localhost:3000/api/auth/get-session", {
    headers: {
      "Cookie": cookies
    }
  });

  console.log("get-session HTTP status:", res.status);
  const data = await res.json();
  console.log("get-session body:", data);
}

main().catch(console.error);
