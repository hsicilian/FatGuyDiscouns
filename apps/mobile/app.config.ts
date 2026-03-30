export default {
  expo: {
    name: "Fatguydiscounts",
    slug: "fatguydiscounts",
    scheme: "fatguydiscounts",
    version: "0.1.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    experiments: {
      typedRoutes: true
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.fatguydiscounts.app"
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#f7f1e8"
      },
      package: "com.fatguydiscounts.app"
    },
    extra: {
      eas: {
        projectId: "replace-with-eas-project-id"
      }
    },
    web: {
      bundler: "metro"
    },
    plugins: ["expo-router"]
  }
};

