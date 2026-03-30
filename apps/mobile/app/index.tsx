import { Link } from "expo-router";
import { View, Text } from "react-native";

export default function MobileIndex() {
  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#f7f1e8", gap: 12 }}>
      <Text style={{ fontSize: 32, fontWeight: "700", color: "#1f1d1a" }}>Fatguydiscounts mobile</Text>
      <Text style={{ fontSize: 16, color: "#6d655d" }}>
        Expo navigation scaffold connected to the shared monorepo packages.
      </Text>
      <Link href="/login" style={{ color: "#bb4d00", fontSize: 16 }}>Go to login</Link>
      <Link href="/(app)/dashboard" style={{ color: "#bb4d00", fontSize: 16 }}>Open dashboard scaffold</Link>
    </View>
  );
}

