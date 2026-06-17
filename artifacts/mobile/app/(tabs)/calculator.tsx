import { useColors } from "@/hooks/useColors";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MONTH_OPTIONS = [3, 6, 9, 12, 18, 24, 36, 48, 60];

function fmt(n: number) {
  if (isNaN(n) || !isFinite(n)) return "—";
  return "৳" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CalculatorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [price, setPrice] = useState("");
  const [down, setDown] = useState("");
  const [rate, setRate] = useState("");
  const [months, setMonths] = useState(12);

  const totalPrice = parseFloat(price) || 0;
  const downPayment = parseFloat(down) || 0;
  const annualRate = parseFloat(rate) || 0;
  const principal = Math.max(0, totalPrice - downPayment);

  let monthly = 0;
  let totalInterest = 0;
  let totalPayable = 0;

  if (principal > 0 && months > 0) {
    if (annualRate === 0) {
      monthly = principal / months;
      totalInterest = 0;
    } else {
      const r = annualRate / 12 / 100;
      monthly = (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
      totalInterest = monthly * months - principal;
    }
    totalPayable = monthly * months + downPayment;
  }

  const s = styles(colors);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: Platform.OS === "web" ? 67 + 16 : insets.top + 16,
          paddingBottom: Platform.OS === "web" ? 34 + 90 : insets.bottom + 90,
          paddingHorizontal: 16,
          gap: 16,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.pageTitle}>EMI Calculator</Text>

        {/* Inputs */}
        <View style={s.card}>
          <InputRow
            label="Total Price"
            value={price}
            onChange={setPrice}
            placeholder="0"
            prefix="৳"
            colors={colors}
          />
          <Divider colors={colors} />
          <InputRow
            label="Down Payment"
            value={down}
            onChange={setDown}
            placeholder="0"
            prefix="৳"
            colors={colors}
          />
          <Divider colors={colors} />
          <InputRow
            label="Interest Rate"
            value={rate}
            onChange={setRate}
            placeholder="0"
            suffix="% per year"
            colors={colors}
          />
        </View>

        {/* Months selector */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>Duration (months)</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {MONTH_OPTIONS.map((m) => (
              <MonthChip
                key={m}
                value={m}
                selected={months === m}
                onPress={() => setMonths(m)}
                colors={colors}
              />
            ))}
          </View>
        </View>

        {/* Results */}
        <View style={[s.card, { backgroundColor: colors.primary }]}>
          <Text style={[s.resultLabel, { color: "#ffffff99" }]}>Monthly Installment</Text>
          <Text style={[s.resultBig, { color: "#fff" }]}>{fmt(monthly)}</Text>
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={[s.resultCard, { flex: 1, backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[s.resultSmLabel, { color: colors.mutedForeground }]}>Principal</Text>
            <Text style={[s.resultSmValue, { color: colors.foreground }]}>{fmt(principal)}</Text>
          </View>
          <View style={[s.resultCard, { flex: 1, backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[s.resultSmLabel, { color: colors.mutedForeground }]}>Total Interest</Text>
            <Text style={[s.resultSmValue, { color: colors.warning }]}>{fmt(totalInterest)}</Text>
          </View>
        </View>

        <View style={[s.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.resultSmLabel, { color: colors.mutedForeground }]}>Total Amount Payable</Text>
          <Text style={[s.resultSmValue, { color: colors.foreground, fontSize: 20 }]}>{fmt(totalPayable)}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function InputRow({
  label,
  value,
  onChange,
  placeholder,
  prefix,
  suffix,
  colors,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  prefix?: string;
  suffix?: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 }}>
      <Text style={{ fontSize: 15, fontFamily: "Inter_500Medium", color: colors.foreground }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        {prefix && <Text style={{ fontSize: 15, color: colors.mutedForeground }}>{prefix}</Text>}
        <TextInput
          style={{
            fontSize: 16,
            fontFamily: "Inter_600SemiBold",
            color: colors.primary,
            minWidth: 80,
            textAlign: "right",
          }}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          keyboardType="decimal-pad"
        />
        {suffix && <Text style={{ fontSize: 13, color: colors.mutedForeground }}>{suffix}</Text>}
      </View>
    </View>
  );
}

function Divider({ colors }: { colors: ReturnType<typeof useColors> }) {
  return <View style={{ height: 1, backgroundColor: colors.border }} />;
}

function MonthChip({
  value,
  selected,
  onPress,
  colors,
}: {
  value: number;
  selected: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: selected ? colors.primary : colors.secondary,
      }}
    >
      <Text
        onPress={onPress}
        style={{
          fontSize: 13,
          fontFamily: "Inter_600SemiBold",
          color: selected ? "#fff" : colors.mutedForeground,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    pageTitle: {
      fontSize: 26,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
    },
    sectionLabel: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      paddingTop: 14,
    },
    resultLabel: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      marginBottom: 4,
    },
    resultBig: {
      fontSize: 36,
      fontFamily: "Inter_700Bold",
      paddingVertical: 16,
      paddingHorizontal: 16,
    },
    resultCard: {
      borderRadius: colors.radius,
      borderWidth: 1,
      padding: 14,
    },
    resultSmLabel: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      marginBottom: 4,
    },
    resultSmValue: {
      fontSize: 17,
      fontFamily: "Inter_700Bold",
    },
  });
