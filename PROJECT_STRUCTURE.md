# White Heart Driver App - Project Structure

```
white-heart-driver/
├── 📱 App Source Code
│   ├── app/                           # Expo Router app directory
│   │   ├── (tabs)/                    # Tab navigation group
│   │   │   ├── _layout.tsx           # Tab layout configuration
│   │   │   ├── index.tsx             # Orders screen (main)
│   │   │   ├── index.web.tsx         # Web-specific orders screen
│   │   │   ├── messaging.tsx         # Driver group messaging
│   │   │   ├── navigation.tsx        # Trip navigation & tracking
│   │   │   ├── navigation.web.tsx    # Web navigation screen
│   │   │   └── settings.tsx          # Driver settings
│   │   ├── auth/                     # Authentication screens
│   │   │   ├── login.tsx            # Driver login with OTP
│   │   │   └── register.tsx         # Driver registration
│   │   ├── _layout.tsx              # Root app layout
│   │   ├── index.tsx                # App entry point
│   │   ├── profile.tsx              # Driver profile management
│   │   ├── +not-found.tsx           # 404 error screen
│   │   └── [orderId].tsx            # Dynamic order details
│   │
│   ├── components/                   # Reusable UI components
│   │   ├── DemandModal.tsx          # Fare demand adjustment
│   │   ├── DropoffDialog.tsx        # Trip completion dialog
│   │   ├── GroupMemberModal.tsx     # Group member management
│   │   └── GroupMessageSender.tsx   # Group messaging component
│   │
│   ├── contexts/                    # React Context providers
│   │   └── LanguageContext.tsx      # Bilingual support (EN/MY)
│   │
│   └── hooks/                       # Custom React hooks
│       └── useFrameworkReady.ts     # Framework initialization
│
├── 🎨 Assets & Resources
│   └── assets/
│       └── images/                  # App icons and images
│           ├── icon.png            # App icon
│           ├── adaptive-icon.png   # Android adaptive icon
│           ├── splash.png          # Splash screen
│           ├── favicon.png         # Web favicon
│           ├── car-marker.png      # Map car marker
│           ├── AppIcon.psd         # Icon source file
│           └── splash.psd          # Splash source file
│
├── 🤖 Android Configuration
│   └── android/
│       ├── app/
│       │   ├── build.gradle        # Android build configuration
│       │   ├── proguard-rules.pro  # Code obfuscation rules
│       │   └── src/
│       │       ├── debug/
│       │       │   └── AndroidManifest.xml  # Debug manifest
│       │       └── main/
│       │           ├── AndroidManifest.xml  # Main manifest
│       │           ├── java/com/whiteheart/driver/
│       │           │   ├── MainActivity.kt      # Main activity
│       │           │   └── MainApplication.kt   # App initialization
│       │           └── res/                     # Android resources
│       │               ├── drawable/            # Drawable resources
│       │               ├── mipmap-*/           # App icons (all densities)
│       │               ├── values/             # String & color values
│       │               └── values-night/       # Dark theme values
│       ├── build.gradle            # Project build config
│       ├── gradle.properties       # Gradle properties
│       ├── settings.gradle         # Project settings
│       └── gradle/wrapper/         # Gradle wrapper
│
├── 🍎 iOS Configuration
│   └── ios/
│       ├── WhiteHeartDev.xcodeproj/
│       │   ├── project.pbxproj     # Xcode project file
│       │   └── xcshareddata/       # Shared Xcode schemes
│       ├── WhiteHeartDev/
│       │   ├── AppDelegate.swift   # iOS app delegate
│       │   ├── Info.plist         # iOS app configuration
│       │   ├── Images.xcassets/   # iOS image assets
│       │   ├── SplashScreen.storyboard  # iOS splash screen
│       │   ├── Supporting/        # Supporting files
│       │   └── WhiteHeartDev-Bridging-Header.h
│       ├── Podfile                # CocoaPods dependencies
│       ├── Podfile.properties.json # Pod configuration
│       └── .xcode.env             # Xcode environment
│
├── 📚 Documentation
│   └── docs/
│       ├── ORDER_MANAGEMENT_SPECIFICATION.md    # Order system specs
│       └── USER_FLOW_SPECIFICATION.md          # User experience flows
│
├── ⚙️ Configuration Files
│   ├── app.config.js              # Expo app configuration
│   ├── eas.json                   # EAS Build configuration
│   ├── package.json               # Dependencies & scripts
│   ├── tsconfig.json              # TypeScript configuration
│   ├── .prettierrc                # Code formatting rules
│   ├── .npmrc                     # NPM configuration
│   └── .evn                       # Environment variables
│
├── 📖 Project Documentation
│   ├── README.md                  # Project overview & setup
│   └── PASSENGER_APP_SPECIFICATION.md  # Passenger app specs
│
└── 🔧 Development Tools
    ├── expo-env.d.ts              # Expo TypeScript definitions
    └── hooks/useFrameworkReady.ts # Framework initialization hook
```

## 📊 Project Statistics

### 📁 **Directory Breakdown**
- **App Source**: 15 TypeScript/TSX files
- **Components**: 4 reusable UI components
- **Android Config**: 25+ configuration files
- **iOS Config**: 15+ configuration files
- **Documentation**: 4 specification documents

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
- **Maps**: React Native Maps with Google Maps
- **State Management**: React Context + useState
- **Styling**: StyleSheet.create (no external CSS frameworks)
- **Icons**: Lucide React Native
- **Build System**: EAS Build for production deployments

### 📱 **Platform Support**
- **iOS**: Native iOS app with Xcode project
- **Android**: Native Android app with Gradle build
- **Web**: Progressive web app with responsive design
- **Development**: Expo Dev Client for testing

This structure follows Expo Router best practices with clear separation of concerns, comprehensive platform support, and production-ready configuration for a professional taxi driver application.