package com.vidyaos.app;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.graphics.Color;
import android.view.Window;
import androidx.annotation.Nullable;
import androidx.core.content.FileProvider;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;
import java.io.File;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    private static final int RC_GOOGLE_SIGN_IN = 9001;
    private static final String GOOGLE_CLIENT_ID = "147063521055-9044vtuf4ldk39g7c55cgqdcu0r98e3u.apps.googleusercontent.com";

    private GoogleSignInClient mGoogleSignInClient;
    private String pendingInstallApkPath = null;
    private BroadcastReceiver downloadReceiver = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Ensure webview content strictly starts after status bar indicators
        // and finishes before the mobile system navigation bar
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

        // Configure system bar colors and sharp dark indicators by default (like Meesho)
        applySystemBarAppearance(false, "#ffffff", "#ffffff");

        // Configure Google Sign-In with device account picker
        initGoogleSignInClient();

        // Configure webview settings, sanitized User-Agent and native bridges
        setupWebViewBridge();
    }

    /**
     * Applies dynamic status bar & navigation bar appearance based on theme.
     * In light mode: renders sharp DARK icons (clock, battery, 4G, wifi, bottom buttons).
     * In dark mode: renders LIGHT icons.
     */
    public void applySystemBarAppearance(boolean isDark, String statusColorHex, String navColorHex) {
        runOnUiThread(() -> {
            try {
                Window window = getWindow();
                WindowInsetsControllerCompat insetsController = WindowCompat.getInsetsController(window, window.getDecorView());
                if (insetsController != null) {
                    // appearanceLight = true means DARK icons on LIGHT background (like Meesho)
                    // appearanceLight = false means LIGHT icons on DARK background
                    insetsController.setAppearanceLightStatusBars(!isDark);
                    insetsController.setAppearanceLightNavigationBars(!isDark);
                }

                int sColor = isDark ? Color.parseColor("#0b1220") : Color.parseColor("#ffffff");
                int nColor = isDark ? Color.parseColor("#0b1220") : Color.parseColor("#ffffff");

                if (statusColorHex != null && !statusColorHex.isEmpty()) {
                    try { sColor = Color.parseColor(statusColorHex); } catch (Exception ignored) {}
                }
                if (navColorHex != null && !navColorHex.isEmpty()) {
                    try { nColor = Color.parseColor(navColorHex); } catch (Exception ignored) {}
                }

                window.setStatusBarColor(sColor);
                window.setNavigationBarColor(nColor);
            } catch (Exception e) {
                e.printStackTrace();
            }
        });
    }

    private void initGoogleSignInClient() {
        try {
            GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                    .requestIdToken(GOOGLE_CLIENT_ID)
                    .requestEmail()
                    .requestProfile()
                    .build();
            mGoogleSignInClient = GoogleSignIn.getClient(this, gso);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void setupWebViewBridge() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                WebSettings settings = webView.getSettings();

                // 1. Sanitize UserAgent (strip '; wv' and 'Version/X.X' so Google OAuth does not block with 403)
                String defaultUa = settings.getUserAgentString();
                if (defaultUa != null) {
                    String cleanUa = defaultUa.replace("; wv", "").replaceAll("Version\\/\\d+\\.\\d+\\s*", "");
                    settings.setUserAgentString(cleanUa);
                }

                settings.setJavaScriptEnabled(true);
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setJavaScriptCanOpenWindowsAutomatically(true);

                // 2. Attach JavascriptInterfaces
                webView.addJavascriptInterface(new NativeAuthBridge(), "NativeAuthBridge");
                webView.addJavascriptInterface(new NativeAppUpdater(), "NativeAppUpdater");
                webView.addJavascriptInterface(new NativeSystemUIBridge(), "NativeSystemUI");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // ─────────────────────────────────────────────────────────────
    // NATIVE SYSTEM UI BRIDGE (Status Bar & Navigation Bar Theming)
    // ─────────────────────────────────────────────────────────────
    public class NativeSystemUIBridge {
        @JavascriptInterface
        public void setSystemBarTheme(boolean isDark, String statusColorHex, String navColorHex) {
            applySystemBarAppearance(isDark, statusColorHex, navColorHex);
        }

        @JavascriptInterface
        public void syncTheme(boolean isDark) {
            applySystemBarAppearance(isDark, isDark ? "#0b1220" : "#ffffff", isDark ? "#0b1220" : "#ffffff");
        }
    }

    // ─────────────────────────────────────────────────────────────
    // NATIVE GOOGLE AUTH BRIDGE
    // ─────────────────────────────────────────────────────────────
    public class NativeAuthBridge {
        @JavascriptInterface
        public void launchGoogleSignIn() {
            runOnUiThread(() -> {
                try {
                    if (mGoogleSignInClient == null) {
                        initGoogleSignInClient();
                    }
                    if (mGoogleSignInClient != null) {
                        // Sign out any previously cached session to ensure the Android
                        // native Google Account Chooser bottom-sheet is always displayed
                        mGoogleSignInClient.signOut().addOnCompleteListener(MainActivity.this, task -> {
                            Intent signInIntent = mGoogleSignInClient.getSignInIntent();
                            startActivityForResult(signInIntent, RC_GOOGLE_SIGN_IN);
                        });
                    } else {
                        sendGoogleSignInError(500, "Google Sign-In client unavailable");
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                    sendGoogleSignInError(500, e.getMessage() != null ? e.getMessage() : "Error launching Google Sign-In");
                }
            });
        }

        @JavascriptInterface
        public void signOut() {
            runOnUiThread(() -> {
                try {
                    if (mGoogleSignInClient != null) {
                        mGoogleSignInClient.signOut();
                    }
                } catch (Exception ignored) {}
            });
        }

        @JavascriptInterface
        public boolean isNative() {
            return true;
        }
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == RC_GOOGLE_SIGN_IN) {
            Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
            try {
                GoogleSignInAccount account = task.getResult(ApiException.class);
                if (account != null) {
                    String idToken = account.getIdToken();
                    String email = account.getEmail();
                    String displayName = account.getDisplayName();
                    String sub = account.getId();

                    JSONObject payload = new JSONObject();
                    payload.put("idToken", idToken != null ? idToken : "");
                    payload.put("email", email != null ? email : "");
                    payload.put("name", displayName != null ? displayName : "");
                    payload.put("sub", sub != null ? sub : "");

                    sendGoogleSignInSuccess(payload.toString());
                } else {
                    sendGoogleSignInError(400, "Google account was null");
                }
            } catch (ApiException e) {
                int code = e.getStatusCode();
                String message = e.getMessage() != null ? e.getMessage() : "Google Sign-In cancelled or failed";
                sendGoogleSignInError(code, message);
            } catch (Exception e) {
                sendGoogleSignInError(500, e.getMessage());
            }
        }
    }

    private void sendGoogleSignInSuccess(String jsonPayload) {
        runOnUiThread(() -> {
            try {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    String js = "if (typeof window.onNativeGoogleSignInSuccess === 'function') { window.onNativeGoogleSignInSuccess(" + jsonPayload + "); }";
                    getBridge().getWebView().evaluateJavascript(js, null);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        });
    }

    private void sendGoogleSignInError(int code, String message) {
        runOnUiThread(() -> {
            try {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    JSONObject errObj = new JSONObject();
                    errObj.put("code", code);
                    errObj.put("message", message != null ? message : "Error");
                    String js = "if (typeof window.onNativeGoogleSignInError === 'function') { window.onNativeGoogleSignInError(" + errObj.toString() + "); }";
                    getBridge().getWebView().evaluateJavascript(js, null);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        });
    }

    // ─────────────────────────────────────────────────────────────
    // NATIVE IN-APP APK UPDATER & PACKAGE INSTALLER
    // ─────────────────────────────────────────────────────────────
    public class NativeAppUpdater {
        @JavascriptInterface
        public void downloadAndInstall(String apkUrl) {
            if (apkUrl == null || apkUrl.trim().isEmpty()) return;
            runOnUiThread(() -> startApkDownload(apkUrl.trim()));
        }

        @JavascriptInterface
        public boolean isNative() {
            return true;
        }
    }

    private void startApkDownload(String apkUrl) {
        try {
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(apkUrl));
            request.setTitle("VidyaOS App Update");
            request.setDescription("Downloading latest institutional release...");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setMimeType("application/vnd.android.package-archive");

            File downloadsDir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
            if (downloadsDir != null && !downloadsDir.exists()) {
                downloadsDir.mkdirs();
            }
            File destinationFile = new File(downloadsDir, "VidyaOS_update.apk");
            if (destinationFile.exists()) {
                destinationFile.delete();
            }
            request.setDestinationUri(Uri.fromFile(destinationFile));

            DownloadManager manager = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
            if (manager == null) {
                // Fallback to opening in external browser
                Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(apkUrl));
                browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(browserIntent);
                return;
            }

            long downloadId = manager.enqueue(request);

            // Register completion broadcast receiver
            if (downloadReceiver != null) {
                try { unregisterReceiver(downloadReceiver); } catch (Exception ignored) {}
            }

            downloadReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                    if (id == downloadId) {
                        installApk(destinationFile);
                        try {
                            unregisterReceiver(this);
                            downloadReceiver = null;
                        } catch (Exception ignored) {}
                    }
                }
            };

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(downloadReceiver, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE), Context.RECEIVER_EXPORTED);
            } else {
                registerReceiver(downloadReceiver, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
            }
        } catch (Exception e) {
            e.printStackTrace();
            try {
                Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(apkUrl));
                browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(browserIntent);
            } catch (Exception ignored) {}
        }
    }

    private void installApk(File apkFile) {
        if (apkFile == null || !apkFile.exists()) return;

        // Check Unknown Apps permission on Android 8.0+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (!getPackageManager().canRequestPackageInstalls()) {
                pendingInstallApkPath = apkFile.getAbsolutePath();
                Intent permissionIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES)
                        .setData(Uri.parse(String.format("package:%s", getPackageName())))
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(permissionIntent);
                return;
            }
        }

        try {
            Uri apkUri = FileProvider.getUriForFile(
                    this,
                    getPackageName() + ".fileprovider",
                    apkFile
            );

            Intent installIntent = new Intent(Intent.ACTION_VIEW);
            installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivity(installIntent);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        setupWebViewBridge();

        // If returning from "Allow Unknown Apps" permission screen, resume install
        if (pendingInstallApkPath != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (getPackageManager().canRequestPackageInstalls()) {
                File apkFile = new File(pendingInstallApkPath);
                pendingInstallApkPath = null;
                installApk(apkFile);
            }
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (downloadReceiver != null) {
            try {
                unregisterReceiver(downloadReceiver);
                downloadReceiver = null;
            } catch (Exception ignored) {}
        }
    }
}
