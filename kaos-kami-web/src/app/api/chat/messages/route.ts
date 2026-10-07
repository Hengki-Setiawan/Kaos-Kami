import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ChatMessage, UserPresence } from "@/lib/drizzle-schema";
import { eq, or, and, asc, desc } from "drizzle-orm";
import { checkRateLimitAsync, rateLimitHeaders } from "@/lib/security/rateLimiter";

export const dynamic = "force-dynamic";

function sanitizeText(str: string): string {
  return str
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .trim();
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
    const user = session?.user;
    const url = new URL(req.url);
    const guestId = url.searchParams.get("guestId");
    const targetUserId = url.searchParams.get("userId");

    if (!user?.id && !guestId) {
      return NextResponse.json({ error: "Silakan sertakan identitas akun atau guestId." }, { status: 401 });
    }

    const role = (user as any)?.role || "CUSTOMER";
    const isAdmin = user?.id ? ["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"].includes(role) : false;

    let messages = [];

    if (isAdmin && targetUserId) {
      // Admin membaca percakapan dengan pelanggan / tamu tertentu
      messages = await db.query.ChatMessage.findMany({
        where: (t, { or, eq }: any) =>
          or(
            and(eq(t.senderId, targetUserId), eq(t.senderRole, "CUSTOMER")),
            eq(t.receiverId, targetUserId),
            and(eq(t.senderId, targetUserId), eq(t.senderRole, "BOT"))
          ),
        orderBy: (t, { asc }: any) => asc(t.createdAt),
        limit: 150,
      });

      // Tandai pesan dari customer sebagai sudah dibaca
      const unreadIds = messages
        .filter((m: any) => m.senderRole === "CUSTOMER" && !m.isRead)
        .map((m: any) => m.id);

      if (unreadIds.length > 0) {
        for (const mid of unreadIds) {
          await db
            .update(ChatMessage)
            .set({ isRead: true })
            .where(eq(ChatMessage.id, mid));
        }
      }
    } else {
      // Pelanggan atau Tamu membaca percakapan pribadinya
      const uid = user?.id || (guestId as string);
      messages = await db.query.ChatMessage.findMany({
        where: (t, { or, eq }: any) =>
          or(
            eq(t.senderId, uid),
            eq(t.receiverId, uid)
          ),
        orderBy: (t, { asc }: any) => asc(t.createdAt),
        limit: 150,
      });

      // Tandai pesan dari admin/bot sebagai sudah dibaca oleh user/guest
      const unreadIds = messages
        .filter((m: any) => m.senderId !== uid && !m.isRead)
        .map((m: any) => m.id);

      if (unreadIds.length > 0) {
        for (const mid of unreadIds) {
          await db
            .update(ChatMessage)
            .set({ isRead: true })
            .where(eq(ChatMessage.id, mid));
        }
      }
    }

    return NextResponse.json({
      success: true,
      items: messages.map((m: any) => ({
        id: m.id,
        senderId: m.senderId,
        senderName: m.senderName,
        senderRole: m.senderRole,
        receiverId: m.receiverId,
        orderId: m.orderId,
        content: m.content,
        attachments: m.attachments ? JSON.parse(m.attachments) : [],
        isRead: Boolean(m.isRead),
        createdAt: m.createdAt,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Gagal memuat pesan chat" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
    const user = session?.user;
    const body = await req.json().catch(() => null);
    const guestId = typeof body?.guestId === "string" ? body.guestId.trim() : null;

    if (!user?.id && !guestId) {
      return NextResponse.json({ error: "Identitas pengirim (user atau guestId) wajib disertakan." }, { status: 401 });
    }

    const effectiveUserId = user?.id || guestId!;
    const rl = await checkRateLimitAsync(`chat:send:${effectiveUserId}`, 20, 60);
    if (rl.isLimited) {
      return NextResponse.json(
        { error: "Pesan terkirim terlalu cepat. Tunggu beberapa detik." },
        { status: 429, headers: rateLimitHeaders(rl, 20) }
      );
    }

    if (!body || typeof body.content !== "string") {
      return NextResponse.json({ error: "Konten pesan wajib diisi." }, { status: 400 });
    }

    const content = sanitizeText(body.content);
    if (content.length === 0) {
      return NextResponse.json({ error: "Konten pesan tidak boleh kosong." }, { status: 400 });
    }
    if (content.length > 2000) {
      return NextResponse.json({ error: "Pesan maksimal 2000 karakter." }, { status: 400 });
    }

    const role = user ? ((user as any)?.role || "CUSTOMER") : "CUSTOMER";
    const isAdmin = user ? ["ADMIN", "SUPER_ADMIN", "PRODUCTION_STAFF"].includes(role) : false;
    const now = new Date();
    const msgId = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    let receiverId: string | null = null;
    let senderRole = "CUSTOMER";
    let senderName = user?.name || (guestId ? `Tamu #${guestId.slice(-4)}` : "Pelanggan");

    if (isAdmin) {
      senderRole = "ADMIN";
      senderName = "Kamito / Tim Workshop";
      receiverId = body.receiverId || body.recipientId || null;
      if (!receiverId) {
        return NextResponse.json({ error: "ID penerima pelanggan wajib diisi untuk balasan admin." }, { status: 400 });
      }
    } else {
      senderRole = "CUSTOMER";
      receiverId = null; // Menuju tim admin workshop
    }

    // Periksa apakah ini pesan pertama dari customer / tamu
    let isFirstUserMessage = false;
    if (!isAdmin) {
      const prevCount = await db.query.ChatMessage.findFirst({
        where: (t, { eq }: any) => eq(t.senderId, effectiveUserId),
      });
      if (!prevCount) {
        isFirstUserMessage = true;
      }
    }

    // Masukkan pesan ke database
    await db.insert(ChatMessage).values({
      id: msgId,
      senderId: effectiveUserId,
      senderName,
      senderRole,
      receiverId,
      orderId: body.orderId || null,
      content,
      attachments: body.attachments ? JSON.stringify(body.attachments) : null,
      isRead: false,
      createdAt: now,
      updatedAt: now,
    });

    // Otomatis kirim sambutan ramah dari Kamito bila ini pesan pertama kali
    if (isFirstUserMessage) {
      const botMsgId = `chat_bot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const botTime = new Date(now.getTime() + 1000);
      await db.insert(ChatMessage).values({
        id: botMsgId,
        senderId: "kamito_mascot",
        senderName: "Kamito (CS Kaos Kami)",
        senderRole: "BOT",
        receiverId: effectiveUserId,
        orderId: body.orderId || null,
        content: "Halo! Pesan kamu sudah Kamito terima dan diteruskan langsung ke tim workshop Kaos Kami. Silakan tinggalkan pertanyaanmu seputar sablon DTF, bahan kaos, atau konsultasi desain ya!",
        attachments: null,
        isRead: false,
        createdAt: botTime,
        updatedAt: botTime,
      });
    }

    // Perbarui presence pengirim
    await db
      .insert(UserPresence)
      .values({
        userId: effectiveUserId,
        userName: senderName,
        role: role,
        lastSeenAt: now,
        isOnline: true,
      })
      .onConflictDoUpdate({
        target: UserPresence.userId,
        set: {
          lastSeenAt: now,
          isOnline: true,
          userName: senderName,
        },
      });

    return NextResponse.json({
      success: true,
      message: {
        id: msgId,
        senderId: effectiveUserId,
        senderName,
        senderRole,
        receiverId,
        orderId: body.orderId || null,
        content,
        isRead: false,
        createdAt: now.toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Gagal mengirim pesan" }, { status: 500 });
  }
}
