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
        if (NexoraMediaPlugin.isCreateExperienceActive() && bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().evaluateJavascript(
                "window.dispatchEvent(new Event('nexora:android-back'))",
                null
            );
            return;
        }
        super.onBackPressed();
    }
}
