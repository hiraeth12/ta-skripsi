import { Feather, Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import styles from "./styles/filter-gempa-screen";
import {
  clampYearMonth,
  getNowYearMonth,
  isMonthDisabled,
  isYearDisabled,
  MONTH_NAMES_ID,
  normalizeFilterMonths,
  parseFilterMonthsParam,
  serializeFilterMonths,
  type HistoryTabKey,
} from "./utils/filter";

const YEAR_START = 2023;

export default function FilterGempaScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    tab?: string;
    filterYear?: string;
    filterMonth?: string;
    filterMonths?: string;
    returnTo?: string;
  }>();
  const now = useMemo(() => new Date(), []);
  const tab: HistoryTabKey = params.tab === "terdeteksi" ? "terdeteksi" : "dirasakan";
  const nowDefault = getNowYearMonth(now);
  const incomingYear = Number.parseInt(String(params.filterYear ?? ""), 10);
  const incomingMonth = Number.parseInt(String(params.filterMonth ?? ""), 10);
  const incomingMonths = parseFilterMonthsParam(String(params.filterMonths ?? ""));
  const initialFilter = clampYearMonth(
    {
      year: Number.isFinite(incomingYear) ? incomingYear : nowDefault.year,
      month: Number.isFinite(incomingMonth) ? incomingMonth : nowDefault.month,
    },
    tab,
    now,
  );
  const [expandedSection, setExpandedSection] = useState<
    "year" | "month" | null
  >("year");
  const [selectedYear, setSelectedYear] = useState(initialFilter.year);
  const [selectedMonths, setSelectedMonths] = useState<number[]>(
    normalizeFilterMonths(
      incomingMonths.length > 0
        ? incomingMonths
        : [Number.isFinite(incomingMonth) ? incomingMonth : initialFilter.month],
      initialFilter.year,
      tab,
      now,
    ),
  );
  const toggleSection = (section: "year" | "month") => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
    }
  };

  const handleSimpan = () => {
    const clamped = clampYearMonth(
      { year: selectedYear, month: selectedMonths[0] ?? initialFilter.month },
      tab,
      now,
    );
    const months = normalizeFilterMonths(selectedMonths, clamped.year, tab, now);
    router.replace({
      pathname: "/main-menu/history",
      params: {
        tab,
        filterYear: String(clamped.year),
        filterMonth: String(months[0]),
        filterMonths: serializeFilterMonths(months),
      },
    });
  };

  const handleReset = () => {
    const fallback = clampYearMonth(getNowYearMonth(now), tab, now);
    setSelectedYear(fallback.year);
    setSelectedMonths([fallback.month]);
  };

  const years = useMemo(() => {
    const currentYear = now.getFullYear();
    const list: number[] = [];
    for (let year = YEAR_START; year <= currentYear; year += 1) {
      list.push(year);
    }
    return list;
  }, [now]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          headerShown: false,
          animation: "slide_from_right",
          presentation: "transparentModal",
        }}
      />

      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Filter</Text>
            <TouchableOpacity
              style={styles.closeIcon}
              activeOpacity={0.7}
              onPress={() => router.back()}
            >
              <Ionicons name="close" size={18} color="#0C4A6E" />
            </TouchableOpacity>
          </View>
          <View style={styles.sectionContainer}>
            <TouchableOpacity
              style={[
                styles.accordionHeader,
                expandedSection === "year" && styles.accordionHeaderActive,
              ]}
              activeOpacity={0.8}
              onPress={() => toggleSection("year")}
            >
              <View style={styles.headerLeft}>
                <Feather
                  name="calendar"
                  size={18}
                  color={expandedSection === "year" ? "#0C4A6E" : "#fff"}
                />
                <Text
                  style={[
                    styles.headerText,
                    expandedSection === "year" && { color: "#0C4A6E" },
                  ]}
                >
                  Pilih Tahun
                </Text>
              </View>
              <Feather
                name={expandedSection === "year" ? "chevron-up" : "chevron-down"}
                size={20}
                color={expandedSection === "year" ? "#0C4A6E" : "#fff"}
              />
            </TouchableOpacity>
            {expandedSection === "year" && (
              <View style={styles.accordionContent}>
                {years.map((year, index) => {
                  const disabled = isYearDisabled(year, tab, now);
                  const isSelected = selectedYear === year;
                  return (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.listItem,
                        index === years.length - 1 && { borderBottomWidth: 0 },
                        disabled && { opacity: 0.45 },
                      ]}
                      disabled={disabled}
                      onPress={() => {
                        const next = clampYearMonth(
                          { year, month: selectedMonths[0] ?? initialFilter.month },
                          tab,
                          now,
                        );
                        setSelectedYear(next.year);
                        setSelectedMonths((prev) =>
                          normalizeFilterMonths(prev, next.year, tab, now),
                        );
                      }}
                    >
                      <Text
                        style={[
                          styles.listItemText,
                          isSelected && styles.listItemSelectedText,
                        ]}
                      >
                        {year}
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#0891B2"
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.sectionContainer}>
            <TouchableOpacity
              style={[
                styles.accordionHeader,
                expandedSection === "month" && styles.accordionHeaderActive,
              ]}
              activeOpacity={0.8}
              onPress={() => toggleSection("month")}
            >
              <View style={styles.headerLeft}>
                <Feather
                  name="calendar"
                  size={18}
                  color={expandedSection === "month" ? "#0C4A6E" : "#fff"}
                />
                <Text
                  style={[
                    styles.headerText,
                    expandedSection === "month" && { color: "#0C4A6E" },
                  ]}
                >
                  Pilih Bulan
                </Text>
              </View>
              <Feather
                name={expandedSection === "month" ? "chevron-up" : "chevron-down"}
                size={20}
                color={expandedSection === "month" ? "#0C4A6E" : "#fff"}
              />
            </TouchableOpacity>

            {expandedSection === "month" && (
              <View style={styles.accordionContent}>
                <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled={true}>
                  {MONTH_NAMES_ID.map((label, idx) => {
                    const month = idx + 1;
                    const disabled = isMonthDisabled(selectedYear, month, tab, now);
                    const isSelected = selectedMonths.includes(month);
                    return (
                      <TouchableOpacity
                        key={label}
                        style={[
                          styles.listItem,
                          idx === MONTH_NAMES_ID.length - 1 && { borderBottomWidth: 0 },
                          disabled && { opacity: 0.45 },
                        ]}
                        disabled={disabled}
                        onPress={() => {
                          setSelectedMonths((prev) => {
                            if (prev.includes(month)) {
                              const next = prev.filter((m) => m !== month);
                              return normalizeFilterMonths(next, selectedYear, tab, now);
                            }
                            return normalizeFilterMonths([...prev, month], selectedYear, tab, now);
                          });
                        }}
                      >
                        <Text
                          style={[
                            styles.listItemText,
                            isSelected && styles.listItemSelectedText,
                          ]}
                        >
                          {label}
                        </Text>
                        {isSelected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color="#0891B2"
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>

          {/* === FOOTER BUTTONS === */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.btnReset}
              activeOpacity={0.7}
              onPress={handleReset}
            >
              <Text style={styles.btnResetText}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnSimpan}
              activeOpacity={0.7}
              onPress={handleSimpan}
            >
              <Text style={styles.btnSimpanText}>Simpan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
