import { Ionicons } from "@expo/vector-icons";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

export default function Home() {
  const [shakeMapVisible, setShakeMapVisible] = useState(false);
  const [infoVisibleDirasakan, setInfoVisibleDirasakan] = useState(false);
  const [infoVisibleTerdeteksi, setInfoVisibleTerdeteksi] = useState(false);

  // State untuk melacak halaman carousel (0 atau 1)
  const [activeTab, setActiveTab] = useState(0);

  const user = { name: "Budi" };
  const shakeMapUrl =
    "https://bmkg-content-inatews.storage.googleapis.com/20260305205910_rev/intensity_logo.jpg";

  // Fungsi untuk mendeteksi pergeseran
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(scrollOffset / SCREEN_WIDTH);
    if (currentIndex !== activeTab) {
      setActiveTab(currentIndex);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {/* GREETING & LOCATION CARD */}
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.greeting}>Halo, {user.name} !</Text>
            <Text style={styles.date}>Thursday, 7 August 2025</Text>
          </View>
        </View>

        <View style={styles.locationCard}>
          <Image
            source={require("../../assets/images/bandung.jpg")}
            style={styles.locationImage}
          />
          <Text style={styles.locationText}>
            <Ionicons name="location-outline" size={16} /> BANDUNG
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <MaterialIcons name="history" size={20} color="#1E6F9F" />
              <Text style={styles.statLabel}>GEMPA TERAKHIR</Text>
              <Text style={styles.statValue}>2 Jam Lalu</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="location-outline" size={20} color="#1E6F9F" />
              <Text style={styles.statLabel}>JARAK GEMPA</Text>
              <Text style={styles.statValue}>65 km</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="alert-circle-outline" size={20} color="#1E6F9F" />
              <Text style={styles.statLabel}>STATUS WILAYAH</Text>
              <Text style={styles.statValue}>Aman</Text>
            </View>
          </View>
        </View>

        {/* BOTTOM SECTION - HORIZONTAL GESER */}
        <View style={styles.bottomSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled={true}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
          >
            {/* ITEM 1: DIRASAKAN */}
            <View style={{ width: SCREEN_WIDTH }}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Gempabumi Terakhir Dirasakan
                </Text>
                {/* Tombol Info Balik Lagi */}
                <TouchableOpacity onPress={() => setInfoVisibleDirasakan(true)}>
                  <Ionicons
                    name="information-circle-outline"
                    size={25}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>
              <QuakeCard onShakeMap={() => setShakeMapVisible(true)} />
            </View>

            {/* ITEM 2: TERDETEKSI */}
            <View style={{ width: SCREEN_WIDTH }}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Gempabumi Terakhir Terdeteksi
                </Text>
                {/* Tombol Info Balik Lagi */}
                <TouchableOpacity
                  onPress={() => setInfoVisibleTerdeteksi(true)}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={25}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>
              <QuakeCard onShakeMap={() => setShakeMapVisible(true)} />
            </View>
          </ScrollView>

          {/* INDIKATOR TITIK (DOTS) */}
          <View style={styles.paginationContainer}>
            <View
              style={[
                styles.dot,
                activeTab === 0 ? styles.dotActive : styles.dotInactive,
              ]}
            />
            <View
              style={[
                styles.dot,
                activeTab === 1 ? styles.dotActive : styles.dotInactive,
              ]}
            />
          </View>
        </View>
      </ScrollView>

      {/* MODAL INFO DIRASAKAN (Balik Lagi) */}
      <InfoModal
        visible={infoVisibleDirasakan}
        onClose={() => setInfoVisibleDirasakan(false)}
        title="Gempabumi Terakhir Dirasakan"
        desc="Menampilkan kejadian gempa yang getarannya dirasakan oleh manusia dan dilaporkan di wilayah sekitar."
      />

      {/* MODAL INFO TERDETEKSI (Balik Lagi) */}
      <InfoModal
        visible={infoVisibleTerdeteksi}
        onClose={() => setInfoVisibleTerdeteksi(false)}
        title="Gempabumi Terakhir Terdeteksi"
        desc="Menampilkan gempa yang tercatat oleh alat seismograf, namun tidak dirasakan oleh manusia."
      />

      {/* MODAL PETA GUNCANGAN */}
      <Modal visible={shakeMapVisible} transparent animationType="slide">
        <View style={styles.modalOverlayBottom}>
          <View
            style={[styles.modalCardBottom, { height: SCREEN_HEIGHT * 0.9 }]}
          >
            <View style={styles.handleBar} />
            <View style={styles.modalHeaderBottom}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitleBottom}>PETA GUNCANGAN</Text>
                <Text style={styles.modalSubtitle}>
                  Sumber data: BMKG ShakeMap
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShakeMapVisible(false)}
                style={styles.modalCloseCircle}
              >
                <Ionicons name="close" size={20} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }}>
              <Image
                source={{ uri: shakeMapUrl }}
                style={styles.maximizedImage}
                resizeMode="contain"
              />
            </ScrollView>
            <View style={styles.modalFooter}>
              <Text style={styles.scrollHint}>
                * Data diperbarui secara otomatis dari BMKG ShakeMap
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// KOMPONEN PEMBANTU
const QuakeCard = ({ onShakeMap }: any) => (
  <View style={styles.mapCard}>
    <View style={styles.mapImageContainer}>
      <Image
        source={require("../../assets/images/navigation-map.png")}
        style={styles.mapImage}
      />
      <View style={styles.mapButtons}>
        <TouchableOpacity style={styles.mapButton} onPress={onShakeMap}>
          <Feather name="map" size={12} color="white" />
          <Text style={styles.mapButtonText}>PETA GUNCANGAN</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.mapButton}>
          <Feather name="share" size={12} color="white" />
          <Text style={styles.mapButtonText}>BAGIKAN</Text>
        </TouchableOpacity>
      </View>
    </View>
    <View style={styles.metricsRow}>
      <MetricItem icon="triangle-wave" value="4.1" label="Magnitudo" />
      <MetricItem icon="rss" value="7 KM" label="Kedalaman" />
      <MetricItem icon="compass" value="7.12" label="LS" />
      <MetricItem icon="compass" value="107.45" label="BT" />
    </View>
    <View style={styles.details}>
      <DetailItem
        icon="location"
        label="Lokasi Gempa :"
        value="12 km Timur Laut Kab. Bandung"
      />
      <DetailItem
        icon="alarm-outline"
        label="Waktu :"
        value="16 Des 2025, 10:03:11 WIB"
      />
      <DetailItem
        icon="alert-circle"
        label="Skala MMI :"
        value="Tidak dirasakan"
      />
      <DetailItem icon="walk" label="Jarak :" value="22 KM dari Bandung" />
    </View>
  </View>
);

