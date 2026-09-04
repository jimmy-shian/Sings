#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SingStudio - Android Gradle 建置補丁腳本
解決 Kotlin stdlib-jdk7 / stdlib-jdk8 與 kotlin-stdlib 重複類別衝突 (AGP checkDebugDuplicateClasses)
"""
import os

def patch_android():
    # 1. 於 android/gradle.properties 啟用 AndroidX 與 Jetifier
    gradle_props = os.path.join("android", "gradle.properties")
    if os.path.exists(gradle_props):
        with open(gradle_props, "a", encoding="utf-8") as f:
            f.write("\nandroid.useAndroidX=true\nandroid.enableJetifier=true\n")
        print(f"Patched: {gradle_props}")

    # 2. 於根目錄 build.gradle 替換所有 kotlin-stdlib-jdk7/8 為統一的 kotlin-stdlib:1.8.22
    root_gradle = os.path.join("android", "build.gradle")
    if os.path.exists(root_gradle):
        with open(root_gradle, "a", encoding="utf-8") as f:
            f.write("""
allprojects {
    configurations.all {
        exclude group: 'org.jetbrains.kotlin', module: 'kotlin-stdlib-jdk7'
        exclude group: 'org.jetbrains.kotlin', module: 'kotlin-stdlib-jdk8'
        resolutionStrategy.eachDependency { details ->
            if (details.requested.group == 'org.jetbrains.kotlin' && details.requested.name.startsWith('kotlin-stdlib-jdk')) {
                details.useTarget('org.jetbrains.kotlin:kotlin-stdlib:1.8.22')
            }
        }
    }
}
""")
        print(f"Patched: {root_gradle}")

    # 3. 於 app/build.gradle 也加入相同解析策略
    app_gradle = os.path.join("android", "app", "build.gradle")
    if os.path.exists(app_gradle):
        with open(app_gradle, "a", encoding="utf-8") as f:
            f.write("""
configurations.all {
    exclude group: 'org.jetbrains.kotlin', module: 'kotlin-stdlib-jdk7'
    exclude group: 'org.jetbrains.kotlin', module: 'kotlin-stdlib-jdk8'
    resolutionStrategy.eachDependency { details ->
        if (details.requested.group == 'org.jetbrains.kotlin' && details.requested.name.startsWith('kotlin-stdlib-jdk')) {
            details.useTarget('org.jetbrains.kotlin:kotlin-stdlib:1.8.22')
        }
    }
}

dependencies {
    implementation(platform("org.jetbrains.kotlin:kotlin-bom:1.8.22"))
    constraints {
        implementation("org.jetbrains.kotlin:kotlin-stdlib-jdk7:1.8.22") {
            because("kotlin-stdlib-jdk7 is now part of kotlin-stdlib")
        }
        implementation("org.jetbrains.kotlin:kotlin-stdlib-jdk8:1.8.22") {
            because("kotlin-stdlib-jdk8 is now part of kotlin-stdlib")
        }
    }
}
""")
    # 4. 配置正式 Release 簽名 (自動啟用 v1 與 v2 簽名，解決現代 Android 無法安裝問題)
    keystore_src = "singstudio.keystore"
    keystore_dst = os.path.join("android", "app", "singstudio.keystore")
    if os.path.exists(keystore_src):
        import shutil
        shutil.copy2(keystore_src, keystore_dst)
        print(f"Copied keystore to: {keystore_dst}")

    if os.path.exists(app_gradle):
        with open(app_gradle, "r", encoding="utf-8") as f:
            content = f.read()

        signing_block = """
    signingConfigs {
        release {
            storeFile file('singstudio.keystore')
            storePassword '123456'
            keyAlias 'mykey'
            keyPassword '123456'
            v1SigningEnabled true
            v2SigningEnabled true
        }
    }
"""
        if "signingConfigs {" not in content:
            if "buildTypes {" in content:
                content = content.replace("buildTypes {", signing_block + "\n    buildTypes {")
                content = content.replace(
                    "release {\n            minifyEnabled false",
                    "release {\n            signingConfig signingConfigs.release\n            minifyEnabled false"
                )
                with open(app_gradle, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"Patched release signingConfig in: {app_gradle}")

    # 5. 同步版本號至 android/app/build.gradle (唯一讀取 package.json)
    pkg_file = "package.json"
    if not os.path.exists(pkg_file):
        pkg_file = os.path.join("singstudio-react", "package.json")

    if os.path.exists(pkg_file) and os.path.exists(app_gradle):
        import json
        import re
        try:
            with open(pkg_file, "r", encoding="utf-8") as f:
                pkg_data = json.load(f)
            ver_name = pkg_data.get("version", "1.0.0")
            parts = [int(p) for p in ver_name.split('.') if p.isdigit()]
            ver_code = parts[0] * 10000 + (parts[1] if len(parts) > 1 else 0) * 100 + (parts[2] if len(parts) > 2 else 0) if parts else 100
            with open(app_gradle, "r", encoding="utf-8") as f:
                c = f.read()
            c = re.sub(r'versionCode\s+\d+', f'versionCode {ver_code}', c)
            c = re.sub(r'versionName\s+"[^"]+"', f'versionName "{ver_name}"', c)
            with open(app_gradle, "w", encoding="utf-8") as f:
                f.write(c)
            print(f"Synced version to build.gradle from package.json: {ver_name} (code: {ver_code})")
        except Exception as e:
            print(f"Warning: Failed to sync version to build.gradle: {e}")

if __name__ == "__main__":
    patch_android()
