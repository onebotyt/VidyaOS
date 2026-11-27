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
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import android.widget.Toast;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.content.pm.PackageInfo;
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

        // Dynamically measure status bar insets and inject CSS safe-area variable into WebView
        ViewCompat.setOnApplyWindowInsetsListener(getWindow().getDecorView(), (v, insets) -> {
            int statusBarPx = insets.getInsets(WindowInsetsCompat.Type.statusBars()).top;
            if (statusBarPx > 0) {
                float density = getResources().getDisplayMetrics().density;
                int statusBarDp = Math.round(statusBarPx / density);
                runOnUiThread(() -> {
                    try {
                        if (getBridge() != null && getBridge().getWebView() != null) {
                            getBridge().getWebView().evaluateJavascript(
                                "document.documentElement.classList.add('is-native-shell');" +
                                "window.VIDYAOS_IS_NATIVE = true;" +
                                "document.documentElement.style.setProperty('--safe-area-inset-top', '" + statusBarDp + "px');" +
                                "document.documentElement.style.setProperty('--status-bar-height', '" + statusBarDp + "px');" +
                                "var h = document.getElementById('admin-top-header'); if(h){ h.style.paddingTop = '" + statusBarDp + "px'; h.style.height = '" + (56 + statusBarDp) + "px'; h.style.minHeight = '" + (56 + statusBarDp) + "px'; h.style.boxSizing = 'border-box'; }" +
                                "var m = document.querySelector('.admin-main-wrap'); if(m){ m.style.paddingTop = '" + (56 + statusBarDp) + "px'; }",
                                null
                            );
                        }
                    } catch (Exception ignored) {}
                });
            }
            return insets;
        });

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
                    if (!cleanUa.contains("VidyaOSNativeApp")) {
                        cleanUa = cleanUa + " VidyaOSNativeApp/1.0";
                    }
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

        @JavascriptInterface
        public int getStatusBarHeight() {
            try {
                int resId = getResources().getIdentifier("status_bar_height", "dimen", "android");
                if (resId > 0) {
                    int px = getResources().getDimensionPixelSize(resId);
                    float density = getResources().getDisplayMetrics().density;
                    return Math.round(px / density);
                }
            } catch (Exception ignored) {}
            return 36;
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
    private final ExecutorService updateExecutor = Executors.newSingleThreadExecutor();

    public class NativeAppUpdater {
        @JavascriptInterface
        public void downloadAndInstall(String apkUrl) {
            if (apkUrl == null || apkUrl.trim().isEmpty()) return;
            startDirectApkDownload(apkUrl.trim());
        }

        @JavascriptInterface
        public String getAppVersionName() {
            try {
                PackageInfo pInfo = getPackageManager().getPackageInfo(getPackageName(), 0);
                return pInfo.versionName;
            } catch (Exception e) {
                return "1.0.98";
            }
        }

        @JavascriptInterface
        public int getAppVersionCode() {
            try {
                PackageInfo pInfo = getPackageManager().getPackageInfo(getPackageName(), 0);
                return pInfo.versionCode;
            } catch (Exception e) {
                return 98;
            }
        }

        @JavascriptInterface
        public boolean isNative() {
            return true;
        }
    }

    private void startDirectApkDownload(String initialUrl) {
        runOnUiThread(() -> Toast.makeText(MainActivity.this, "Downloading VidyaOS update in background...", Toast.LENGTH_SHORT).show());

        updateExecutor.execute(() -> {
            HttpURLConnection conn = null;
            InputStream in = null;
            FileOutputStream out = null;
            File destinationFile = null;

            try {
                String currentUrl = initialUrl;
                int redirects = 0;

                while (redirects < 8) {
                    URL url = new URL(currentUrl);
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setInstanceFollowRedirects(true);
                    conn.setConnectTimeout(30000);
                    conn.setReadTimeout(30000);
                    conn.setRequestProperty("User-Agent", "VidyaOS-AppUpdater/1.0");
                    conn.connect();

                    int code = conn.getResponseCode();
                    if (code == HttpURLConnection.HTTP_MOVED_PERM || code == HttpURLConnection.HTTP_MOVED_TEMP ||
                        code == HttpURLConnection.HTTP_SEE_OTHER || code == 307 || code == 308) {
                        String location = conn.getHeaderField("Location");
                        if (location != null && !location.isEmpty()) {
                            currentUrl = location;
                            conn.disconnect();
                            redirects++;
                            continue;
                        }
                    }
                    break;
                }

                if (conn.getResponseCode() != HttpURLConnection.HTTP_OK) {
                    throw new Exception("Update server HTTP " + conn.getResponseCode());
                }

                long fileLength = conn.getContentLengthLong();

                File targetDir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                if (targetDir == null) {
                    targetDir = getCacheDir();
                }
                if (!targetDir.exists()) {
                    targetDir.mkdirs();
                }

                destinationFile = new File(targetDir, "VidyaOS_update.apk");
                if (destinationFile.exists()) {
                    destinationFile.delete();
                }

                in = conn.getInputStream();
                out = new FileOutputStream(destinationFile);

                byte[] buffer = new byte[8192];
                long total = 0;
                int count;
                long lastProgressTime = 0;

                while ((count = in.read(buffer)) != -1) {
                    total += count;
                    out.write(buffer, 0, count);

                    long now = System.currentTimeMillis();
                    if (fileLength > 0 && (now - lastProgressTime > 250 || total == fileLength)) {
                        lastProgressTime = now;
                        int pct = (int) ((total * 100) / fileLength);
                        notifyUpdateProgress(pct, total, fileLength);
                    }
                }
                out.flush();

                if (destinationFile.length() < 1024 * 1024) {
                    throw new Exception("Downloaded file is incomplete (" + destinationFile.length() + " bytes)");
                }

                final File finalFile = destinationFile;
                runOnUiThread(() -> {
                    Toast.makeText(MainActivity.this, "Update downloaded! Opening installer...", Toast.LENGTH_SHORT).show();
                    notifyUpdateComplete();
                    installApk(finalFile);
                });

            } catch (Exception e) {
                e.printStackTrace();
                final String errMsg = e.getMessage() != null ? e.getMessage() : "Download error";
                runOnUiThread(() -> {
                    Toast.makeText(MainActivity.this, "In-app download error: " + errMsg + ". Opening browser...", Toast.LENGTH_LONG).show();
                    notifyUpdateError(errMsg);
                    try {
                        Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(initialUrl));
                        browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(browserIntent);
                    } catch (Exception ignored) {}
                });
            } finally {
                try { if (in != null) in.close(); } catch (Exception ignored) {}
                try { if (out != null) out.close(); } catch (Exception ignored) {}
                try { if (conn != null) conn.disconnect(); } catch (Exception ignored) {}
            }
        });
    }

    private void notifyUpdateProgress(int percent, long downloaded, long total) {
        runOnUiThread(() -> {
            try {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    String js = "if (typeof window.onNativeUpdateProgress === 'function') { window.onNativeUpdateProgress(" + percent + ", " + downloaded + ", " + total + "); }";
                    getBridge().getWebView().evaluateJavascript(js, null);
                }
            } catch (Exception ignored) {}
        });
    }

    private void notifyUpdateComplete() {
        runOnUiThread(() -> {
            try {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    String js = "if (typeof window.onNativeUpdateComplete === 'function') { window.onNativeUpdateComplete(); }";
                    getBridge().getWebView().evaluateJavascript(js, null);
                }
            } catch (Exception ignored) {}
        });
    }

    private void notifyUpdateError(String error) {
        runOnUiThread(() -> {
            try {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    String js = "if (typeof window.onNativeUpdateError === 'function') { window.onNativeUpdateError(" + JSONObject.quote(error) + "); }";
                    getBridge().getWebView().evaluateJavascript(js, null);
                }
            } catch (Exception ignored) {}
        });
    }

    private void installApk(File apkFile) {
        if (apkFile == null || !apkFile.exists() || apkFile.length() < 1024 * 1024) {
            Toast.makeText(this, "Installer file not found or corrupted.", Toast.LENGTH_SHORT).show();
            return;
        }

        // Check Unknown Apps permission on Android 8.0+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (!getPackageManager().canRequestPackageInstalls()) {
                pendingInstallApkPath = apkFile.getAbsolutePath();
                Toast.makeText(this, "Please enable 'Allow from this source' to install update", Toast.LENGTH_LONG).show();
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

            // Grant read URI permissions explicitly to matching package installer
            List<ResolveInfo> resInfoList = getPackageManager().queryIntentActivities(installIntent, PackageManager.MATCH_DEFAULT_ONLY);
            for (ResolveInfo resolveInfo : resInfoList) {
                String packageName = resolveInfo.activityInfo.packageName;
                grantUriPermission(packageName, apkUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
            }

            startActivity(installIntent);
        } catch (Exception e) {
            e.printStackTrace();
            Toast.makeText(this, "Failed to launch installer: " + e.getMessage(), Toast.LENGTH_LONG).show();
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
        if (updateExecutor != null && !updateExecutor.isShutdown()) {
            updateExecutor.shutdown();
        }
        if (downloadReceiver != null) {
            try {
                unregisterReceiver(downloadReceiver);
                downloadReceiver = null;
            } catch (Exception ignored) {}
        }
    }
}
