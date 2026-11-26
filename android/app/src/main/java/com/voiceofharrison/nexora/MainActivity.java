package com.voiceofharrison.nexora;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(NexoraMediaPlugin.class);
        super.onCreate(savedInstanceState);

        // Use AndroidX's dispatcher so Android gesture navigation and the
        // three-button Back control follow the same route.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                dispatchBackToNexora();
            }
        });
    }

    /**
     * Route Android system Back through the same navigation stack used by the
     * web application. Only move the task to the background when NEXORA reports
     * that there is no keyboard, overlay, nested screen, or prior app route left.
     */
    private void dispatchBackToNexora() {
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
