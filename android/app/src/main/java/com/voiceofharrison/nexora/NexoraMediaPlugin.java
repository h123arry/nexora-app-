package com.voiceofharrison.nexora;

import android.Manifest;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.util.Base64;
import android.graphics.Bitmap;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import java.io.OutputStream;

@CapacitorPlugin(name = "NexoraMedia", permissions = {
    @Permission(alias = "gallery", strings = { Manifest.permission.READ_MEDIA_IMAGES, Manifest.permission.READ_MEDIA_VIDEO, Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED }),
    @Permission(alias = "legacyGallery", strings = { Manifest.permission.READ_EXTERNAL_STORAGE })
})
public class NexoraMediaPlugin extends Plugin {

    @PluginMethod
    public void requestGalleryAccess(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requestPermissionForAlias("gallery", call, "galleryPermissionCallback");
        } else {
            requestPermissionForAlias("legacyGallery", call, "galleryPermissionCallback");
        }
    }

    @com.getcapacitor.annotation.PermissionCallback
    private void galleryPermissionCallback(PluginCall call) {
        JSObject result = new JSObject();
        String kind = call.getString("kind", "photos");
        boolean granted;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            String requested = kind.equals("videos") ? Manifest.permission.READ_MEDIA_VIDEO : Manifest.permission.READ_MEDIA_IMAGES;
            granted = getContext().checkSelfPermission(requested) == android.content.pm.PackageManager.PERMISSION_GRANTED
                || (Build.VERSION.SDK_INT >= 34 && getContext().checkSelfPermission(Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED) == android.content.pm.PackageManager.PERMISSION_GRANTED);
        } else {
            granted = getContext().checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE) == android.content.pm.PackageManager.PERMISSION_GRANTED;
        }
        result.put("granted", granted);
        call.resolve(result);
    }

    @PluginMethod
    public void listGalleryMedia(PluginCall call) {
        String kind = call.getString("kind", "photos");
        int offset = Math.max(0, call.getInt("offset", 0));
        int requestedLimit = Math.max(1, Math.min(200, call.getInt("limit", 100)));
        if (!kind.equals("photos") && !kind.equals("videos")) {
            call.reject("Choose photos or videos.");
            return;
        }
        try {
            Uri collection = kind.equals("photos")
                ? MediaStore.Images.Media.EXTERNAL_CONTENT_URI
                : MediaStore.Video.Media.EXTERNAL_CONTENT_URI;
            String[] projection = {
                MediaStore.MediaColumns._ID,
                MediaStore.MediaColumns.DISPLAY_NAME,
                MediaStore.MediaColumns.MIME_TYPE,
                MediaStore.MediaColumns.DATE_ADDED,
                MediaStore.MediaColumns.SIZE,
                MediaStore.MediaColumns.WIDTH,
                MediaStore.MediaColumns.HEIGHT,
                MediaStore.Images.ImageColumns.BUCKET_DISPLAY_NAME
            };
            String sort = MediaStore.MediaColumns.DATE_ADDED + " DESC";
            try (android.database.Cursor cursor = getContext().getContentResolver().query(collection, projection, null, null, sort)) {
                JSArray items = new JSArray();
                if (cursor != null) {
                    int idColumn = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns._ID);
                    int nameColumn = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.DISPLAY_NAME);
                    int mimeColumn = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.MIME_TYPE);
                    int dateColumn = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.DATE_ADDED);
                    int sizeColumn = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.SIZE);
                    int widthColumn = cursor.getColumnIndex(MediaStore.MediaColumns.WIDTH);
                    int heightColumn = cursor.getColumnIndex(MediaStore.MediaColumns.HEIGHT);
                    int albumColumn = cursor.getColumnIndex(MediaStore.Images.ImageColumns.BUCKET_DISPLAY_NAME);
                    int skipped = 0;
                    int added = 0;
                    while (cursor.moveToNext() && added < requestedLimit) {
                        if (skipped++ < offset) continue;
                        long id = cursor.getLong(idColumn);
                        Uri itemUri = Uri.withAppendedPath(collection, String.valueOf(id));
                        String mime = cursor.getString(mimeColumn);
                        Bitmap thumbnail = null;
                        try {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                                thumbnail = getContext().getContentResolver().loadThumbnail(itemUri, new android.util.Size(240, 240), null);
                            } else if (kind.equals("photos")) {
                                thumbnail = MediaStore.Images.Thumbnails.getThumbnail(getContext().getContentResolver(), id, MediaStore.Images.Thumbnails.MINI_KIND, null);
                            } else {
                                thumbnail = MediaStore.Video.Thumbnails.getThumbnail(getContext().getContentResolver(), id, MediaStore.Video.Thumbnails.MINI_KIND, null);
                            }
                        } catch (Exception ignored) { }
                        String thumbnailData = "";
                        if (thumbnail != null) {
                            java.io.ByteArrayOutputStream bytes = new java.io.ByteArrayOutputStream();
                            thumbnail.compress(Bitmap.CompressFormat.JPEG, 76, bytes);
                            thumbnailData = "data:image/jpeg;base64," + Base64.encodeToString(bytes.toByteArray(), Base64.NO_WRAP);
                            thumbnail.recycle();
                        }
                        JSObject item = new JSObject();
                        item.put("id", String.valueOf(id));
                        item.put("uri", itemUri.toString());
                        item.put("name", cursor.getString(nameColumn));
                        item.put("mimeType", mime == null ? (kind.equals("photos") ? "image/*" : "video/*") : mime);
                        item.put("dateAdded", cursor.getLong(dateColumn) * 1000L);
                        item.put("size", cursor.getLong(sizeColumn));
                        item.put("width", widthColumn >= 0 ? cursor.getInt(widthColumn) : 0);
                        item.put("height", heightColumn >= 0 ? cursor.getInt(heightColumn) : 0);
                        item.put("album", albumColumn >= 0 ? cursor.getString(albumColumn) : "Recent");
                        item.put("thumbnail", thumbnailData);
                        items.put(item);
                        added++;
                    }
                }
                JSObject result = new JSObject();
                result.put("items", items);
                result.put("nextOffset", offset + items.length());
                result.put("hasMore", items.length() == requestedLimit);
                call.resolve(result);
            }
        } catch (Exception error) {
            call.reject("Could not read the device gallery.", error);
        }
    }

    @PluginMethod
    public void importGalleryMedia(PluginCall call) {
        String uriValue = call.getString("uri");
        String name = call.getString("name", "nexora-media");
        if (uriValue == null || uriValue.isEmpty()) {
            call.reject("Choose a media item first.");
            return;
        }
        java.io.File directory = new java.io.File(getContext().getCacheDir(), "nexora-gallery");
        if (!directory.exists() && !directory.mkdirs()) {
            call.reject("Could not prepare temporary media storage.");
            return;
        }
        java.io.File destination = null;
        try {
            Uri source = Uri.parse(uriValue);
            String safeName = name.replaceAll("[^A-Za-z0-9._-]", "_");
            String extension = safeName.contains(".") ? safeName.substring(safeName.lastIndexOf('.')) : ".media";
            destination = java.io.File.createTempFile("nx-", extension, directory);
            try (java.io.InputStream input = getContext().getContentResolver().openInputStream(source);
                 java.io.OutputStream output = new java.io.FileOutputStream(destination)) {
                if (input == null) throw new IllegalStateException("The selected media is no longer available.");
                byte[] buffer = new byte[1024 * 128];
                int count;
                while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
                output.flush();
            }
            JSObject result = new JSObject();
            result.put("filePath", destination.getAbsolutePath());
            result.put("name", safeName);
            result.put("mimeType", getContext().getContentResolver().getType(source));
            result.put("size", destination.length());
            call.resolve(result);
        } catch (Exception error) {
            if (destination != null) destination.delete();
            call.reject("Could not import the selected media.", error);
        }
    }

    @PluginMethod
    public void saveVideo(PluginCall call) {
        String filename = call.getString("filename");
        String mimeType = call.getString("mimeType", "video/mp4");
        String encoded = call.getString("base64Data");
        if (filename == null || encoded == null || encoded.isEmpty()) {
            call.reject("A filename and encoded video are required.");
            return;
        }
        Uri destination = null;
        try {
            byte[] bytes = Base64.decode(encoded, Base64.DEFAULT);
            ContentValues values = new ContentValues();
            values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
            values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                values.put(MediaStore.MediaColumns.RELATIVE_PATH, "Movies/NEXORA");
                values.put(MediaStore.MediaColumns.IS_PENDING, 1);
            }
            Uri collection = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                ? MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
                : MediaStore.Video.Media.EXTERNAL_CONTENT_URI;
            destination = getContext().getContentResolver().insert(collection, values);
            if (destination == null) throw new IllegalStateException("Could not create a device media entry.");
            try (OutputStream output = getContext().getContentResolver().openOutputStream(destination)) {
                if (output == null) throw new IllegalStateException("Could not open device media storage.");
                output.write(bytes);
                output.flush();
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues ready = new ContentValues();
                ready.put(MediaStore.MediaColumns.IS_PENDING, 0);
                getContext().getContentResolver().update(destination, ready, null, null);
            }
            JSObject result = new JSObject();
            result.put("saved", true);
            result.put("uri", destination.toString());
            call.resolve(result);
        } catch (Exception error) {
            if (destination != null) getContext().getContentResolver().delete(destination, null, null);
            call.reject("Could not save the branded video to device storage.", error);
        }
    }
}
