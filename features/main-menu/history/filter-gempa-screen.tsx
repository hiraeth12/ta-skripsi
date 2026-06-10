import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import styles from "./styles/filter-gempa-screen";
import {
  clampYearMonth,
  EARLIEST_YEAR,
  getLast7DayRange,
  getNowYearMonth,
  isMonthDisabled,
  isYearDisabled,
  MONTH_NAMES_ID,
  normalizeFilterMonths,
  parseFilterMonthsParam,
  parseIsoDate,
  serializeFilterMonths,
  toIsoDate,
  TSUNAMI_FIRST,
  type HistoryTabKey,
} from "./utils/filter";

type FilterMode = "bulan" | "range";

function asSingle(value?: string | string[]): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function resolveReturnTo(value?: string | string[]): string {
  const returnTo = asSingle(value);

  if (returnTo.startsWith("/")) {
    return returnTo;
  }

  if (returnTo) {
    return `/main-menu/${returnTo}`;
  }

  return "/main-menu/history";
}

function formatDisplayDate(value: Date): string {
  return value.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function clampDate(value: Date, min: Date, max: Date): Date {
  if (value.getTime() < min.getTime()) return new Date(min);
  if (value.getTime() > max.getTime()) return new Date(max);
  return value;
}

function DateField({
  label,
  max,
  min,
  onChange,
  value,
}: {
  label: string;
  max: Date;
  min: Date;
  onChange: (value: Date) => void;
  value: Date;
}) {
  const [open, setOpen] = useState(false);

  const handleChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setOpen(false);
    if (selected) onChange(clampDate(selected, min, max));
  };

  return (
    <View style={{ marginBottom: 12 }}>
      <Text
        style={{
          color: "#475569",
          fontSize: 11,
          fontWeight: "600",
          marginBottom: 4,
        }}
      >
        {label}
      </Text>

      {Platform.OS === "android" && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setOpen(true)}
          style={{
            alignItems: "center",
            backgroundColor: "#F1F5F9",
            borderRadius: 8,
            flexDirection: "row",
            gap: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        >
          <Feather name="calendar" size={15} color="#0C4A6E" />
          <Text style={{ color: "#0F172A", fontSize: 14, fontWeight: "500" }}>
            {formatDisplayDate(value)}
          </Text>
        </TouchableOpacity>
      )}

      {(open || Platform.OS === "ios") && (
        <DateTimePicker
          value={value}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          minimumDate={min}
          maximumDate={max}
          onChange={handleChange}
          locale="id-ID"
          themeVariant="light"
          accentColor="#0891B2"
        />
      )}
    </View>
  );
}

