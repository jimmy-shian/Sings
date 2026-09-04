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
        print(f"Patched: {app_gradle}")

if __name__ == "__main__":
    patch_android()
