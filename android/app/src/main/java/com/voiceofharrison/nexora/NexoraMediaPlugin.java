package com.voiceofharrison.nexora;

import android.content.ContentValues;
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

@CapacitorPlugin(name = "NexoraMedia")
public class NexoraMediaPlugin extends Plugin {
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
