import { demoCustomer } from "@fatguydiscounts/db";
import { View, Text } from "react-native";

export default function MobileLogin() {
  return (
    <View style={{ flex: 1, backgroundColor: "#f7f1e8", padding: 24, justifyContent: "center", gap: 12 }}>
      <Text style={{ fontSize: 30, fontWeight: "700", color: "#1f1d1a" }}>Login</Text>
      <Text style={{ color: "#6d655d", fontSize: 16 }}>
        Future Supabase auth screen for email verification and password reset.
      </Text>
      <Text style={{ color: "#8e3200" }}>Demo account: {demoCustomer.email}</Text>
    </View>
  );
}

