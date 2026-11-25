package com.voiceofharrison.nexora;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(NexoraMediaPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        com.getcapacitor.Bridge currentBridge = getBridge();
        if (NexoraMediaPlugin.isCreateExperienceActive() && currentBridge != null && currentBridge.getWebView() != null) {
            currentBridge.getWebView().evaluateJavascript(
                "window.dispatchEvent(new Event('nexora:android-back'))",
                null
            );
            return;
        }
        super.onBackPressed();
    }
}
