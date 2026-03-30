import { demoProducts } from "@fatguydiscounts/db";
import { View, Text } from "react-native";

export default function MobileProducts() {
  return (
    <View style={{ flex: 1, backgroundColor: "#f7f1e8", padding: 24, gap: 10 }}>
      <Text style={{ fontSize: 30, fontWeight: "700", color: "#1f1d1a" }}>Products</Text>
      {demoProducts.map((product) => (
        <Text key={product.id} style={{ color: "#6d655d" }}>
          {product.title} · ${product.price.toFixed(2)}
        </Text>
      ))}
    </View>
  );
}

