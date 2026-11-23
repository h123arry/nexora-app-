package com.voiceofharrison.nexora;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(NexoraMediaPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
