import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";

export type WarningTabItem = {
  id: string;
  subject: string;
};

type WarningTabsProps = {
  warnings: WarningTabItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  updateLabel?: (index: number) => string;
};

const EMPTY_WARNING_TAB: WarningTabItem = {
  id: "empty",
  subject: "-",
};

export function getWarningTabLabel(
  subject: string,
  index: number,
  updateLabel?: (index: number) => string,
): string {
  const match = subject.match(/\bPD[-\s]*([0-9]+(?:\.[0-9]+)?)\b/i);
  return match ? `PD-${match[1]}` : updateLabel?.(index) ?? `Update ${index + 1}`;
}

export function WarningTabs({
  warnings,
  selectedIndex,
  onSelect,
  updateLabel,
}: WarningTabsProps) {
  const safeWarnings = warnings.length > 0 ? warnings : [EMPTY_WARNING_TAB];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.warningTabs, styles.warningTabsCenter]}
    >
      {safeWarnings.map((warning, index) => {
        const isSelected = selectedIndex === index;
        return (
          <TouchableOpacity
            key={`${warning.id}-${index}`}
            activeOpacity={0.85}
            onPress={() => onSelect(index)}
            style={[
              styles.warningTab,
              isSelected && styles.warningTabActive,
            ]}
          >
            <Text
              style={[
                styles.warningTabText,
                isSelected && styles.warningTabTextActive,
              ]}
            >
              {getWarningTabLabel(warning.subject, index, updateLabel)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  warningTabs: {
    gap: 8,
    paddingBottom: 10,
  },
  warningTab: {
    borderWidth: 1,
    borderColor: "#D0E3EE",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#FFFFFF",
  },
  warningTabActive: {
    borderColor: "#0369A1",
    backgroundColor: "#E0F2FE",
  },
  warningTabText: {
    color: "#1E3A5F",
    fontSize: 12,
    fontWeight: "700",
  },
  warningTabTextActive: {
    color: "#0369A1",
  },

  warningTabsCenter: {
  flexGrow: 1,
  justifyContent: "center",
},
});
