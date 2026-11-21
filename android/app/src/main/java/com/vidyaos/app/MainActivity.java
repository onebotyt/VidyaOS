package com.vidyaos.app;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Ensure webview content strictly starts after status bar indicators
        // and finishes before the mobile system navigation bar
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
    }
}
