import { Link } from "expo-router";
import { demoBalanceCycle, demoCustomer } from "@fatguydiscounts/db";
import { applyPaymentToBalance, calculateBalanceDue } from "@fatguydiscounts/core";
import { getMobileSessionPreview } from "../../lib/auth";
import { View, Text } from "react-native";

export default async function MobileDashboard() {
  const session = await getMobileSessionPreview();
  const due = calculateBalanceDue(demoBalanceCycle);
  const preview = applyPaymentToBalance(due, 20, demoCustomer.creditBalance);

  return (
    <View style={{ flex: 1, backgroundColor: "#f7f1e8", padding: 24, gap: 14 }}>
      <Text style={{ fontSize: 30, fontWeight: "700", color: "#1f1d1a" }}>Dashboard</Text>
      <Text style={{ color: "#6d655d" }}>Signed in as: {session.email}</Text>
      <Text style={{ color: "#6d655d" }}>Customer: {demoCustomer.displayName}</Text>
      <Text style={{ color: "#6d655d" }}>Amount due: ${due.toFixed(2)}</Text>
      <Text style={{ color: "#6d655d" }}>Due date: {demoBalanceCycle.dueDate}</Text>
      <Text style={{ color: preview.paidInFull ? "#2f5d32" : "#8e3200" }}>
        Payment preview after credit: ${Math.max(preview.remaining, 0).toFixed(2)} remaining
      </Text>
      <Link href="/(app)/profile" style={{ color: "#bb4d00", fontSize: 16 }}>View profile</Link>
    </View>
  );
}

