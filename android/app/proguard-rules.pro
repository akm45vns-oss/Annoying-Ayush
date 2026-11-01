# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Preserve Capacitor core, plugins, and bridge interfaces
-keep public class com.getcapacitor.** { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod public *;
}
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Preserve WebKit WebView classes
-keepclassmembers class fqcn.of.javascript.interface.for.webview {
   public *;
}

# Preserve line numbers for stack traces
-keepattributes SourceFile,LineNumberTable
