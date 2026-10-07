import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ChatMessage, User, UserPresence } from "@/lib/drizzle-schema";
import { eq, or, and, desc, inArray } from "drizzle-orm";
import { checkRateLimitAsync, getClientIp, rateLimitHeaders } from "@/lib/security/rateLimiter";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const rl = await checkRateLimitAsync(`chat-threads:ip:${getClientIp(req)}`, 30, 60);
    if (rl.isLimited) {
      return NextResponse.json({ error: "Terlalu sering. Tunggu sebentar." }, { status: 429, headers: rateLimitHeaders(rl, 30) });
    }
    const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
    const user = session?.user;
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (user as any)?.role || "CUSTOMER";
    if (!["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"].includes(role)) {
      return NextResponse.json({ error: "Forbidden: Khusus pengelola workshop" }, { status: 403 });
    }

    // Ambil 300 pesan terakhir untuk merangkum percakapan per user
    const recentMessages = await db.query.ChatMessage.findMany({
      orderBy: (t, { desc }: any) => desc(t.createdAt),
      limit: 300,
    });

    if (recentMessages.length === 0) {
      return NextResponse.json({ success: true, threads: [] });
    }

    // Kumpulkan user ID unik dari pelanggan (bukan ID admin dan bukan bot)
    const customerIdsSet = new Set<string>();
    for (const msg of recentMessages) {
      if (msg.senderRole === "CUSTOMER" && msg.senderId) {
        customerIdsSet.add(msg.senderId);
      }
      if (msg.receiverId && msg.receiverId !== "kamito_mascot") {
        customerIdsSet.add(msg.receiverId);
      }
    }

    const customerIds = Array.from(customerIdsSet);
    if (customerIds.length === 0) {
      return NextResponse.json({ success: true, threads: [] });
    }

    // Ambil data user profil
    const users = await db.query.User.findMany({
      where: (t, { inArray }: any) => inArray(t.id, customerIds),
      columns: { id: true, name: true, email: true, phoneNumber: true, image: true, role: true },
    });

    // Ambil data presence
    const presences = await db.query.UserPresence.findMany({
      where: (t, { inArray }: any) => inArray(t.userId, customerIds),
    });

    const userMap = new Map(users.map((u: any) => [u.id, u]));
    const presenceMap = new Map(presences.map((p: any) => [p.userId, p]));

    // Bangun daftar threads
    const threadsMap = new Map<string, any>();

    for (const msg of recentMessages) {
      // Tentukan siapa pelanggan di obrolan ini
      const cid = msg.senderRole === "CUSTOMER" ? msg.senderId : msg.receiverId;
      if (!cid || cid === "kamito_mascot") continue;

      if (!threadsMap.has(cid)) {
        const u = userMap.get(cid);
        const pres = presenceMap.get(cid);
        const now = Date.now();
        const lastSeen = pres?.lastSeenAt ? new Date(pres.lastSeenAt) : null;
        const isOnline = lastSeen ? (now - lastSeen.getTime() <= 4 * 60 * 1000) : false;

        threadsMap.set(cid, {
          userId: cid,
          userName: u?.name || msg.senderName || "Pelanggan",
          userEmail: u?.email || null,
          userPhone: u?.phoneNumber || null,
          userImage: u?.image || null,
          isOnline,
          lastSeenAt: lastSeen ? lastSeen.toISOString() : null,
          lastMessage: {
            id: msg.id,
            content: msg.content,
            senderRole: msg.senderRole,
            senderName: msg.senderName,
            createdAt: msg.createdAt,
          },
          unreadCount: 0,
        });
      }

      // Hitung pesan yang belum dibaca dari customer
      if (msg.senderRole === "CUSTOMER" && !msg.isRead) {
        const thread = threadsMap.get(cid);
        if (thread) {
          thread.unreadCount += 1;
        }
      }
    }

    const threads = Array.from(threadsMap.values()).sort(
      (a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      threads,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Gagal memuat threads chat" }, { status: 500 });
  }
}
