package id.makassar.kaoskami;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    /**
     * N3 — Notification Channel Android 8.0+ (API 26).
     * WAJIB ada sebelum notifikasi FCM tampil di Android 8+; tanpa channel,
     * notifikasi di-drop sistem diam-diam. ID `kaoskami_orders` dipakai untuk
     * status sablon (lunas/selesai) — samakan `android_channel_id` di payload
     * FCM server bila mengirim channel eksplisit.
     */
    public static final String CHANNEL_ID_ORDERS = "kaoskami_orders";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannels();
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        try {
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm == null) return;
            if (nm.getNotificationChannel(CHANNEL_ID_ORDERS) != null) return;
            NotificationChannel orders = new NotificationChannel(
                    CHANNEL_ID_ORDERS,
                    "Status Sablon",
                    NotificationManager.IMPORTANCE_HIGH);
            orders.setDescription("Status pesanan sablon DTF: pembayaran lunas & selesai produksi.");
            nm.createNotificationChannel(orders);
        } catch (Exception ignored) {
            // Channel gagal dibuat = notifikasi fallback ke default; JANGAN crash start.
        }
    }
}
