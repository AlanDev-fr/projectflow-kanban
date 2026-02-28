import 'dotenv/config';

export default {
  expo: {
    name: "ProjectFlow",
    slug: "gestor-proyectos",
    owner: "alandev-fr",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon-build.png",
    scheme: "gestor-proyectos",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.gestorproyectos.app",
      icon: "./assets/images/icon-build.png",
      googleServicesFile: "./GoogleService-Info.plist",
      infoPlist: {
        UIBackgroundModes: ["remote-notification"]
      },
      config: {
        googleSignIn: {
          reservedClientId: "com.googleusercontent.apps.377103054938-osu86ke0d0sn6oa40qp3sbu42b06m95p"
        }
      }
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#FFFFFF",
        foregroundImage: "./assets/images/icon-build.png"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.gestorproyectos.app",
      googleServicesFile: "./google-services.json",
      permissions: [
        "android.permission.POST_NOTIFICATIONS",
        "android.permission.SCHEDULE_EXACT_ALARM",
        "android.permission.USE_EXACT_ALARM"
      ],
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "projectflow",
              host: "oauth",
              pathPrefix: "/callback"
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    web: {
      output: "single",
      favicon: "./assets/images/icon.png"
    },
    plugins: [
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#4A90E2",
          dark: {
            backgroundColor: "#1F2123"
          }
        }
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/images/notification-icon.png",
          color: "#4A90E2",
          sounds: ["./assets/sounds/notification_sound.wav"],
          mode: "production"
        }
      ],
      "expo-web-browser",
      "@react-native-google-signin/google-signin"
    ],
    experiments: {
      reactCompiler: true
    },
    extra: {
      "eas": {
        "projectId": "9b1ec055-60c2-4105-a3fc-920da623e3f4"
      },
      firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      githubClientId: process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID,
      githubRedirectUri: process.env.EXPO_PUBLIC_GITHUB_REDIRECT_URI,
      githubCloudFunctionUrl: process.env.EXPO_PUBLIC_GITHUB_CLOUD_FUNCTION_URL,
    }
  }
};