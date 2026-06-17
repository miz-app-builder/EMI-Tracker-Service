import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet, DashboardSummary, EmiOrder } from "@/services/api";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

function fmt(n: number) {
  return "৳" + n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function StatusChip({ status, colors }: { status: string; colors: ReturnType<typeof useColors> }) {
  const bg =
    status === "active"
      ? colors.primaryLight
      : status === "completed"
      ? "#dcfce7"
      : status === "overdue"
      ? "#fee2e2"
      : colors.secondary;
  const fg =
    status === "active"
      ? colors.primary
      : status === "completed"
      ? "#16a34a"
      : status === "overdue"
      ? "#dc2626"
      : colors.mutedForeground;
  return (
    <View style={{ backgroundColor: bg, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text style={{ color: fg, fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" }}>
        {status}
      </Text>
    </View>
  );
}

function StatCard({
  label,
  value,
  icon,
  colors,
  accent,
}: {
  label: string;
  value: string | number;
  icon: string;
  colors: ReturnType<typeof useColors>;
  accent?: string;
}) {
  return (
    <View style={[statStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[statStyles.iconWrap, { backgroundColor: accent ? accent + "20" : colors.primaryLight }]}>
        <Feather name={icon as any} size={18} color={accent || colors.primary} />
      </View>
      <Text style={[statStyles.value, { color: colors.foreground }]}>{value}</Text>
      <Text style={[statStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    minWidth: 140,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  value: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const summaryQ = useQuery<DashboardSummary>({
    queryKey: ["dashboard-summary"],
    queryFn: () => apiGet("/api/dashboard/summary"),
  });

  const dueQ = useQuery<EmiOrder[]>({
    queryKey: ["dashboard-due"],
    queryFn: () => apiGet("/api/dashboard/due-this-month"),
  });

  const isRefreshing = summaryQ.isFetching || dueQ.isFetching;

  function onRefresh() {
    summaryQ.refetch();
    dueQ.refetch();
  }

  const s = useStyles(colors);
  const summary = summaryQ.data;
  const due = dueQ.data ?? [];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: Platform.OS === "web" ? 67 + 16 : insets.top + 16,
        paddingBottom: Platform.OS === "web" ? 34 + 90 : insets.bottom + 90,
        paddingHorizontal: 16,
        gap: 20,
      }}
      refreshControl={
        <RefreshControl refreshing={!!isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>{greeting},</Text>
          <Text style={s.name}>{firstName} 👋</Text>
        </View>
        <View style={s.logoCircle}>
          <Text style={s.logoText}>৳</Text>
        </View>
      </View>

      {/* Stats Grid */}
      {summaryQ.isLoading ? (
        <View style={{ height: 140, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <StatCard
              label="Active EMIs"
              value={summary?.totalActiveOrders ?? 0}
              icon="credit-card"
              colors={colors}
            />
            <StatCard
              label="Overdue"
              value={summary?.overdueOrders ?? 0}
              icon="alert-circle"
              colors={colors}
              accent={colors.destructive}
            />
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <StatCard
              label="Outstanding"
              value={fmt(summary?.totalDueAmount ?? 0)}
              icon="trending-up"
              colors={colors}
            />
            <StatCard
              label="This Month"
              value={fmt(summary?.thisMonthCollected ?? 0)}
              icon="check-circle"
              colors={colors}
              accent={colors.success}
            />
          </View>
        </>
      )}

      {/* Next Payment */}
      {summary?.nextPaymentDate && (
        <View style={[s.nextCard, { backgroundColor: colors.primaryLight }]}>
          <Feather name="calendar" size={18} color={colors.primary} />
          <Text style={[s.nextText, { color: colors.primary }]}>
            Next payment due: <Text style={{ fontFamily: "Inter_700Bold" }}>{fmtDate(summary.nextPaymentDate)}</Text>
          </Text>
        </View>
      )}

      {/* Due This Month */}
      <View>
        <Text style={s.sectionTitle}>Due This Month</Text>
        {dueQ.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
        ) : due.length === 0 ? (
          <View style={s.empty}>
            <Feather name="check-circle" size={32} color={colors.success} />
            <Text style={[s.emptyText, { color: colors.mutedForeground }]}>All caught up!</Text>
          </View>
        ) : (
          due.map((order) => (
            <Pressable
              key={order.id}
              style={({ pressed }) => [s.orderCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
              onPress={() => router.push(`/order/${order.id}`)}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[s.orderName, { color: colors.foreground }]} numberOfLines={1}>
                    {order.productName}
                  </Text>
                  <Text style={[s.orderShop, { color: colors.mutedForeground }]}>
                    {order.shopName ?? "Unknown shop"}
                  </Text>
                </View>
                <StatusChip status={order.status} colors={colors} />
              </View>
              <View style={[s.orderDivider, { backgroundColor: colors.border }]} />
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View>
                  <Text style={[s.orderMeta, { color: colors.mutedForeground }]}>Monthly</Text>
                  <Text style={[s.orderAmount, { color: colors.primary }]}>{fmt(order.monthlyAmount)}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[s.orderMeta, { color: colors.mutedForeground }]}>Due</Text>
                  <Text style={[s.orderDue, { color: colors.foreground }]}>{fmtDate(order.nextDueDate)}</Text>
                </View>
              </View>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function useStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    greeting: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    name: {
      fontSize: 24,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
    logoCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    logoText: {
      fontSize: 22,
      color: "#fff",
      fontFamily: "Inter_700Bold",
    },
    nextCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 12,
      borderRadius: colors.radius,
    },
    nextText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
    },
    sectionTitle: {
      fontSize: 17,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      marginBottom: 12,
    },
    orderCard: {
      borderRadius: colors.radius,
      borderWidth: 1,
      padding: 14,
      marginBottom: 10,
    },
    orderName: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
    },
    orderShop: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      marginTop: 2,
    },
    orderDivider: {
      height: 1,
      marginVertical: 10,
    },
    orderMeta: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      marginBottom: 2,
    },
    orderAmount: {
      fontSize: 16,
      fontFamily: "Inter_700Bold",
    },
    orderDue: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
    },
    empty: {
      alignItems: "center",
      paddingVertical: 32,
      gap: 8,
    },
    emptyText: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
    },
  });
}
