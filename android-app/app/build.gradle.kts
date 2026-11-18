import java.security.MessageDigest
import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
}

// ---------- Konfigurasi backend live ----------
// Urutan sumber: android-app/local.properties -> variabel lingkungan -> ../.env.local (env web).
// Hanya URL Supabase + anon key (publik) yang ikut ke APK. Service role key TIDAK PERNAH dibaca di sini.
val localProps = Properties().apply {
    val f = rootProject.file("local.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}
val envWeb: Map<String, String> = rootProject.file("../.env.local").let { f ->
    if (!f.exists()) emptyMap() else f.readLines()
        .map { it.trim() }
        .filter { it.isNotEmpty() && !it.startsWith("#") && it.contains("=") }
        .associate { line ->
            val i = line.indexOf('=')
            line.substring(0, i).trim() to line.substring(i + 1).trim().removeSurrounding("\"")
        }
}
fun cfg(key: String, default: String = ""): String =
    localProps.getProperty(key) ?: System.getenv(key) ?: envWeb[key] ?: default

val supabaseUrl = cfg("NEXT_PUBLIC_SUPABASE_URL").trimEnd('/')
val supabaseAnonKey = cfg("NEXT_PUBLIC_SUPABASE_ANON_KEY")
val apiUrlRelease = cfg("PASTI_CUAN_API_URL", "https://pasti-cuan-app.vercel.app").trimEnd('/')
val apiUrlDebug = cfg("PASTI_CUAN_API_URL_DEBUG", apiUrlRelease).trimEnd('/')
fun q(s: String) = "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\""

android {
    namespace = "id.pasticuan.wallet"
    compileSdk = 35

    defaultConfig {
        applicationId = "id.pasticuan.wallet"
        minSdk = 26
        targetSdk = 35
        versionCode = 4
        versionName = "0.3.0-beta"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }

        buildConfigField("String", "SUPABASE_URL", q(supabaseUrl))
        buildConfigField("String", "SUPABASE_ANON_KEY", q(supabaseAnonKey))
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            buildConfigField("String", "API_BASE_URL", q(apiUrlRelease))
        }
        debug {
            applicationIdSuffix = ""
            versionNameSuffix = ""
            buildConfigField("String", "API_BASE_URL", q(apiUrlDebug))
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }

    testOptions {
        unitTests {
            isIncludeAndroidResources = true
            isReturnDefaultValues = true
        }
    }
}

base {
    archivesName.set("pasti-cuan-v${android.defaultConfig.versionName}")
}

fun archiveApkWithoutOverwriting(variantDir: String, isDebug: Boolean) {
    val apkFolder = layout.buildDirectory.dir("outputs/apk/$variantDir").get().asFile
    val builtApk = apkFolder.listFiles()?.firstOrNull { it.isFile && it.extension == "apk" } ?: return
    val ver = android.defaultConfig.versionName ?: "dev"
    val baseName = if (isDebug) "pasti-cuan-v$ver-debug" else "pasti-cuan-v$ver"
    val destDir = rootProject.projectDir

    fun sha256(file: java.io.File): String {
        val md = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buf = ByteArray(8192)
            while (true) {
                val read = input.read(buf)
                if (read <= 0) break
                md.update(buf, 0, read)
            }
        }
        return md.digest().joinToString("") { "%02x".format(it) }
    }

    val targetHash = sha256(builtApk)
    var candidate = destDir.resolve("$baseName.apk")
    var rev = 2
    while (candidate.exists()) {
        if (sha256(candidate) == targetHash) {
            return
        }
        candidate = destDir.resolve("$baseName-r$rev.apk")
        rev++
    }
    builtApk.copyTo(candidate, overwrite = false)
    logger.lifecycle("Archived non-overwriting APK -> ${candidate.absolutePath}")
}

tasks.configureEach {
    if (name == "assembleDebug") {
        doLast { archiveApkWithoutOverwriting("debug", isDebug = true) }
    } else if (name == "assembleRelease") {
        doLast { archiveApkWithoutOverwriting("release", isDebug = false) }
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.10.01")
    implementation(composeBom)
    testImplementation(composeBom)

    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.browser:browser:1.8.0")

    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")

    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")

    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.robolectric:robolectric:4.14.1")
    testImplementation("androidx.compose.ui:ui-test-junit4")
}
