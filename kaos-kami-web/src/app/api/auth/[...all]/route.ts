import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";

const handler = toNextJsHandler(auth.handler);

export async function GET(req: NextRequest) {
  const res = await handler.GET(req);
  if (process.env.NODE_ENV !== "production" && req.nextUrl.pathname.endsWith("/get-session")) {
    const roleCookie = req.cookies.get("kaos_dev_role")?.value;
    const userIdCookie = req.cookies.get("kaos_dev_user_id")?.value;

    if (roleCookie) {
      try {
        const cloned = res.clone();
        const data = await cloned.json().catch(() => null);
        if (!data?.user) {
          const isCustomer = roleCookie === "CUSTOMER";
          const uid = userIdCookie || (isCustomer ? "6XBFRQCO5zsXOmdOFsBk0YJmU0lilEWn" : "cmtgq1jgh000ius04zygxhh8b");
          const user = isCustomer
            ? {
                id: uid,
                name: "Hengki Vibecoding (Customer)",
                email: "hengkivibecoding@gmail.com",
                role: "CUSTOMER",
                emailVerified: true,
                phoneNumber: "089876543210",
                phoneVerified: true,
              }
            : {
                id: uid,
                name: "Admin Workshop Kaos Kami",
                email: "admin@kaoskami.biz.id",
                role: "SUPER_ADMIN",
                emailVerified: true,
                phoneNumber: "081234567890",
                phoneVerified: true,
              };

          return NextResponse.json({
            session: {
              id: `dev-session-${roleCookie.toLowerCase()}`,
              userId: uid,
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
            user,
          });
        }
      } catch {
        // Abaikan jika respons bukan JSON
      }
    }
  }
  return res;
}

export const POST = handler.POST;
