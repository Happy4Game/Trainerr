package fr.trainerr.app;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Updates from the project's GitHub Releases: the web side finds the new
 * version, this plugin downloads the APK into the app cache and hands it to
 * the Android package installer, which asks the user to confirm. Android
 * only accepts it if it is signed with the same key as the installed app.
 */
@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {

    /** Never download anything else than the project's own release files. */
    private static final String ALLOWED_PREFIX = "https://github.com/Happy4Game/Trainerr/releases/download/";
    private static final int MAX_REDIRECTS = 5;

    @PluginMethod
    public void getVersion(PluginCall call) {
        try {
            Context context = getContext();
            PackageInfo info = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
            long code = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P ? info.getLongVersionCode() : info.versionCode;
            JSObject result = new JSObject();
            result.put("versionCode", code);
            result.put("versionName", info.versionName);
            call.resolve(result);
        } catch (PackageManager.NameNotFoundException e) {
            call.reject("Version introuvable", e);
        }
    }

    /** Android 8+: installing an APK needs the "install unknown apps" permission for Trainerr. */
    @PluginMethod
    public void canInstall(PluginCall call) {
        JSObject result = new JSObject();
        result.put(
            "allowed",
            Build.VERSION.SDK_INT < Build.VERSION_CODES.O || getContext().getPackageManager().canRequestPackageInstalls()
        );
        call.resolve(result);
    }

    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String url = call.getString("url", "");
        if (url == null || !url.startsWith(ALLOWED_PREFIX) || !url.endsWith(".apk")) {
            call.reject("Adresse de mise à jour refusée");
            return;
        }
        new Thread(() -> {
            try {
                File apk = download(url);
                install(apk);
                call.resolve();
            } catch (Exception e) {
                call.reject("Téléchargement impossible", e);
            }
        }).start();
    }

    private File download(String address) throws Exception {
        File dir = new File(getContext().getCacheDir(), "updates");
        if (!dir.isDirectory() && !dir.mkdirs()) throw new IllegalStateException("Dossier de téléchargement");
        File apk = new File(dir, "trainerr-update.apk");

        HttpURLConnection connection = open(address);
        try (InputStream in = connection.getInputStream(); OutputStream out = new FileOutputStream(apk)) {
            long total = connection.getContentLengthLong();
            long done = 0;
            int lastPercent = -1;
            byte[] buffer = new byte[64 * 1024];
            int read;
            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
                done += read;
                int percent = total > 0 ? (int) (done * 100 / total) : -1;
                if (percent != lastPercent) {
                    lastPercent = percent;
                    JSObject progress = new JSObject();
                    progress.put("percent", percent);
                    notifyListeners("downloadProgress", progress);
                }
            }
        } finally {
            connection.disconnect();
        }
        return apk;
    }

    /** GitHub answers with redirects to its file storage: followed by hand, HTTPS only. */
    private static HttpURLConnection open(String address) throws Exception {
        String current = address;
        for (int i = 0; i <= MAX_REDIRECTS; i++) {
            HttpURLConnection connection = (HttpURLConnection) new URL(current).openConnection();
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(15_000);
            connection.setReadTimeout(30_000);
            int status = connection.getResponseCode();
            if (status >= 300 && status < 400) {
                String location = connection.getHeaderField("Location");
                connection.disconnect();
                if (location == null || !location.startsWith("https://")) throw new IllegalStateException("Redirection refusée");
                current = location;
                continue;
            }
            if (status != HttpURLConnection.HTTP_OK) {
                connection.disconnect();
                throw new IllegalStateException("Réponse " + status);
            }
            return connection;
        }
        throw new IllegalStateException("Trop de redirections");
    }

    private void install(File apk) {
        Context context = getContext();
        Uri uri = FileProvider.getUriForFile(context, context.getPackageName() + ".fileprovider", apk);
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);
    }
}
