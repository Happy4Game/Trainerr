package fr.trainerr.app;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.core.content.FileProvider;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;

/**
 * Exports (backup, CSV, coach report, recap image) on Android. The WebView has
 * neither the Web Share API for files nor downloads from a link, so the web side
 * hands the file here: it is written to the app cache and offered to the Android
 * share menu (Drive, e-mail, Files…). Nothing leaves the phone unless the user
 * picks a destination.
 */
@CapacitorPlugin(name = "FileShare")
public class FileSharePlugin extends Plugin {

    @PluginMethod
    public void share(PluginCall call) {
        String name = call.getString("name", "");
        String data = call.getString("data", "");
        String mimeType = call.getString("mimeType", "application/octet-stream");
        String title = call.getString("title", "");
        // A plain file name only: the file stays in the exports folder of the cache.
        if (name == null || !name.matches("[A-Za-z0-9._-]{1,120}") || data == null) {
            call.reject("Fichier refusé");
            return;
        }
        try {
            Context context = getContext();
            File dir = new File(context.getCacheDir(), "exports");
            if (!dir.isDirectory() && !dir.mkdirs()) throw new IllegalStateException("Dossier d'export");
            File file = new File(dir, name);
            try (FileOutputStream out = new FileOutputStream(file)) {
                out.write(Base64.decode(data, Base64.DEFAULT));
            }
            Uri uri = FileProvider.getUriForFile(context, context.getPackageName() + ".fileprovider", file);
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType(mimeType);
            send.putExtra(Intent.EXTRA_STREAM, uri);
            send.putExtra(Intent.EXTRA_SUBJECT, title);
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent chooser = Intent.createChooser(send, title);
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            context.startActivity(chooser);
            call.resolve();
        } catch (Exception e) {
            call.reject("Partage impossible", e);
        }
    }
}
