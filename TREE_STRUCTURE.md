# White Heart Driver App - Project Tree Structure

```
white-heart-driver/
├── 📱 App Source Code
│   ├── app/                                    # Expo Router app directory
│   │   ├── (tabs)/                            # Tab navigation group
│   │   │   ├── _layout.tsx                    # Tab layout configuration
│   │   │   ├── index.tsx                      # Live orders screen (main)
│   │   │   ├── index.web.tsx                  # Web-specific orders screen
│   │   │   ├── messaging.tsx                  # Driver group messaging
│   │   │   ├── navigation.tsx                 # Trip navigation & GPS tracking
│   │   │   ├── navigation.web.tsx             # Web navigation screen
│   │   │   └── settings.tsx                   # Driver settings & preferences
│   │   ├── auth/                              # Authentication screens
│   │   │   ├── login.tsx                      # Driver login with OTP
│   │   │   └── register.tsx                   # Driver registration form
│   │   ├── _layout.tsx                        # Root app layout
│   │   ├── index.tsx                          # App entry point & auth check
│   │   ├── profile.tsx                        # Driver profile management
│   │   ├── +not-found.tsx                     # 404 error screen
│   │   └── [orderId].tsx                      # Dynamic order details (legacy)
│   │
│   ├── components/                            # Reusable UI components
│   │   ├── DemandModal.tsx                    # Fare demand adjustment modal
│   │   ├── DropoffDialog.tsx                  # Trip completion dialog
│   │   ├── GroupMemberModal.tsx               # Group member management
│   │   └── GroupMessageSender.tsx             # Group messaging component
│   │
│   ├── contexts/                              # React Context providers
│   │   └── LanguageContext.tsx                # Bilingual support (EN/MY)
│   │
│   └── hooks/                                 # Custom React hooks
│       └── useFrameworkReady.ts               # Framework initialization
│
├── 🎨 Assets & Resources
│   └── assets/
│       └── images/                            # App icons and images
│           ├── icon.png                       # Main app icon
│           ├── adaptive-icon.png              # Android adaptive icon
│           ├── splash.png                     # Splash screen image
│           ├── favicon.png                    # Web favicon
│           ├── car-marker.png                 # Map car marker
│           ├── AppIcon.psd                    # Icon source file
│           └── splash.psd                     # Splash source file
│
├── 🤖 Android Configuration
│   └── android/
│       ├── app/
│       │   ├── build.gradle                   # Android build configuration
│       │   ├── proguard-rules.pro             # Code obfuscation rules
│       │   ├── debug.keystore                 # Debug signing key
│       │   └── src/
│       │       ├── debug/
│       │       │   └── AndroidManifest.xml    # Debug manifest
│       │       └── main/
│       │           ├── AndroidManifest.xml    # Main app manifest
│       │           ├── java/com/whiteheart/driver/
│       │           │   ├── MainActivity.kt    # Main activity
│       │           │   └── MainApplication.kt # App initialization
│       │           └── res/                   # Android resources
│       │               ├── drawable*/         # Drawable resources (all densities)
│       │               ├── mipmap*/          # App icons (all densities)
│       │               ├── values/           # String & color values
│       │               └── values-night/     # Dark theme values
│       ├── build.gradle                       # Project build config
│       ├── gradle.properties                  # Gradle properties
│       ├── settings.gradle                    # Project settings
│       ├── gradlew                           # Gradle wrapper (Unix)
│       ├── gradlew.bat                       # Gradle wrapper (Windows)
│       └── gradle/wrapper/                    # Gradle wrapper files
│           └── gradle-wrapper.properties      # Wrapper configuration
│
├── 🍎 iOS Configuration
│   └── ios/
│       ├── WhiteHeartDev.xcodeproj/
│       │   ├── project.pbxproj                # Xcode project file
│       │   └── xcshareddata/xcschemes/        # Shared Xcode schemes
│       │       └── WhiteHeartDev.xcscheme     # Main app scheme
│       ├── WhiteHeartDev/
│       │   ├── AppDelegate.swift              # iOS app delegate
│       │   ├── Info.plist                     # iOS app configuration
│       │   ├── WhiteHeartDev.entitlements     # App entitlements
│       │   ├── WhiteHeartDev-Bridging-Header.h # Swift-ObjC bridge
│       │   ├── Images.xcassets/               # iOS image assets
│       │   │   ├── AppIcon.appiconset/        # App icon set
│       │   │   ├── SplashScreenLogo.imageset/ # Splash screen images
│       │   │   └── SplashScreenBackground.colorset/ # Splash colors
│       │   ├── SplashScreen.storyboard        # iOS splash screen
│       │   └── Supporting/                    # Supporting files
│       │       └── Expo.plist                 # Expo configuration
│       ├── Podfile                           # CocoaPods dependencies
│       ├── Podfile.properties.json           # Pod configuration
│       └── .xcode.env                        # Xcode environment
│
├── 📚 Documentation
│   └── docs/
│       ├── ORDER_MANAGEMENT_SPECIFICATION.md  # Order system specs
│       └── USER_FLOW_SPECIFICATION.md         # User experience flows
│
├── ⚙️ Configuration Files
│   ├── app.config.js                         # Expo app configuration
│   ├── eas.json                              # EAS Build configuration
│   ├── package.json                          # Dependencies & scripts
│   ├── tsconfig.json                         # TypeScript configuration
│   ├── .prettierrc                           # Code formatting rules
│   ├── .npmrc                                # NPM configuration
│   └── .evn                                  # Environment variables
│
├── 📖 Project Documentation
│   ├── README.md                             # Project overview & setup
│   ├── PASSENGER_APP_SPECIFICATION.md        # Passenger app specs
│   └── PROJECT_STRUCTURE.md                  # Detailed structure guide
│
└── 🔧 Development Tools
    ├── expo-env.d.ts                         # Expo TypeScript definitions
    └── .bolt/config.json                     # Bolt configuration
```

## 📊 File Count Summary

### 📁 **By Category**
```
📱 App Source Code:        15 files
🎨 Assets:                 6 files  
🤖 Android Config:         25+ files
🍎 iOS Config:             15+ files
📚 Documentation:          4 files
⚙️ Configuration:          7 files
🔧 Development Tools:      2 files
```

### 📱 **App Source Breakdown**
```
app/
├── (tabs)/               6 files (main app screens)
├── auth/                 2 files (login/register)
├── root files            4 files (layouts, entry, profile)
components/               4 files (reusable UI)
contexts/                 1 file  (language support)
hooks/                    1 file  (framework init)
```

### 🎯 **Key Features Implemented**
- ✅ **Live Order Management** - Real-time order feed with visibility timers
- ✅ **Driver Navigation** - GPS tracking with map integration  
- ✅ **Group Messaging** - Driver communication system
- ✅ **Bilingual Support** - English/Myanmar localization
- ✅ **Authentication** - OTP-based login/registration
- ✅ **Profile Management** - Driver profile and settings
- ✅ **Cross-Platform** - iOS, Android, and Web support

### 🛠 **Technology Stack**
- **Framework**: React Native with Expo SDK 53
- **Navigation**: Expo Router with tab-based layout
- **Maps**: React Native Maps with Google Maps integration
- **State Management**: React Context + useState hooks
- **Styling**: StyleSheet.create (no external CSS frameworks)
- **Icons**: Lucide React Native icon library
- **Build System**: EAS Build for production deployments

This structure follows Expo Router best practices with clear separation of concerns, comprehensive platform support, and production-ready configuration for a professional taxi driver application.