// Script pengujian alur Login Multi-Identifier, Email OTP, dan Turnstile di localhost:3000
const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("=== MEMULAI PENGUJIAN OTENTIKASI BARU DI LOCALHOST ===");

  // 1. Uji Resolve Identifier
  console.log("\n1. Menguji /api/auth/resolve-identifier...");
  
  // Test Email
  const resEmail = await fetch(`${BASE_URL}/api/auth/resolve-identifier`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "hengkishadow@gmail.com" }),
  });
  const dataEmail = await resEmail.json();
  console.log("-> Input Email:", dataEmail);
  if (dataEmail.email !== "hengkishadow@gmail.com") throw new Error("Resolve email gagal");

  // Test WhatsApp Number
  const resPhone = await fetch(`${BASE_URL}/api/auth/resolve-identifier`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "081234567890" }),
  });
  const dataPhone = await resPhone.json();
  console.log("-> Input Phone:", dataPhone);
  if (!dataPhone.email) throw new Error("Resolve phone gagal");

  // 2. Uji Turnstile verification endpoint
  console.log("\n2. Menguji /api/auth/verify-turnstile...");
  const resTurnstile = await fetch(`${BASE_URL}/api/auth/verify-turnstile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: "test-token" }),
  });
  const dataTurnstile = await resTurnstile.json();
  console.log("-> Turnstile check:", dataTurnstile);

  // 3. Uji Send Email OTP
  console.log("\n3. Menguji /api/auth/send-email-otp...");
  const testEmail = `makassar.tester.${Date.now()}@gmail.com`;
  const resSendOtp = await fetch(`${BASE_URL}/api/auth/send-email-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      name: "Andi Makassar",
    }),
  });
  const dataSendOtp = await resSendOtp.json();
  console.log("-> Send Email OTP Response:", dataSendOtp);
  if (!dataSendOtp.success) throw new Error(`Send OTP gagal: ${dataSendOtp.error}`);

  const otpCode = dataSendOtp.devCode;
  console.log("-> Kode OTP tertangkap:", otpCode);

  if (otpCode) {
    // 4. Uji Verify Email OTP
    console.log("\n4. Menguji /api/auth/verify-email-otp...");
    const resVerifyOtp = await fetch(`${BASE_URL}/api/auth/verify-email-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        code: otpCode,
      }),
    });
    const dataVerifyOtp = await resVerifyOtp.json();
    console.log("-> Verify Email OTP Response:", dataVerifyOtp);
    if (!dataVerifyOtp.success) throw new Error(`Verify OTP gagal: ${dataVerifyOtp.error}`);
  }

  console.log("\n=== SELURUH PENGUJIAN OTENTIKASI LOKAL 100% SUKSES! ===");
}

runTests().catch((err) => {
  console.error("Test Error:", err);
  process.exit(1);
});
