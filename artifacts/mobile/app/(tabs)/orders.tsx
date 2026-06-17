import { useColors } from "@/hooks/useColors";
import { apiGet, EmiOrder } from "@/services/api";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

function fmt(n: number) {
  return "৳" + n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

type Filter = "all" | "active" | "completed" | "overdue";

function StatusChip({ status, colors }: { status: string; colors: ReturnType<typeof useColors> }) {
  const bg =
    status === "active" ? colors.primaryLight :
    status === "completed" ? "#dcfce7" :
    status === "overdue" ? "#fee2e2" : colors.secondary;
  const fg =
    status === "active" ? colors.primary :
    status === "completed" ? "#16a34a" :
    status === "overdue" ? "#dc2626" : colors.mutedForeground;
  return (
    <View style={{ backgroundColor: bg, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text style={{ color: fg, fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" }}>
        {status}
      </Text>
    </View>
  );
}

function OrderCard({ order, colors, onPress }: { order: EmiOrder; colors: ReturnType<typeof useColors>; onPress: () => void }) {
  const progress = order.totalPrice > 0 ? Math.min(order.totalPaid / order.totalPrice, 1) : 0;
  return (
    <Pressable
      style={({ pressed }) => [styles(colors).card, { opacity: pressed ? 0.85 : 1 }]}
      onPress={onPress}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles(colors).productName} numberOfLines={1}>{order.productName}</Text>
          <Text style={styles(colors).shopName}>{order.shopName ?? "—"}</Text>
        </View>
        <StatusChip status={order.status} colors={colors} />
      </View>

      {/* Progress bar */}
      <View style={[styles(colors).progressBg]}>
        <View style={[styles(colors).progressFill, { width: `${progress * 100}%` as any }]} />
      </View>
      <Text style={styles(colors).progressText}>
        {order.installmentsPaid}/{order.emiMonths} installments paid
      </Text>

      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
        <View>
          <Text style={styles(colors).metaLabel}>Monthly</Text>
          <Text style={styles(colors).amount}>{fmt(order.monthlyAmount)}</Text>
        </View>
        <View>
          <Text style={styles(colors).metaLabel}>Remaining</Text>
          <Text style={[styles(colors).amount, { color: colors.foreground }]}>{fmt(order.remainingAmount)}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles(colors).metaLabel}>Next Due</Text>
          <Text style={styles(colors).dueDate}>{fmtDate(order.nextDueDate)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "overdue", label: "Overdue" },
];

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const q = useQuery<EmiOrder[]>({
    queryKey: ["emi-orders"],
    queryFn: () => apiGet("/api/emi-orders"),
  });

  const filtered = useMemo(() => {
    const orders = q.data ?? [];
    return orders.filter((o) => {
      const matchSearch =
        !search ||
        o.productName.toLowerCase().includes(search.toLowerCase()) ||
        (o.shopName ?? "").toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === "all" || o.status === filter;
      return matchSearch && matchFilter;
    });
  }, [q.data, search, filter]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Search */}
      <View
        style={{
          paddingTop: Platform.OS === "web" ? 67 + 12 : insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: 8,
          backgroundColor: colors.background,
          gap: 10,
        }}
      >
        <View style={[searchStyles(colors).wrap]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={searchStyles(colors).input}
            placeholder="Search EMI orders..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {/* Filter tabs */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[
                filterStyles(colors).tab,
                filter === f.key && filterStyles(colors).tabActive,
              ]}
            >
              <Text
                style={[
                  filterStyles(colors).tabText,
                  filter === f.key && filterStyles(colors).tabTextActive,
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {q.isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          scrollEnabled={!!filtered.length}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              colors={colors}
              onPress={() => router.push(`/order/${item.id}`)}
            />
          )}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: Platform.OS === "web" ? 34 + 90 : insets.bottom + 90,
            paddingTop: 4,
            gap: 10,
          }}
          refreshControl={
            <RefreshControl
              refreshing={!!q.isFetching}
              onRefresh={() => q.refetch()}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingVertical: 64, gap: 10 }}>
              <Feather name="credit-card" size={36} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 15 }}>
                {search || filter !== "all" ? "No matching orders" : "No EMI orders yet"}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
    },
    productName: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    shopName: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: 2,
    },
    progressBg: {
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      marginTop: 12,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%" as any,
      backgroundColor: colors.primary,
      borderRadius: 2,
    },
    progressText: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: 4,
    },
    metaLabel: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginBottom: 2,
    },
    amount: {
      fontSize: 15,
      fontFamily: "Inter_700Bold",
      color: colors.primary,
    },
    dueDate: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
  });

const searchStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    wrap: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
      paddingHorizontal: 12,
      height: 44,
      gap: 8,
    },
    input: {
      flex: 1,
      fontSize: 14,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
    },
  });

const filterStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    tab: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.secondary,
    },
    tabActive: {
      backgroundColor: colors.primary,
    },
    tabText: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
    },
    tabTextActive: {
      color: "#fff",
    },
  });
