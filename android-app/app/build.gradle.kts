import java.security.MessageDigest

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
}

android {
    namespace = "id.pasticuan.wallet"
    compileSdk = 35

    defaultConfig {
        applicationId = "id.pasticuan.wallet"
        minSdk = 26
        targetSdk = 35
        versionCode = 3
        versionName = "0.2.1-beta"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            applicationIdSuffix = ""
            versionNameSuffix = ""
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

    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")

    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")

    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.robolectric:robolectric:4.14.1")
    testImplementation("androidx.compose.ui:ui-test-junit4")
}
