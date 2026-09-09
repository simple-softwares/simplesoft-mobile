@echo off
echo Building Debug APK...
call gradlew assembleDebug
if %ERRORLEVEL% EQU 0 (
    echo Build Successful! Opening output folder...
    start "" "app\build\outputs\apk\debug\"
) else (
    echo Build Failed. Check the logs above.
    pause
)
