import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function InfoRow({ icon, label, value, colors }: {
  icon: string;
  label: string;
  value: string | null | undefined;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 13, gap: 12 }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.muted, alignItems: "center", justifyContent: "center" }}>
        <Feather name={icon as any} size={16} color={colors.mutedForeground} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>{label}</Text>
        <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: colors.foreground, marginTop: 1 }}>
          {value || "—"}
        </Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const initials = (user?.name || user?.email || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleLogout() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setLoggingOut(true);
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          try {
            await logout();
            router.replace("/(auth)/login");
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  }

  const s = styles(colors);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: Platform.OS === "web" ? 67 + 16 : insets.top + 16,
        paddingBottom: Platform.OS === "web" ? 34 + 90 : insets.bottom + 90,
        paddingHorizontal: 16,
        gap: 16,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar card */}
      <View style={s.avatarCard}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <Text style={s.name}>{user?.name || "—"}</Text>
        <Text style={s.email}>{user?.email}</Text>
      </View>

      {/* Info */}
      <View style={s.card}>
        <InfoRow icon="user" label="Full Name" value={user?.name} colors={colors} />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <InfoRow icon="mail" label="Email" value={user?.email} colors={colors} />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <InfoRow icon="phone" label="Phone" value={user?.phone} colors={colors} />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <InfoRow icon="map-pin" label="Address" value={user?.address} colors={colors} />
      </View>

      {/* Logout */}
      <Pressable
        style={({ pressed }) => [s.logoutBtn, { opacity: pressed || loggingOut ? 0.75 : 1 }]}
        onPress={handleLogout}
        disabled={loggingOut}
      >
        <Feather name="log-out" size={18} color={colors.destructive} />
        <Text style={[s.logoutText, { color: colors.destructive }]}>
          {loggingOut ? "Signing out..." : "Sign Out"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    avatarCard: {
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 28,
      gap: 6,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 10,
    },
    avatarText: {
      fontSize: 30,
      fontFamily: "Inter_700Bold",
      color: "#fff",
    },
    name: {
      fontSize: 20,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
    email: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
    },
    logoutBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: colors.destructive + "40",
      height: 50,
    },
    logoutText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
    },
  });
