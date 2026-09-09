@echo off
echo Cleaning and Building Release APK...
call gradlew clean assembleRelease
if %ERRORLEVEL% EQU 0 (
    echo Release Build Successful! Opening output folder...
    start "" "app\build\outputs\apk\release\"
) else (
    echo Build Failed. Did you remember to configure your signingConfigs?
    pause
)
