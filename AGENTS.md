# AGENTS.MD — AI AGENT OPERATIONAL INSTRUCTIONS & KNOWLEDGE BASE
# Project: Kaos Kami — 3D Interactive Apparel E-Commerce & DTF Sablon Platform
# Context: Commercial UMKM Platform — Kota Makassar, Sulawesi Selatan
# Repository: https://github.com/Hengki-Setiawan/Kaos-Kami.git

---

## 📌 CRITICAL INSTRUCTIONS FOR ALL AI AGENTS & SESSIONS

Every AI assistant working in this repository MUST strictly follow the architecture, guidelines, and execution tracker established in this codebase.

### 1. The Blueprint & Progress System
All design decisions, schemas, and API contracts are formally documented in the `Blueprint/` directory:
- **`Blueprint/BLUEPRINT-01-ECOMMERCE-CORE-ARCHITECTURE.md`**: Data models, Turso libSQL schema, dynamic pricing engine, hyperlocal delivery, Midtrans Snap, and Better Auth.
- **`Blueprint/BLUEPRINT-02-MOCKUP-STUDIO-ENGINE.md`**: 3D React Three Fiber configurator, 1:1 cm scale calibration (max 30cm), real-time DPI analyzer, instant 1-click background remover, and multi-apparel lineup.
- **`Blueprint/BLUEPRINT-03-ADMIN-USER-DASHBOARD.md`**: Workshop DTF Sablon Kanban production board, 360° order inspection, printable Job Ticket PDF, and 300 DPI master asset download center.
- **`Blueprint/BLUEPRINT-04-MOBILE-PERFORMANCE-INFRA.md`**: Cloudflare Pages / Workers deployment (3MB limit rules), Cloudflare R2 zero-egress storage, Turso libSQL 24/7 always-on DB, and adaptive device tiering.
- **`Blueprint/BLUEPRINT-05-ENTERPRISE-RESILIENCE-AND-SECURITY.md`**: 11 Pillars of Enterprise Production Hardening (Anti-IDOR RLS, Sliding Window Rate Limiter, VRAM GPU disposal, 1-Year Immutable CDN Cache, Duitku v2, Zero-Egress Cloud).
- **`Blueprint/BUILD-PROGRESS-TRACKER.md`**: **MASTER EXECUTION CHECKLIST**. Whenever you complete a task, you MUST check off `[x]` the corresponding item in this tracker and update the daily worklog table!

---

## 🏛️ NON-NEGOTIABLE ARCHITECTURAL RULES

1. **Database:** Always use **Turso (libSQL Edge SQLite)** via `@prisma/adapter-libsql` or `@libsql/client`. NEVER switch to regular Supabase (to prevent 7-day inactivity pause issues).
2. **Object Storage:** Always use **Cloudflare R2** for user-uploaded decals, master assets, and 3D models. Zero egress fees protect the project margin.
3. **Physical Scale Calibration (DTF Sablon Standard):**
   - Maximum printable width is strictly clamped to **30.0 cm** (matching physical DTF printhead limits).
   - Real-world dimensions (`printWidthCm`, `printHeightCm`, `offsetFromCollarCm`) must always be calculated and displayed to users and stored in `ProductionTask`.
4. **Fulfillment (Makassar Hyperlocal):**
   - Do NOT use RajaOngkir API.
   - Use Makassar native options: Pick-up at Workshop (Rp 0), Instant Courier Maxim COD, Flat Rate Makassar (Rp 15.000).
5. **WhatsApp Notifications:**
   - Automated via Fonnte with **Fail-Safe / Graceful Fallback**: wrapped in try/catch so checkout 100% succeeds, with web invoice + direct `wa.me` manual button.
6. **Cloudflare 3MB Worker Limit:**
   - Keep 3D libraries (`three`, `@react-three/fiber`, `@react-three/drei`, `gsap`) strictly on the client side (`use client` + dynamic imports).
   - The server Worker must remain lean (< 1.2 MB).

---

## 📁 LOCAL ASSETS & REFERENCES

- `.skills-sourced/3d-configurators/starklord-tshirt/` — Drei `<Decal>` projection math and `shirt_baked.glb`.
- `.skills-sourced/3d-configurators/vihan-tshirt-designer/` — Fabric.js 2D Canvas Designer integration.
- `.skills-sourced/3d-configurators/afilah-clothing-configurator/` — Multi-apparel geometry and `shirt.glb`.
- `public/models/` — `tshirt-heavyweight.glb` (1.0MB), `hoodie.glb`, `jacket.glb`.
- `ASSET_CREDITS.md` — Complete licensing and provenance log.
