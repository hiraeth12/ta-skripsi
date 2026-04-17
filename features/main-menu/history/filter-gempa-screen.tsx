import { Feather, Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import styles from "./styles/filter-gempa-screen";

// === DATA MOCKUP ===
const TIME_RANGES = [
  { id: "1_week", label: "1 Minggu Terakhir" },
  { id: "2_week", label: "2 Minggu Terakhir" },
  { id: "3_week", label: "3 Minggu Terakhir" },
  { id: "1_month", label: "1 Bulan Terakhir" },
  { id: "all_time", label: "Semua Waktu" },
];

const CITIES = [
  "Semua Wilayah",
  "Kabupaten Bandung",
  "Kota Bandung",
  "Kabupaten Garut",
  "Kabupaten Cianjur",
  "Kabupaten Sukabumi",
  "Kota Bogor",
  "Kabupaten Tasikmalaya",
  "Kabupaten Pangandaran",
];

export default function FilterGempaScreen() {
  const router = useRouter(); 
  const [expandedSection, setExpandedSection] = useState<
    "time" | "location" | null
  >("time");
  const [selectedTime, setSelectedTime] = useState("1_week");
  const [selectedCity, setSelectedCity] = useState("Semua Wilayah");
  const toggleSection = (section: "time" | "location") => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section); 
    }
  };

  const handleSimpan = () => {
    console.log("Filter Disimpan:", { selectedTime, selectedCity });
    router.back();
  };

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
                expandedSection === "time" && styles.accordionHeaderActive,
              ]}
              activeOpacity={0.8}
              onPress={() => toggleSection("time")}
            >
              <View style={styles.headerLeft}>
                <Feather
                  name="calendar"
                  size={18}
                  color={expandedSection === "time" ? "#0C4A6E" : "#fff"}
                />
                <Text
                  style={[
                    styles.headerText,
                    expandedSection === "time" && { color: "#0C4A6E" },
                  ]}
                >
                  Pilih Rentang Waktu
                </Text>
              </View>
              <Feather
                name={
                  expandedSection === "time" ? "chevron-up" : "chevron-down"
                }
                size={20}
                color={expandedSection === "time" ? "#0C4A6E" : "#fff"}
              />
            </TouchableOpacity>
            {expandedSection === "time" && (
              <View style={styles.accordionContent}>
                {TIME_RANGES.map((item, index) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.listItem,
                      index === TIME_RANGES.length - 1 && {
                        borderBottomWidth: 0,
                      },
                    ]}
                    onPress={() => setSelectedTime(item.id)}
                  >
                    <Text
                      style={[
                        styles.listItemText,
                        selectedTime === item.id && styles.listItemSelectedText,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {selectedTime === item.id && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#0891B2"
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* === SECTION 2: LOKASI / KOTA === */}
          <View style={styles.sectionContainer}>
            <TouchableOpacity
              style={[
                styles.accordionHeader,
                expandedSection === "location" && styles.accordionHeaderActive,
              ]}
              activeOpacity={0.8}
              onPress={() => toggleSection("location")}
            >
              <View style={styles.headerLeft}>
                <Feather
                  name="search"
                  size={18}
                  color={expandedSection === "location" ? "#0C4A6E" : "#fff"}
                />
                <Text
                  style={[
                    styles.headerText,
                    expandedSection === "location" && { color: "#0C4A6E" },
                  ]}
                >
                  Cari Kota atau Kabupaten
                </Text>
              </View>
              <Feather
                name={
                  expandedSection === "location" ? "chevron-up" : "chevron-down"
                }
                size={20}
                color={expandedSection === "location" ? "#0C4A6E" : "#fff"}
              />
            </TouchableOpacity>

            {/* KONTEN LOKASI */}
            {expandedSection === "location" && (
              <View style={styles.accordionContent}>
                <ScrollView
                  style={{ maxHeight: 200 }}
                  nestedScrollEnabled={true}
                >
                  {CITIES.map((city, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.listItem,
                        index === CITIES.length - 1 && { borderBottomWidth: 0 },
                      ]}
                      onPress={() => setSelectedCity(city)}
                    >
                      <Text
                        style={[
                          styles.listItemText,
                          selectedCity === city && styles.listItemSelectedText,
                        ]}
                      >
                        {city}
                      </Text>
                      {selectedCity === city && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#0891B2"
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* === FOOTER BUTTONS === */}
          <View style={styles.footer}>
            {/* === TOMBOL BATAL KEMBALI KE PETA === */}
            <TouchableOpacity
              style={styles.btnBatal}
              activeOpacity={0.7}
              onPress={() => router.back()}
            >
              <Text style={styles.btnBatalText}>Batal</Text>
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