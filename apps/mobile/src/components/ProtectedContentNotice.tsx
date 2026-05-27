import { StyleSheet, Text, View } from "react-native";

import { useLearningTheme } from "@/components/learning-ui";

const DEFAULT_MESSAGE =
  "เนื้อหานี้สำหรับผู้ที่ซื้อแล้วเท่านั้น ห้ามบันทึกหรือเผยแพร่ ถ้าพยายามจับภาพหน้าจอ ระบบจะแจ้งเตือน";

type ProtectedContentNoticeProps = {
  message?: string;
};

export function ProtectedContentNotice({
  message = DEFAULT_MESSAGE,
}: ProtectedContentNoticeProps) {
  const { palette, isDark } = useLearningTheme();
  const styles = createNoticeStyles(palette, isDark);

  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel={message}
      style={styles.container}
    >
      <View style={styles.iconBubble}>
        <Text style={styles.iconGlyph} accessibilityElementsHidden>
          {"⚠"}
        </Text>
      </View>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

function createNoticeStyles(
  palette: ReturnType<typeof useLearningTheme>["palette"],
  isDark: boolean,
) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark ? "#a16207" : "#facc15",
      backgroundColor: isDark ? "#3b2a07" : "#fef9c3",
      paddingHorizontal: 14,
      paddingVertical: 12,
      shadowColor: palette.glow,
      shadowOpacity: isDark ? 0.18 : 0.05,
      shadowRadius: isDark ? 14 : 8,
      shadowOffset: { width: 0, height: 6 },
      elevation: isDark ? 4 : 1,
    },
    iconBubble: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#92400e" : "#fde68a",
    },
    iconGlyph: {
      color: isDark ? "#fde68a" : "#92400e",
      fontFamily: "Prompt_700Bold",
      fontSize: 16,
      lineHeight: 18,
    },
    message: {
      flex: 1,
      color: isDark ? "#fde68a" : "#854d0e",
      fontFamily: "Prompt_500Medium",
      fontSize: 13,
      lineHeight: 20,
    },
  });
}
