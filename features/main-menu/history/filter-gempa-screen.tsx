import { Feather, Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router"; // <-- Import Router dan Stack
import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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
  const router = useRouter(); // <-- Inisialisasi router

  // State untuk mengontrol akordion mana yang terbuka
  const [expandedSection, setExpandedSection] = useState<
    "time" | "location" | null
  >("time");

  // State untuk menyimpan nilai filter yang dipilih
  const [selectedTime, setSelectedTime] = useState("1_week");
  const [selectedCity, setSelectedCity] = useState("Semua Wilayah");

  const toggleSection = (section: "time" | "location") => {
    if (expandedSection === section) {
      setExpandedSection(null); // Tutup jika diklik lagi
    } else {
      setExpandedSection(section); // Buka yang baru
    }
  };

  const handleSimpan = () => {
    console.log("Filter Disimpan:", { selectedTime, selectedCity });
    // Menutup layar dan kembali ke halaman sebelumnya (peta)
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Menggunakan transparentModal agar efeknya muncul sebagai overlay cantik di atas peta */}
      <Stack.Screen
        options={{
          headerShown: false,
          animation: "slide_from_right", // Muncul dari kanan seperti List
          presentation: "transparentModal",
        }}
      />

      <View style={styles.container}>
        {/* === CARD UTAMA === */}
        <View style={styles.card}>
          {/* HEADER CARD */}
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Filter</Text>
            {/* === TOMBOL CLOSE KEMBALI KE PETA === */}
            <TouchableOpacity
              style={styles.closeIcon}
              activeOpacity={0.7}
              onPress={() => router.back()}
            >
              <Ionicons name="close" size={18} color="#0C4A6E" />
            </TouchableOpacity>
          </View>

          {/* === SECTION 1: RENTANG WAKTU === */}
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

            {/* KONTEN RENTANG WAKTU */}
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // Jika pakai transparentModal, kita bisa ubah ini jadi agak transparan
    backgroundColor: "rgba(226, 232, 240, 0.9)", // #E2E8F0 dengan opacity
  },
  container: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#0C4A6E",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  closeIcon: {
    backgroundColor: "#FFFFFF",
    padding: 4,
    borderRadius: 4,
  },
  sectionContainer: {
    marginBottom: 12,
  },
  accordionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 8,
  },
  accordionHeaderActive: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderColor: "#FFFFFF",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  accordionContent: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  listItemText: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "500",
  },
  listItemSelectedText: {
    color: "#0891B2",
    fontWeight: "bold",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 12,
  },
  btnBatal: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#A5B4FC",
    alignItems: "center",
  },
  btnBatalText: {
    color: "#E0E7FF",
    fontSize: 15,
    fontWeight: "600",
  },
  btnSimpan: {
    flex: 1,
    backgroundColor: "#0891B2",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  btnSimpanText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
  },
});
