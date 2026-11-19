package fr.trainerr.app;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * Body photos also shown in the phone's Photos app, when the user turns it on
 * (off by default). The photos themselves live in the app's database, in its
 * internal storage, which no gallery reads. This plugin puts a copy of each one
 * in the "Pictures/Trainerr" album through MediaStore, and takes the copies
 * away when the user turns it off.
 *
 * Android 10 (API 29) and later only: there, an app needs no storage permission
 * to add media files and to change or delete the ones it added itself
 * (developer.android.com/training/data-storage/shared/media, "Access your own
 * media files"). Before Android 10 it would need WRITE_EXTERNAL_STORAGE, so the
 * option is not offered there.
 *
 * Each copy is named after the photo's id (trainerr-&lt;id&gt;.jpg): removing a photo
 * in the app removes its copy, without keeping a list of copies.
 */
@CapacitorPlugin(name = "PhotoGallery")
public class PhotoGalleryPlugin extends Plugin {

    private static final String FOLDER = "Pictures/Trainerr/";

    private static boolean supported() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q;
    }

    @PluginMethod
    public void available(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", supported());
        call.resolve(result);
    }

    /** Writes (or rewrites) the copy of one photo: { id, data (base64 JPEG), takenAt (ms) }. */
    @PluginMethod
    public void save(PluginCall call) {
        String id = call.getString("id", "");
        String data = call.getString("data", "");
        Long takenAt = call.getLong("takenAt");
        if (!supported()) {
            call.reject("Android 10 ou plus récent seulement");
            return;
        }
        if (id == null || !id.matches("[A-Za-z0-9_-]{1,80}") || data == null || data.isEmpty()) {
            call.reject("Photo refusée");
            return;
        }
        ContentResolver resolver = getContext().getContentResolver();
        Uri uri = null;
        try {
            deleteNamed(resolver, fileName(id));
            ContentValues values = new ContentValues();
            values.put(MediaStore.Images.Media.DISPLAY_NAME, fileName(id));
            values.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
            values.put(MediaStore.Images.Media.RELATIVE_PATH, FOLDER);
            if (takenAt != null) values.put(MediaStore.Images.Media.DATE_TAKEN, takenAt);
            // Hidden from other apps while it is being written.
            values.put(MediaStore.Images.Media.IS_PENDING, 1);
            uri = resolver.insert(collection(), values);
            if (uri == null) throw new IllegalStateException("MediaStore a refusé la photo");
            try (OutputStream out = resolver.openOutputStream(uri)) {
                if (out == null) throw new IllegalStateException("Écriture impossible");
                out.write(Base64.decode(data, Base64.DEFAULT));
            }
            ContentValues done = new ContentValues();
            done.put(MediaStore.Images.Media.IS_PENDING, 0);
            resolver.update(uri, done, null, null);
            call.resolve();
        } catch (Exception e) {
            if (uri != null) resolver.delete(uri, null, null);
            call.reject("Copie dans la galerie impossible", e);
        }
    }

    /** Removes the copy of one photo: { id }. */
    @PluginMethod
    public void remove(PluginCall call) {
        String id = call.getString("id", "");
        if (!supported() || id == null || !id.matches("[A-Za-z0-9_-]{1,80}")) {
            call.resolve();
            return;
        }
        try {
            deleteNamed(getContext().getContentResolver(), fileName(id));
            call.resolve();
        } catch (Exception e) {
            call.reject("Suppression impossible", e);
        }
    }

    /** Removes every copy the app put in the album; answers how many could not be removed. */
    @PluginMethod
    public void removeAll(PluginCall call) {
        JSObject result = new JSObject();
        if (!supported()) {
            result.put("left", 0);
            call.resolve(result);
            return;
        }
        ContentResolver resolver = getContext().getContentResolver();
        int left = 0;
        for (Uri uri : copies(resolver, null)) {
            try {
                resolver.delete(uri, null, null);
            } catch (SecurityException e) {
                // A copy made before the app was reinstalled is no longer the app's own:
                // Android would ask the user first. It stays; the user can delete it in Photos.
                left++;
            }
        }
        result.put("left", left);
        call.resolve(result);
    }

    private static String fileName(String id) {
        return "trainerr-" + id + ".jpg";
    }

    private static Uri collection() {
        return MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
    }

    private static void deleteNamed(ContentResolver resolver, String name) {
        for (Uri uri : copies(resolver, name)) resolver.delete(uri, null, null);
    }

    /**
     * The app's copies in the album (one name, or all). Without a storage
     * permission, MediaStore only lists the files the app added itself.
     */
    private static List<Uri> copies(ContentResolver resolver, String name) {
        List<Uri> found = new ArrayList<>();
        String where = MediaStore.Images.Media.RELATIVE_PATH + " = ?";
        String[] args = name == null ? new String[] { FOLDER } : new String[] { FOLDER, name };
        if (name != null) where += " AND " + MediaStore.Images.Media.DISPLAY_NAME + " = ?";
        String[] columns = { MediaStore.Images.Media._ID };
        try (Cursor cursor = resolver.query(collection(), columns, where, args, null)) {
            if (cursor == null) return found;
            int idColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID);
            while (cursor.moveToNext()) {
                found.add(Uri.withAppendedPath(collection(), String.valueOf(cursor.getLong(idColumn))));
            }
        }
        return found;
    }
}
