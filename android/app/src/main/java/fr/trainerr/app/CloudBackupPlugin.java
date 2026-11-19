package fr.trainerr.app;

import android.app.backup.BackupManager;
import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * The "Google backup" setting, kept where TrainerrBackupAgent can read it: the
 * agent runs without the web part of the app, so it cannot read the settings
 * stored in the SQLite database.
 */
@CapacitorPlugin(name = "CloudBackup")
public class CloudBackupPlugin extends Plugin {

    private static final String PREFERENCES = "trainerr_backup";
    private static final String ENABLED = "cloud_enabled";

    /** Off when never set: nothing goes to Google Drive by default. */
    static boolean isEnabled(Context context) {
        return context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).getBoolean(ENABLED, false);
    }

    @PluginMethod
    public void setEnabled(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        Context context = getContext();
        boolean changed = isEnabled(context) != enabled;
        context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).edit().putBoolean(ENABLED, enabled).apply();
        // Asks Android for a backup soon, so that the choice is applied without waiting.
        if (changed) new BackupManager(context).dataChanged();
        JSObject result = new JSObject();
        result.put("enabled", enabled);
        call.resolve(result);
    }
}
