package com.voiceofharrison.nexora;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(NexoraMediaPlugin.class);
        super.onCreate(savedInstanceState);
    }

    /**
     * Route Android system Back through the same navigation stack used by the
     * web application. Only move the task to the background when NEXORA reports
     * that there is no keyboard, overlay, nested screen, or prior app route left.
     */
    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        Bridge currentBridge = getBridge();
        if (currentBridge == null || currentBridge.getWebView() == null) {
            moveTaskToBack(true);
            return;
        }

        currentBridge.getWebView().evaluateJavascript(
            "(function(){"
                + "var event = new Event('nexora:android-back', { cancelable: true });"
                + "window.dispatchEvent(event);"
                + "return event.defaultPrevented;"
                + "})()",
            handled -> {
                if (!"true".equals(handled)) {
                    runOnUiThread(() -> moveTaskToBack(true));
                }
            }
        );
    }
}
