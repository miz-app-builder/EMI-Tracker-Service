import { useColors } from "@/hooks/useColors";
import { apiDelete, apiGet, apiPost, EmiOrderDetail, EmiPayment } from "@/services/api";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

function fmt(n: number) {
  return "৳" + n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

type PaymentMethod = "cash" | "bank_transfer" | "mobile_banking" | "card";

const PAYMENT_METHODS: { key: PaymentMethod; label: string }[] = [
  { key: "cash", label: "Cash" },
  { key: "bank_transfer", label: "Bank Transfer" },
  { key: "mobile_banking", label: "Mobile Banking" },
  { key: "card", label: "Card" },
];

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
    <View style={{ backgroundColor: bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
      <Text style={{ color: fg, fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" }}>
        {status}
      </Text>
    </View>
  );
}

function RecordPaymentModal({
  visible,
  onClose,
  orderId,
  suggestedAmount,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  orderId: number;
  suggestedAmount: number;
  colors: ReturnType<typeof useColors>;
}) {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [amount, setAmount] = useState(String(Math.round(suggestedAmount)));
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [notes, setNotes] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  const mutation = useMutation({
    mutationFn: (data: { amount: number; paymentDate: string; paymentMethod: string; notes?: string }) =>
      apiPost(`/api/emi-orders/${orderId}/payments`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emi-order", orderId] });
      qc.invalidateQueries({ queryKey: ["emi-orders"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    },
    onError: (e: any) => Alert.alert("Error", e.message || "Payment failed"),
  });

  const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "#00000060", justifyContent: "flex-end" },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: insets.bottom + 24,
      gap: 16,
    },
    title: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground },
    label: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 6 },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
      paddingHorizontal: 14,
      height: 48,
      fontSize: 15,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
    },
    row: { flexDirection: "row", gap: 8 },
    methodBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.secondary,
      alignItems: "center",
    },
    methodBtnActive: { backgroundColor: colors.primary },
    methodText: { fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
    methodTextActive: { color: "#fff" },
    btn: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      height: 50,
      alignItems: "center",
      justifyContent: "center",
    },
    btnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
    close: { position: "absolute", top: 20, right: 20 },
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={s.sheet}>
          <Pressable style={s.close} onPress={onClose}>
            <Feather name="x" size={22} color={colors.mutedForeground} />
          </Pressable>
          <Text style={s.title}>Record Payment</Text>

          <View>
            <Text style={s.label}>Amount (৳)</Text>
            <TextInput
              style={s.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>

          <View>
            <Text style={s.label}>Payment Method</Text>
            <View style={s.row}>
              {PAYMENT_METHODS.map((m) => (
                <Pressable
                  key={m.key}
                  style={[s.methodBtn, method === m.key && s.methodBtnActive]}
                  onPress={() => setMethod(m.key)}
                >
                  <Text style={[s.methodText, method === m.key && s.methodTextActive]}>
                    {m.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View>
            <Text style={s.label}>Notes (optional)</Text>
            <TextInput
              style={s.input}
              value={notes}
              onChangeText={setNotes}
              placeholder="Transaction ID, bank, etc."
              placeholderTextColor={colors.mutedForeground}
            />
          </View>

          <Pressable
            style={({ pressed }) => [s.btn, { opacity: pressed || mutation.isPending ? 0.8 : 1 }]}
            onPress={() => {
              const amt = parseFloat(amount);
              if (!amt || amt <= 0) { Alert.alert("Error", "Enter a valid amount"); return; }
              mutation.mutate({ amount: amt, paymentDate: today, paymentMethod: method, notes: notes || undefined });
            }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Record Payment</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = parseInt(id ?? "0", 10);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [payModal, setPayModal] = useState(false);

  const q = useQuery<EmiOrderDetail>({
    queryKey: ["emi-order", orderId],
    queryFn: () => apiGet(`/api/emi-orders/${orderId}`),
    enabled: !!orderId,
  });

  const deletePayment = useMutation({
    mutationFn: (paymentId: number) => apiDelete(`/api/payments/${paymentId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emi-order", orderId] });
      qc.invalidateQueries({ queryKey: ["emi-orders"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  function handleDeletePayment(p: EmiPayment) {
    Alert.alert("Delete Payment", `Delete ৳${p.amount} payment?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deletePayment.mutate(p.id),
      },
    ]);
  }

  const s = styles(colors);
  const order = q.data;

  if (q.isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <Text style={{ color: colors.mutedForeground }}>Order not found</Text>
      </View>
    );
  }

  const progress = order.totalPrice > 0 ? Math.min(order.totalPaid / order.totalPrice, 1) : 0;

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          paddingBottom: Platform.OS === "web" ? 34 + 90 : insets.bottom + 90,
          gap: 16,
        }}
        refreshControl={
          <RefreshControl refreshing={!!q.isFetching} onRefresh={() => q.refetch()} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header card */}
        <View style={[s.headerCard, { backgroundColor: colors.primary }]}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </Pressable>
          <View style={{ paddingTop: insets.top + 48, paddingHorizontal: 20, paddingBottom: 24 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={s.productName}>{order.productName}</Text>
                <Text style={s.shopName}>{order.shopName ?? "—"}</Text>
              </View>
              <StatusChip status={order.status} colors={{ ...colors, primaryLight: "#ffffff30", primary: "#fff" }} />
            </View>

            {/* Progress */}
            <View style={s.progressBg}>
              <View style={[s.progressFill, { width: `${progress * 100}%` as any }]} />
            </View>
            <Text style={s.progressText}>
              {order.installmentsPaid} of {order.emiMonths} installments paid
            </Text>
          </View>
        </View>

        {/* Financial summary */}
        <View style={{ paddingHorizontal: 16 }}>
          <View style={s.card}>
            <FinRow label="Total Price" value={fmt(order.totalPrice)} colors={colors} />
            {order.discount > 0 && <FinRow label="Discount" value={`-${fmt(order.discount)}`} colors={colors} />}
            <FinRow label="Down Payment" value={fmt(order.downPayment)} colors={colors} />
            <FinRow label="Monthly Installment" value={fmt(order.monthlyAmount)} colors={colors} highlight />
            <FinRow label="Total Paid" value={fmt(order.totalPaid)} colors={colors} />
            <FinRow label="Remaining" value={fmt(order.remainingAmount)} colors={colors} danger />
          </View>
        </View>

        {/* Next due */}
        {order.nextDueDate && (
          <View style={{ paddingHorizontal: 16 }}>
            <View style={[s.dueCard, { backgroundColor: colors.primaryLight }]}>
              <Feather name="calendar" size={16} color={colors.primary} />
              <Text style={[s.dueText, { color: colors.primary }]}>
                Next due: <Text style={{ fontFamily: "Inter_700Bold" }}>{fmtDate(order.nextDueDate)}</Text>
              </Text>
            </View>
          </View>
        )}

        {/* Payment history */}
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={s.sectionTitle}>
            Payment History ({order.payments.length})
          </Text>
          {order.payments.length === 0 ? (
            <View style={s.emptyPayments}>
              <Feather name="inbox" size={28} color={colors.mutedForeground} />
              <Text style={[s.emptyText, { color: colors.mutedForeground }]}>No payments recorded</Text>
            </View>
          ) : (
            order.payments
              .slice()
              .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
              .map((p) => (
                <View key={p.id} style={[s.paymentRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[s.payIcon, { backgroundColor: colors.primaryLight }]}>
                    <Feather name="check" size={14} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.payAmount, { color: colors.foreground }]}>{fmt(p.amount)}</Text>
                    <Text style={[s.payMeta, { color: colors.mutedForeground }]}>
                      {fmtDate(p.paymentDate)} · {p.paymentMethod.replace("_", " ")}
                    </Text>
                    {p.notes && (
                      <Text style={[s.payNotes, { color: colors.mutedForeground }]}>{p.notes}</Text>
                    )}
                  </View>
                  <Pressable onPress={() => handleDeletePayment(p)} style={{ padding: 6 }}>
                    <Feather name="trash-2" size={15} color={colors.destructive + "aa"} />
                  </Pressable>
                </View>
              ))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      {order.status !== "completed" && (
        <Pressable
          style={[
            s.fab,
            {
              bottom: Platform.OS === "web" ? 34 + 90 : insets.bottom + 90,
              backgroundColor: colors.primary,
            },
          ]}
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setPayModal(true);
          }}
        >
          <Feather name="plus" size={22} color="#fff" />
          <Text style={s.fabText}>Record Payment</Text>
        </Pressable>
      )}

      <RecordPaymentModal
        visible={payModal}
        onClose={() => setPayModal(false)}
        orderId={orderId}
        suggestedAmount={order.nextMonthlyAmount || order.monthlyAmount}
        colors={colors}
      />
    </>
  );
}

function FinRow({
  label,
  value,
  colors,
  highlight,
  danger,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 }}>
      <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>{label}</Text>
      <Text
        style={{
          fontSize: 14,
          fontFamily: highlight || danger ? "Inter_700Bold" : "Inter_500Medium",
          color: highlight ? colors.primary : danger ? colors.destructive : colors.foreground,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    headerCard: { paddingTop: 0 },
    backBtn: {
      position: "absolute",
      top: 0,
      left: 16,
      zIndex: 10,
      padding: 8,
    },
    productName: {
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      color: "#fff",
      marginBottom: 4,
    },
    shopName: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: "#ffffff99",
    },
    progressBg: {
      height: 6,
      backgroundColor: "#ffffff40",
      borderRadius: 3,
      marginTop: 16,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%" as any,
      backgroundColor: "#fff",
      borderRadius: 3,
    },
    progressText: {
      fontSize: 12,
      color: "#ffffffcc",
      fontFamily: "Inter_400Regular",
      marginTop: 6,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 4,
    },
    dueCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 12,
      borderRadius: colors.radius,
    },
    dueText: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
    },
    sectionTitle: {
      fontSize: 16,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      marginBottom: 12,
    },
    paymentRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginBottom: 8,
    },
    payIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    payAmount: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
    },
    payMeta: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      marginTop: 2,
      textTransform: "capitalize",
    },
    payNotes: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      marginTop: 2,
      fontStyle: "italic",
    },
    emptyPayments: {
      alignItems: "center",
      paddingVertical: 32,
      gap: 8,
    },
    emptyText: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
    },
    fab: {
      position: "absolute",
      right: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderRadius: 28,
      shadowColor: "#14b8a6",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 8,
    },
    fabText: {
      color: "#fff",
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
    },
  });