const MetricItem = ({ icon, value, label }: any) => (
  <View style={styles.metric}>
    {icon === "triangle-wave" ? (
      <MaterialCommunityIcons name={icon} size={20} color="#1E6F9F" />
    ) : (
      <Feather name={icon} size={20} color="#1E6F9F" />
    )}
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

const DetailItem = ({ icon, label, value }: any) => (
  <View style={styles.detailItem}>
    {icon === "walk" ? (
      <MaterialCommunityIcons name="walk" size={22} color="#1E6F9F" />
    ) : (
      <Ionicons name={icon} size={22} color="#1E6F9F" />
    )}
    <View style={styles.detailTexts}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  </View>
);

// KOMPONEN MODAL INFO (Gampang di-reuse)
const InfoModal = ({ visible, onClose, title, desc }: any) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <Pressable style={styles.modalOverlay} onPress={onClose}>
      <View style={styles.infoCard}>
        <Ionicons
          name="information-circle"
          size={40}
          color="#1E6F9F"
          style={{ alignSelf: "center", marginBottom: 12 }}
        />
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoDesc}>{desc}</Text>
        <TouchableOpacity style={styles.infoButton} onPress={onClose}>
          <Text style={styles.infoButtonText}>Mengerti</Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  </Modal>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  greetingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 10,
    marginTop: 5,
  },
  greeting: { fontSize: 24, fontWeight: "bold", color: "#000" },
  date: { color: "#000", fontWeight: "bold", fontSize: 14 },
  locationCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 10,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  locationImage: {
    width: "100%",
    height: 125,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  locationText: {
    position: "absolute",
    top: 10,
    left: 10,
    color: "#fff",
    fontWeight: "bold",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 15,
    backgroundColor: "#F5F7FA",
    marginTop: -10,
  },
  statItem: { alignItems: "center" },
  statLabel: { fontSize: 10, color: "#777" },
  statValue: { fontWeight: "bold" },

  bottomSection: {
    backgroundColor: "#0C4A6E",
    marginTop: -1,
    paddingBottom: 10,
    flex: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: "center",
  },
  sectionTitle: { color: "#fff", fontSize: 20, fontWeight: "bold", flex: 1 },

  // PAGINATION DOTS STYLE
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
  },
  dot: { borderRadius: 5, marginHorizontal: 4 },
  dotActive: { width: 20, height: 8, backgroundColor: "#fff" },
  dotInactive: {
    width: 8,
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },

  mapCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 16,
    paddingBottom: 15,
    marginBottom: 10,
  },
  mapImageContainer: { position: "relative" },
  mapImage: {
    width: "100%",
    height: 180,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  mapButtons: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    gap: 6,
  },
  mapButton: {
    backgroundColor: "#0891B2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  mapButtonText: { color: "#fff", fontSize: 10 },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 15,
  },
  metric: { marginTop: 8, alignItems: "center" },
  metricValue: { fontWeight: "bold", fontSize: 12 },
  metricLabel: { fontSize: 12, color: "#000" },
  details: { paddingHorizontal: 15, paddingTop: 5 },
  detailItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 10,
  },
  detailTexts: { flex: 1 },
  detailLabel: { fontSize: 13, color: "#555" },
  detailValue: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#000",
    marginTop: 1,
  },

  // MODAL STYLES (Balik Lagi)
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "85%",
    padding: 24,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    marginBottom: 12,
  },
  infoDesc: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  infoButton: {
    backgroundColor: "#1E6F9F",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  infoButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  modalOverlayBottom: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalCardBottom: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    width: "100%",
  },
  modalHeaderBottom: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitleBottom: { color: "#0C4A6E", fontWeight: "bold", fontSize: 16 },
  modalSubtitle: { fontSize: 11, color: "#777" },
  maximizedImage: { width: SCREEN_WIDTH, height: 600, marginTop: 10 },
  modalFooter: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    backgroundColor: "#fafafa",
  },
  scrollHint: {
    textAlign: "center",
    fontSize: 12,
    color: "#1E6F9F",
    fontWeight: "500",
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: "#ccc",
    borderRadius: 10,
    alignSelf: "center",
    marginTop: 12,
  },
  modalCloseCircle: {
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    padding: 4,
  },
});
