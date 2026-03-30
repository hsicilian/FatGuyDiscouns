import { demoCustomer } from "@fatguydiscounts/db";
import { View, Text } from "react-native";

export default function MobileProfile() {
  return (
    <View style={{ flex: 1, backgroundColor: "#f7f1e8", padding: 24, gap: 10 }}>
      <Text style={{ fontSize: 30, fontWeight: "700", color: "#1f1d1a" }}>Profile</Text>
      <Text style={{ color: "#6d655d" }}>{demoCustomer.email}</Text>
      <Text style={{ color: "#6d655d" }}>{demoCustomer.address}</Text>
      <Text style={{ color: "#6d655d" }}>{demoCustomer.timezone}</Text>
    </View>
  );
}

