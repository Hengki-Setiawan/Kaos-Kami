import { z } from "zod";

export const RegisterPhoneSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  phoneNumber: z
    .string()
    .min(10, "Nomor WhatsApp minimal 10 digit")
    .max(15, "Nomor WhatsApp maksimal 15 digit")
    .regex(/^(\+62|62|0)8[1-9][0-9]{6,10}$/, "Format nomor WhatsApp tidak valid (contoh: 081234567890)"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  email: z.string().email("Format email tidak valid").optional().or(z.literal("")),
});

export const LoginPhoneSchema = z.object({
  phoneNumber: z.string().min(10, "Nomor WhatsApp wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

export const GuestCheckoutSchema = z.object({
  recipientName: z.string().min(2, "Nama penerima wajib diisi"),
  phoneNumber: z
    .string()
    .min(10, "Nomor WhatsApp minimal 10 digit")
    .regex(/^(\+62|62|0)8[1-9][0-9]{6,10}$/, "Format nomor WhatsApp tidak valid"),
  email: z.string().email("Format email tidak valid").optional().or(z.literal("")),
  district: z.string().min(2, "Kecamatan di Makassar wajib dipilih"),
  fullAddress: z.string().min(5, "Alamat lengkap pengiriman wajib diisi"),
  courierNotes: z.string().optional(),
});

export type RegisterPhoneInput = z.infer<typeof RegisterPhoneSchema>;
export type LoginPhoneInput = z.infer<typeof LoginPhoneSchema>;
export type GuestCheckoutInput = z.infer<typeof GuestCheckoutSchema>;
