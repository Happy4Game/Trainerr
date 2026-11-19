package fr.trainerr.app;

import android.app.backup.BackupAgent;
import android.app.backup.BackupDataInput;
import android.app.backup.BackupDataOutput;
import android.app.backup.FullBackupDataOutput;
import android.os.Build;
import android.os.ParcelFileDescriptor;
import java.io.IOException;

/**
 * Android's automatic backup to the user's Google Drive, off by default.
 *
 * With android:allowBackup="true" and no agent, Android copies the app's data
 * (the SQLite database: sessions, weight, measurements, photos) to Google Drive
 * about once a day, without the user doing anything. Trainerr promises that no
 * data leaves the phone without the user's action, so this agent only lets the
 * copy go when the user turned "Google backup" on in the settings
 * (CloudBackupPlugin writes that choice to the SharedPreferences, which this
 * agent can read without the web part of the app).
 *
 * A transfer straight to a new phone (cable or Wi-Fi, started by the user) is
 * always allowed: the data does not go through the internet.
 *
 * https://developer.android.com/identity/data/autobackup ("Implement BackupAgent")
 * https://developer.android.com/reference/android/app/backup/BackupAgent#onFullBackup(android.app.backup.FullBackupDataOutput)
 */
public class TrainerrBackupAgent extends BackupAgent {

    @Override
    public void onFullBackup(FullBackupDataOutput data) throws IOException {
        if (deviceToDevice(data) || CloudBackupPlugin.isEnabled(this)) {
            // Same files as Auto Backup without an agent.
            super.onFullBackup(data);
        }
        // Otherwise nothing is written: nothing is sent.
    }

    private static boolean deviceToDevice(FullBackupDataOutput data) {
        return (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.P &&
            (data.getTransportFlags() & BackupAgent.FLAG_DEVICE_TO_DEVICE_TRANSFER) != 0
        );
    }

    // Key/value backup, the older API: not used (android:fullBackupOnly="true").
    @Override
    public void onBackup(ParcelFileDescriptor oldState, BackupDataOutput data, ParcelFileDescriptor newState) {}

    @Override
    public void onRestore(BackupDataInput data, int appVersionCode, ParcelFileDescriptor newState) {}
}
