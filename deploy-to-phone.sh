#!/bin/bash
# deploy-to-phone.sh — Build, archive, and deploy an iOS app to TestFlight
# Place this in any build folder, or agents can run it after finishing a build.
#
# Usage: ./deploy-to-phone.sh
#
# What it does:
# 1. Finds the .xcodeproj in this directory
# 2. Builds and archives it
# 3. Exports the IPA
# 4. Uploads to App Store Connect via xcrun altool
# 5. Saves the TestFlight URL to TESTFLIGHT_URL file
# 6. The scanner picks it up and shows QR in Mission Control
#
# Requirements:
# - Valid Apple Developer account configured in Xcode
# - Signing certificates and provisioning profiles set up
# - App registered in App Store Connect

set -e

BUILD_DIR=$(pwd)
APP_NAME=$(basename "$BUILD_DIR" | sed 's/-research//' | sed 's/-brand//' | sed 's/-brief//')

echo "🔨 Building $APP_NAME..."

# Find xcodeproj
XCODEPROJ=$(find . -maxdepth 2 -name "*.xcodeproj" | head -1)
if [ -z "$XCODEPROJ" ]; then
    echo "❌ No .xcodeproj found in $BUILD_DIR"
    echo "   Ivy needs to create the Xcode project first."
    exit 1
fi

SCHEME=$(xcodebuild -project "$XCODEPROJ" -list 2>/dev/null | grep -A 100 "Schemes:" | tail -n +2 | head -1 | xargs)
if [ -z "$SCHEME" ]; then
    SCHEME="$APP_NAME"
fi

echo "📦 Project: $XCODEPROJ"
echo "🎯 Scheme: $SCHEME"

# Create build output directory
mkdir -p ./build-output

# Step 1: Build and archive
echo ""
echo "Step 1/4: Archiving..."
xcodebuild archive \
    -project "$XCODEPROJ" \
    -scheme "$SCHEME" \
    -archivePath "./build-output/$APP_NAME.xcarchive" \
    -destination "generic/platform=iOS" \
    CODE_SIGN_IDENTITY=- \
    2>&1 | tail -5

if [ ! -d "./build-output/$APP_NAME.xcarchive" ]; then
    echo "❌ Archive failed. Check build errors above."
    exit 1
fi

echo "✅ Archive created"

# Step 2: Export IPA
echo ""
echo "Step 2/4: Exporting IPA..."

# Create export options plist
cat > ./build-output/ExportOptions.plist << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store-connect</string>
    <key>destination</key>
    <string>upload</string>
    <key>signingStyle</key>
    <string>automatic</string>
</dict>
</plist>
PLIST

xcodebuild -exportArchive \
    -archivePath "./build-output/$APP_NAME.xcarchive" \
    -exportOptionsPlist "./build-output/ExportOptions.plist" \
    -exportPath "./build-output/ipa" \
    2>&1 | tail -5

echo "✅ IPA exported"

# Step 3: Upload to App Store Connect
echo ""
echo "Step 3/4: Uploading to TestFlight..."
IPA_FILE=$(find ./build-output/ipa -name "*.ipa" | head -1)

if [ -z "$IPA_FILE" ]; then
    echo "❌ No IPA file found. Export may have failed."
    exit 1
fi

xcrun altool --upload-app \
    --type ios \
    --file "$IPA_FILE" \
    --apiKey "$APP_STORE_API_KEY" \
    --apiIssuer "$APP_STORE_API_ISSUER" \
    2>&1 | tail -5

echo "✅ Uploaded to App Store Connect"

# Step 4: Save TestFlight info
echo ""
echo "Step 4/4: Saving TestFlight info..."
echo "https://testflight.apple.com/join/PENDING" > ./TESTFLIGHT_URL
echo "Upload complete. TestFlight processing..."
echo ""
echo "⏳ App Store Connect takes ~15 minutes to process the build."
echo "   Once processed, update TESTFLIGHT_URL with the actual join link."
echo "   Then run: python3 ~/antigravity/scratch/mission-control/scan-factory.py"
echo "   The QR code will auto-appear in Mission Control for Tammy to scan!"
echo ""
echo "🎉 Done! Waiting for TestFlight processing..."
