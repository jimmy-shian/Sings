#!/usr/bin/env python3
"""Keep Android environment and package version in sync without appending Gradle blocks."""
import json
import re
from pathlib import Path


def patch_android():
    properties = Path('android/gradle.properties')
    text = properties.read_text(encoding='utf-8')
    for key, value in [('android.useAndroidX', 'true'), ('android.enableJetifier', 'false')]:
        text = re.sub(r'^' + re.escape(key) + r'=.*\n?', '', text, flags=re.M)
        text += f'\n{key}={value}\n'
    properties.write_text(text, encoding='utf-8')
    version = json.loads(Path('package.json').read_text(encoding='utf-8'))['version']
    major, minor, patch = (int(value) for value in version.split('.'))
    app_gradle = Path('android/app/build.gradle')
    text = app_gradle.read_text(encoding='utf-8')
    text = re.sub(r'versionCode\s+\d+', f'versionCode {major * 10000 + minor * 100 + patch}', text)
    text = re.sub(r'versionName\s+"[^"]+"', f'versionName "{version}"', text)
    app_gradle.write_text(text, encoding='utf-8')
    print(f'Android version synchronized: {version}')


if __name__ == '__main__':
    patch_android()