export default function FilterGempaScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    tab?: string;
    filterYear?: string;
    filterMonth?: string;
    filterMonths?: string;
    filterMode?: string;
    filterDateFrom?: string;
    filterDateTo?: string;
    returnTo?: string;
    restoreListPanel?: string;
  }>();
  const now = useMemo(() => new Date(), []);
  const tab: HistoryTabKey =
    params.tab === "tsunami"
      ? "tsunami"
      : params.tab === "terdeteksi"
        ? "terdeteksi"
        : "dirasakan";
  const isTsunami = tab === "tsunami";
  const nowDefault = getNowYearMonth(now);
  const incomingYear = Number.parseInt(String(params.filterYear ?? ""), 10);
  const incomingMonth = Number.parseInt(String(params.filterMonth ?? ""), 10);
  const incomingMonths = parseFilterMonthsParam(
    String(params.filterMonths ?? ""),
  );
  const incomingMode = asSingle(params.filterMode);
  const initialMode: FilterMode =
    !isTsunami && incomingMode !== "bulan" ? "range" : "bulan";
  const defaultRange = useMemo(() => getLast7DayRange(now), [now]);
  const minDate = useMemo(() => new Date(EARLIEST_YEAR, 0, 1), []);
  const today = useMemo(() => {
    const value = new Date(now);
    value.setHours(0, 0, 0, 0);
    return value;
  }, [now]);
  const defaultDateFrom = parseIsoDate(defaultRange.from) ?? minDate;
  const defaultDateTo = parseIsoDate(defaultRange.to) ?? today;
  const initialDateTo = clampDate(
    parseIsoDate(asSingle(params.filterDateTo)) ?? defaultDateTo,
    minDate,
    today,
  );
  const initialDateFrom = clampDate(
    parseIsoDate(asSingle(params.filterDateFrom)) ?? defaultDateFrom,
    minDate,
    initialDateTo,
  );
  const initialFilter = clampYearMonth(
    {
      year: Number.isFinite(incomingYear) ? incomingYear : nowDefault.year,
      month: Number.isFinite(incomingMonth) ? incomingMonth : nowDefault.month,
    },
    tab,
    now,
  );
  const initialMonths = normalizeFilterMonths(
    incomingMonths.length > 0
      ? incomingMonths
      : [Number.isFinite(incomingMonth) ? incomingMonth : initialFilter.month],
    initialFilter.year,
    tab,
    now,
  );
  const [expandedSection, setExpandedSection] = useState<
    "year" | "month" | null
  >("year");
  const [selectedYear, setSelectedYear] = useState(initialFilter.year);
  const [selectedMonths, setSelectedMonths] = useState<number[]>(initialMonths);
  const [filterMode, setFilterMode] = useState<FilterMode>(initialMode);
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);

  const toggleSection = (section: "year" | "month") => {
    setExpandedSection((current) => (current === section ? null : section));
  };

  const handleDateFromChange = (value: Date) => {
    setDateFrom(clampDate(value, minDate, dateTo));
  };

  const handleDateToChange = (value: Date) => {
    setDateTo(clampDate(value, dateFrom, today));
  };

  const handleSimpan = () => {
    const nextParams: Record<string, string> = { tab };

    if (isTsunami || filterMode === "bulan") {
      const clamped = clampYearMonth(
        { year: selectedYear, month: selectedMonths[0] ?? initialFilter.month },
        tab,
        now,
      );
      const months = normalizeFilterMonths(
        selectedMonths,
        clamped.year,
        tab,
        now,
      );

      nextParams.filterYear = String(clamped.year);
      nextParams.filterMode = "bulan";

      if (!isTsunami) {
        nextParams.filterMonth = String(months[0]);
        nextParams.filterMonths = serializeFilterMonths(months);
      }
    } else {
      nextParams.filterMode = "range";
      nextParams.filterDateFrom = toIsoDate(dateFrom);
      nextParams.filterDateTo = toIsoDate(dateTo);
    }

    if (asSingle(params.restoreListPanel) === "1") {
      nextParams.restoreListPanel = "1";
      nextParams.restoreListPanelToken = String(Date.now());
    }

    router.replace({
      pathname: "/main-menu/history",
      params: nextParams,
    });
  };

  const handleClose = () => {
    const returnPath = resolveReturnTo(params.returnTo);
    const returnBasePath = returnPath.split("?")[0];

    if (returnPath.includes("?")) {
      router.replace(returnPath as never);
      return;
    }

    if (returnBasePath === "/main-menu/history") {
      const nextParams: Record<string, string> = {
        tab,
        filterYear: String(initialFilter.year),
      };

      if (!isTsunami) {
        nextParams.filterMode = initialMode;
        if (initialMode === "range") {
          nextParams.filterDateFrom = toIsoDate(initialDateFrom);
          nextParams.filterDateTo = toIsoDate(initialDateTo);
        } else {
          nextParams.filterMonth = String(
            initialMonths[0] ?? initialFilter.month,
          );
          nextParams.filterMonths = serializeFilterMonths(initialMonths);
        }
      }

      router.replace({
        pathname: "/main-menu/history",
        params: nextParams,
      });
      return;
    }

    router.replace(returnPath as never);
  };

  const handleReset = () => {
    const fallback = clampYearMonth(getNowYearMonth(now), tab, now);
    setSelectedYear(fallback.year);
    setSelectedMonths([fallback.month]);
    setDateFrom(defaultDateFrom);
    setDateTo(defaultDateTo);
    setFilterMode(isTsunami ? "bulan" : "range");
  };

  const years = useMemo(() => {
    const currentYear = now.getFullYear();
    const startYear = isTsunami ? TSUNAMI_FIRST.year - 1 : EARLIEST_YEAR;
    const list: number[] = [];
    for (let year = startYear; year <= currentYear; year += 1) {
      list.push(year);
    }
    return list;
  }, [isTsunami, now]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Filter</Text>
            <TouchableOpacity
              style={styles.closeIcon}
              activeOpacity={0.7}
              onPress={handleClose}
            >
              <Ionicons name="close" size={18} color="#0C4A6E" />
            </TouchableOpacity>
          </View>

          {!isTsunami && (
            <View
              style={{
                backgroundColor: "#F1F5F9",
                borderRadius: 10,
                flexDirection: "row",
                marginBottom: 16,
                padding: 4,
              }}
            >
              {(["range", "bulan"] as FilterMode[]).map((mode) => {
                const active = filterMode === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    activeOpacity={0.75}
                    onPress={() => setFilterMode(mode)}
                    style={{
                      alignItems: "center",
                      backgroundColor: active ? "#0C4A6E" : "transparent",
                      borderRadius: 8,
                      flex: 1,
                      paddingVertical: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: active ? "#FFFFFF" : "#64748B",
                        fontSize: 13,
                        fontWeight: "600",
                      }}
                    >
                      {mode === "range" ? "7 Hari / Range" : "Tahun / Bulan"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {(isTsunami || filterMode === "bulan") && (
            <>
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
                    name={
                      expandedSection === "year" ? "chevron-up" : "chevron-down"
                    }
                    size={20}
                    color={expandedSection === "year" ? "#0C4A6E" : "#fff"}
                  />
                </TouchableOpacity>
                {expandedSection === "year" && (
                  <View style={styles.accordionContent}>
                    <ScrollView
                      style={{ maxHeight: 220 }}
                      nestedScrollEnabled={true}
                    >
                      {years.map((year, index) => {
                        const disabled = isYearDisabled(year, tab, now);
                        const isSelected = selectedYear === year;
                        return (
                          <TouchableOpacity
                            key={year}
                            style={[
                              styles.listItem,
                              index === years.length - 1 && {
                                borderBottomWidth: 0,
                              },
                              disabled && { opacity: 0.45 },
                            ]}
                            disabled={disabled}
                            onPress={() => {
                              const next = clampYearMonth(
                                {
                                  year,
                                  month:
                                    selectedMonths[0] ?? initialFilter.month,
                                },
                                tab,
                                now,
                              );
                              setSelectedYear(next.year);
                              setSelectedMonths((prev) =>
                                normalizeFilterMonths(
                                  prev,
                                  next.year,
                                  tab,
                                  now,
                                ),
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
                    </ScrollView>
                  </View>
                )}
              </View>

              {!isTsunami && (
                <View style={styles.sectionContainer}>
                  <TouchableOpacity
                    style={[
                      styles.accordionHeader,
                      expandedSection === "month" &&
                        styles.accordionHeaderActive,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => toggleSection("month")}
                  >
                    <View style={styles.headerLeft}>
                      <Feather
                        name="calendar"
                        size={18}
                        color={
                          expandedSection === "month" ? "#0C4A6E" : "#fff"
                        }
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
                      name={
                        expandedSection === "month"
                          ? "chevron-up"
                          : "chevron-down"
                      }
                      size={20}
                      color={expandedSection === "month" ? "#0C4A6E" : "#fff"}
                    />
                  </TouchableOpacity>

                  {expandedSection === "month" && (
                    <View style={styles.accordionContent}>
                      <ScrollView
                        style={{ maxHeight: 220 }}
                        nestedScrollEnabled={true}
                      >
                        {MONTH_NAMES_ID.map((label, idx) => {
                          const month = idx + 1;
                          const disabled = isMonthDisabled(
                            selectedYear,
                            month,
                            tab,
                            now,
                          );
                          const isSelected = selectedMonths.includes(month);
                          return (
                            <TouchableOpacity
                              key={label}
                              style={[
                                styles.listItem,
                                idx === MONTH_NAMES_ID.length - 1 && {
                                  borderBottomWidth: 0,
                                },
                                disabled && { opacity: 0.45 },
                              ]}
                              disabled={disabled}
                              onPress={() => {
                                setSelectedMonths((prev) => {
                                  if (prev.includes(month)) {
                                    const next = prev.filter(
                                      (m) => m !== month,
                                    );
                                    return normalizeFilterMonths(
                                      next,
                                      selectedYear,
                                      tab,
                                      now,
                                    );
                                  }
                                  return normalizeFilterMonths(
                                    [...prev, month],
                                    selectedYear,
                                    tab,
                                    now,
                                  );
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
              )}
            </>
          )}

          {!isTsunami && filterMode === "range" && (
            <View
              style={{
                backgroundColor: "#F8FAFC",
                borderColor: "#E2E8F0",
                borderRadius: 10,
                borderWidth: 1,
                marginBottom: 4,
                padding: 14,
              }}
            >
              <DateField
                label="Dari tanggal"
                value={dateFrom}
                min={minDate}
                max={dateTo}
                onChange={handleDateFromChange}
              />
              <DateField
                label="Sampai tanggal"
                value={dateTo}
                min={dateFrom}
                max={today}
                onChange={handleDateToChange}
              />
              <View
                style={{
                  alignItems: "center",
                  backgroundColor: "#EFF6FF",
                  borderRadius: 8,
                  flexDirection: "row",
                  gap: 6,
                  marginTop: 4,
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                }}
              >
                <Feather name="info" size={13} color="#2563EB" />
                <Text style={{ color: "#2563EB", flex: 1, fontSize: 11 }}>
                  {formatDisplayDate(dateFrom)} - {formatDisplayDate(dateTo)}
                </Text>
              </View>
            </View>
          )}

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
      </ScrollView>
    </SafeAreaView>
  );
}
