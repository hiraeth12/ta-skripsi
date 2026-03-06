import { Ionicons } from "@expo/vector-icons";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Home() {
  const [shakeMapVisible, setShakeMapVisible] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);
  const user = { name: "Budi" };
  const shakeMapUrl =
    "https://bmkg-content-inatews.storage.googleapis.com/20260305205910_rev/intensity_logo.jpg";

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {/* GREETING */}
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.greeting}>Halo, {user.name} !</Text>
            <Text style={styles.date}>Thursday, 7 August 2025</Text>
          </View>
        </View>

        {/* LOCATION CARD */}
        <View style={styles.locationCard}>
          <Image
            source={require("../../assets/images/bandung.jpg")}
            style={styles.locationImage}
          />

          <Text style={styles.locationText}>
            <Ionicons name="location-outline" size={16} /> BANDUNG
          </Text>

          {/* STATS */}
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

        {/* DIFFERENT SECTION */}
        <View style={styles.bottomSection}>
          {/* SECTION TITLE */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Gempabumi Terakhir Dirasakan
            </Text>
            <TouchableOpacity onPress={() => setInfoVisible(true)}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color="#fff"
              />
            </TouchableOpacity>
          </View>

          {/* MAP CARD */}
          <View style={styles.mapCard}>
            <View style={styles.mapImageContainer}>
              <Image
                source={require("../../assets/images/navigation-map.png")}
                style={styles.mapImage}
              />

              {/* MAP BUTTONS */}
              <View style={styles.mapButtons}>
                <TouchableOpacity
                  style={styles.mapButton}
                  onPress={() => setShakeMapVisible(true)}
                >
                  <Feather name="map" size={12} color="white" />
                  <Text style={styles.mapButtonText}>PETA GUNCANGAN</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.mapButton}>
                  <Feather name="share" size={12} color="white" />
                  <Text style={styles.mapButtonText}>BAGIKAN</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* METRICS */}
            <View style={styles.metricsRow}>
              <View style={styles.metric}>
                <MaterialCommunityIcons
                  name="triangle-wave"
                  size={20}
                  color="#1E6F9F"
                />
                <Text style={styles.metricValue}>4.1</Text>
                <Text style={styles.metricLabel}>Magnitudo</Text>
              </View>

              <View style={styles.metric}>
                <Feather name="rss" size={20} color="#1E6F9F" />
                <Text style={styles.metricValue}>7 KM</Text>
                <Text style={styles.metricLabel}>Kedalaman</Text>
              </View>

              <View style={styles.metric}>
                <Feather name="compass" size={20} color="#1E6F9F" />
                <Text style={styles.metricValue}>7.12</Text>
                <Text style={styles.metricLabel}>LS</Text>
              </View>

              <View style={styles.metric}>
                <Feather name="compass" size={20} color="#1E6F9F" />
                <Text style={styles.metricValue}>107.45</Text>
                <Text style={styles.metricLabel}>BT</Text>
              </View>
            </View>

            {/* DETAILS */}
            <View style={styles.details}>
              <View style={styles.detailItem}>
                <Ionicons name="location" size={22} color="#1E6F9F" />
                <View style={styles.detailTexts}>
                  <Text style={styles.detailLabel}>Lokasi Gempa :</Text>
                  <Text style={styles.detailValue}>
                    12 km Timur Laut Kabupaten Bandung, Jawa Barat
                  </Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <Ionicons name="alarm-outline" size={22} color="#1E6F9F" />
                <View style={styles.detailTexts}>
                  <Text style={styles.detailLabel}>Waktu :</Text>
                  <Text style={styles.detailValue}>
                    16 Des 2025, 10:03:11 WIB
                  </Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <Ionicons name="alert-circle" size={22} color="#1E6F9F" />
                <View style={styles.detailTexts}>
                  <Text style={styles.detailLabel}>
                    Wilayah Dirasakan (Skala MMI) :
                  </Text>
                  <Text style={styles.detailValue}>Tidak dirasakan</Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="walk" size={22} color="#1E6F9F" />
                <View style={styles.detailTexts}>
                  <Text style={styles.detailLabel}>Jarak :</Text>
                  <Text style={styles.detailValue}>22 KM dari Bandung</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* INFO MODAL */}
      <Modal
        visible={infoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setInfoVisible(false)}
        >
          <Pressable style={styles.infoCard} onPress={() => {}}>
            <Ionicons
              name="information-circle"
              size={40}
              color="#1E6F9F"
              style={{ alignSelf: "center", marginBottom: 12 }}
            />
            <Text style={styles.infoTitle}>Gempabumi Terakhir Dirasakan</Text>
            <Text style={styles.infoDesc}>
              Gempabumi Terakhir Dirasakan menampilkan kejadian gempa yang
              getarannya dirasakan oleh manusia dan dilaporkan di wilayah
              sekitar.
            </Text>
            <TouchableOpacity
              style={styles.infoButton}
              onPress={() => setInfoVisible(false)}
            >
              <Text style={styles.infoButtonText}>Mengerti</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* SHAKEMAP MODAL */}
      <Modal
        visible={shakeMapVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setShakeMapVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShakeMapVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>PETA GUNCANGAN</Text>
              <TouchableOpacity
                onPress={() => setShakeMapVisible(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Shakemap Image */}
            <Image
              source={{ uri: shakeMapUrl }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EDEDED",
  },

  greetingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 15,
  },


  greeting: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000000",
  },

  date: {
    color: "#000000",
    fontWeight: "bold",
    fontSize: 14,
  },

  locationCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: "hidden",
  },

  locationImage: {
    width: "100%",
    height: 120,
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

    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,

    marginTop: -10,
  },
  statItem: {
    alignItems: "center",
  },

  statLabel: {
    fontSize: 10,
    color: "#777",
  },

  statValue: {
    fontWeight: "bold",
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    alignItems: "center",
  },

  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },

  mapCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 16,
    paddingBottom: 15,
  },

  mapImageContainer: {
    position: "relative",
  },

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

  mapButtonText: {
    color: "#fff",
    fontSize: 10,
  },

  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 15,
  },

  metric: {
    marginTop: 8,
    alignItems: "center",
  },

  metricValue: {
    fontWeight: "bold",
    fontSize: 12,
  },

  metricLabel: {
    fontSize: 12,
    color: "#000000",
  },

  details: {
    paddingHorizontal: 15,
    paddingTop: 5,
  },

  detailItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 10,
  },

  detailTexts: {
    flex: 1,
  },

  detailLabel: {
    fontSize: 13,
    color: "#555",
  },

  detailValue: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#000",
    marginTop: 1,
  },

  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 15,
    backgroundColor: "#fff",
  },

  bottomSection: {
    backgroundColor: "#0C4A6E",
    marginTop: 15,
    paddingBottom: 20,
    flex: 1,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalCard: {
    backgroundColor: "#0C4A6E",
    borderRadius: 16,
    overflow: "hidden",
    width: "88%",
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    position: "relative",
  },

  modalTitle: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
    letterSpacing: 1,
  },

  modalClose: {
    position: "absolute",
    right: 12,
  },

  modalImage: {
    width: "100%",
    height: 300,
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

  infoButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
