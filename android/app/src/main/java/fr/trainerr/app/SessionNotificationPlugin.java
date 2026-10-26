package fr.trainerr.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Ongoing notification while a session is in progress: the exercise, the set
 * and, during a rest, a countdown drawn by Android itself (no service needed,
 * the countdown keeps running with the screen off). The alert at the end of
 * the rest is a scheduled local notification (see sessionNotification.ts).
 */
@CapacitorPlugin(name = "SessionNotification")
public class SessionNotificationPlugin extends Plugin {

    private static final String CHANNEL_ID = "session";
    private static final int NOTIFICATION_ID = 7301;

    @PluginMethod
    public void show(PluginCall call) {
        Context context = getContext();
        createChannel(context, call.getString("channelName", "Séance en cours"));

        Intent open = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        PendingIntent contentIntent = open == null
            ? null
            : PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_trainerr)
            .setContentTitle(call.getString("title", ""))
            .setContentText(call.getString("body", ""))
            .setStyle(new NotificationCompat.BigTextStyle().bigText(call.getString("body", "")))
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_LOW);
        if (contentIntent != null) builder.setContentIntent(contentIntent);

        // optLong reads any JSON number: the time is sent as Date.now() from the web view.
        long restEndsAt = call.getData().optLong("restEndsAt", 0);
        if (restEndsAt > System.currentTimeMillis()) {
            // Android draws the countdown, even when the app is in the background.
            builder.setWhen(restEndsAt).setShowWhen(true).setUsesChronometer(true).setChronometerCountDown(true);
        } else {
            builder.setShowWhen(false);
        }

        try {
            NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, builder.build());
            call.resolve();
        } catch (SecurityException e) {
            // Notifications refused (Android 13+): the session goes on without them.
            JSObject result = new JSObject();
            result.put("shown", false);
            call.resolve(result);
        }
    }

    @PluginMethod
    public void hide(PluginCall call) {
        NotificationManagerCompat.from(getContext()).cancel(NOTIFICATION_ID);
        call.resolve();
    }

    private static void createChannel(Context context, String name) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, name, NotificationManager.IMPORTANCE_LOW);
        channel.setShowBadge(false);
        channel.setSound(null, null);
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager != null) manager.createNotificationChannel(channel);
    }
}
