import { Ionicons } from "@expo/vector-icons";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Home() {
  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.logo}>SeismoTrack</Text>

          <TouchableOpacity style={styles.notification}>
            <Ionicons name="notifications-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* GREETING */}
        <Text style={styles.greeting}>Halo, fasya</Text>
        <Text style={styles.date}>Thursday, 7 August 2025</Text>

        {/* LOCATION CARD */}
        <View style={styles.locationCard}>
          <Image
            source={require("../../assets/images/seismo-track-logo.png")}
            style={styles.locationImage}
          />

          <Text style={styles.locationText}>
            <Ionicons name="location-outline" size={16} /> BANDUNG
          </Text>

          {/* STATS */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={20} color="#1E6F9F" />
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

        {/* SECTION TITLE */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Gempabumi Terakhir Dirasakan</Text>
          <Ionicons name="information-circle-outline" size={20} color="#fff" />
        </View>

        {/* MAP CARD */}
        <View style={styles.mapCard}>
          <Image
            source={require("../../assets/images/navigation-map.png")}
            style={styles.mapImage}
          />

          {/* MAP BUTTONS */}
          <View style={styles.mapButtons}>
            <TouchableOpacity style={styles.mapButton}>
              <Text style={styles.mapButtonText}>PETA GUNCANGAN</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.mapButton}>
              <Text style={styles.mapButtonText}>BAGIKAN</Text>
            </TouchableOpacity>
          </View>

          {/* METRICS */}
          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>4.1</Text>
              <Text style={styles.metricLabel}>Magnitudo</Text>
            </View>

            <View style={styles.metric}>
              <Text style={styles.metricValue}>7 KM</Text>
              <Text style={styles.metricLabel}>Kedalaman</Text>
            </View>

            <View style={styles.metric}>
              <Text style={styles.metricValue}>7.12</Text>
              <Text style={styles.metricLabel}>LS</Text>
            </View>

            <View style={styles.metric}>
              <Text style={styles.metricValue}>107.45</Text>
              <Text style={styles.metricLabel}>BT</Text>
            </View>
          </View>

          {/* DETAILS */}
          <View style={styles.details}>
            <Text style={styles.detailText}>
              📍 Lokasi Gempa : 18 km Selatan Kabupaten Bandung, Jawa Barat
            </Text>

            <Text style={styles.detailText}>
              🕒 Waktu : 16 Des 2025, 12:41:28 WIB
            </Text>

            <Text style={styles.detailText}>
              ⚠ Wilayah Dirasakan (Skala MMI) : III Kabupaten Bandung
            </Text>

            <Text style={styles.detailText}>📏 Jarak : 65 KM dari Bandung</Text>
          </View>
        </View>
      </ScrollView>

      {/* BOTTOM NAV */}
      <View style={styles.bottomNav}>
        <Ionicons name="home-outline" size={24} color="#1E6F9F" />
        <Ionicons name="pulse-outline" size={24} color="#777" />
        <Ionicons name="time-outline" size={24} color="#777" />
        <Ionicons name="person-outline" size={24} color="#777" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E5A78",
    paddingTop: 50,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  logo: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },

  notification: {
    backgroundColor: "#1E6F9F",
    padding: 10,
    borderRadius: 10,
  },

  greeting: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    paddingHorizontal: 20,
    marginTop: 10,
  },

  date: {
    color: "#cde4f3",
    paddingHorizontal: 20,
    marginBottom: 15,
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
    padding: 15,
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
    fontSize: 16,
    fontWeight: "bold",
  },

  mapCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 16,
    paddingBottom: 15,
  },

  mapImage: {
    width: "100%",
    height: 180,
  },

  mapButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: -40,
    marginRight: 10,
  },

  mapButton: {
    backgroundColor: "#1E6F9F",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 6,
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
    alignItems: "center",
  },

  metricValue: {
    fontWeight: "bold",
  },

  metricLabel: {
    fontSize: 12,
    color: "#777",
  },

  details: {
    paddingHorizontal: 15,
  },

  detailText: {
    fontSize: 12,
    marginBottom: 6,
  },

  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 15,
    backgroundColor: "#fff",
  },
});
