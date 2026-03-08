import {
  EvilIcons,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function UbahLokasi() {
  const router = useRouter();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");

  const profile = {
    name: "Fasya Burhanis syauqi",
    email: "fasyaburhaniss@gmail.com",
    location: "Bandung",
    phone: "081-3983-8389",
    initials: "FBS",
  };

  const allLocations = [
    {
      id: "1",
      name: "Kemayoran",
      desc: "Kota Adm. Jakarta Pusat, DKI Jakarta",
    },
    { id: "2", name: "Kemayoran", desc: "Kota Surabaya, Jawa Timur" },
    { id: "3", name: "Kemayoran", desc: "Bangkalan, Jawa Timur" },
    {
      id: "4",
      name: "Utan Panjang",
      desc: "Kota Adm. Jakarta Pusat, DKI Jakarta",
    },
    {
      id: "5",
      name: "Sumur Batu",
      desc: "Kota Adm. Jakarta Pusat, DKI Jakarta",
    },
  ];

  const filteredLocations = allLocations.filter(
    (item) =>
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.desc.toLowerCase().includes(query.toLowerCase()),
  );

  const handleSelect = (item: any) => {
    setSelectedLocation(`${item.name}, ${item.desc}`);
    setLocationModalVisible(false);
    setQuery("");
  };

  const handleSimpan = () => {
    setShowSuccessModal(true);
  };

  return (
    <View style={styles.container}>
      {/* HEADER PROFIL */}
      <View style={styles.headerSection}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{profile.initials}</Text>
          <TouchableOpacity style={styles.editBadge}>
            <MaterialCommunityIcons name="camera" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>{profile.name}</Text>
        <Text style={styles.userDetails}>{profile.email}</Text>
        <Text style={styles.userDetails}>{profile.location}</Text>
        <Text style={styles.userDetails}>{profile.phone}</Text>
      </View>

      {/* AREA BIRU */}
      <View style={styles.menuContainer}>
        <View style={styles.menuContent}>
          <View style={styles.titleRow}>
            <Text style={styles.sectionTitle}>Ubah Lokasi</Text>
          </View>

          <View style={styles.inputCard}>
            <Text style={styles.description}>
              Silahkan Pilih Lokasi Anda atau Menggunakan Mode GPS
            </Text>

            <View style={styles.inputArea}>
              <Text style={styles.label}>Cari Lokasi</Text>
              <TouchableOpacity
                style={styles.customInput}
                onPress={() => setLocationModalVisible(true)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.inputText,
                    !selectedLocation && { color: "#999" },
                  ]}
                  numberOfLines={1}
                >
                  {selectedLocation || "Cari Kelurahan atau Desa..."}
                </Text>
                <EvilIcons name="chevron-down" size={24} color="#1E6F9F" />
              </TouchableOpacity>
            </View>

            <Text style={styles.orText}>Atau</Text>

            {/* TOMBOL GPS - SUDAH DISESUAIKAN UKURANNYA */}
            <View style={styles.gpsWrapper}>
              <TouchableOpacity style={styles.btnGPS} activeOpacity={0.8}>
                <Text style={styles.btnTextGPS}>Pakai GPS</Text>
              </TouchableOpacity>
            </View>

            {/* ACTION BUTTONS */}
            <View style={styles.buttonWrapper}>
              <TouchableOpacity
                style={styles.btnBatal}
                onPress={() => router.back()}
              >
                <Text style={styles.btnTextBatal}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSimpan} onPress={handleSimpan}>
                <Text style={styles.btnTextSimpan}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* MODAL LIST LOKASI */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={locationModalVisible}
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <View style={styles.bottomSheetContent}>
            <View style={styles.handleBar} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Lokasi</Text>
              <TouchableOpacity onPress={() => setLocationModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#ccc" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchBarContainer}>
              <Ionicons
                name="search"
                size={18}
                color="#999"
                style={{ marginLeft: 10 }}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Ketik nama desa atau kecamatan..."
                autoFocus={true}
                value={query}
                onChangeText={setQuery}
              />
            </View>
            <FlatList
              data={filteredLocations}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.locListItem}
                  onPress={() => handleSelect(item)}
                >
                  <View style={styles.iconCircle}>
                    <Ionicons name="map-outline" size={20} color="#1E6F9F" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.locName}>{item.name}</Text>
                    <Text style={styles.locDesc}>{item.desc}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#ccc" />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* MODAL BERHASIL */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowSuccessModal(false)}
        >
          <View style={styles.infoCard}>
            <Ionicons
              name="checkmark-circle"
              size={50}
              color="#1E6F9F"
              style={{ alignSelf: "center", marginBottom: 12 }}
            />
            <Text style={styles.infoTitle}>Berhasil</Text>
            <Text style={styles.infoDesc}>
              Lokasi Anda telah berhasil diperbarui di sistem SeismoTrack.
            </Text>
            <TouchableOpacity
              style={styles.infoButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.infoButtonText}>Mengerti</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  headerSection: {
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "#fff",
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#D81B60",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    position: "relative",
  },
  editBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#1E6F9F",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarText: { color: "#fff", fontSize: 32, fontWeight: "bold" },
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 5,
  },
  userDetails: { fontSize: 14, color: "#555", marginBottom: 2 },

  menuContainer: {
    flex: 1,
    backgroundColor: "#0C4A6E",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  menuContent: { paddingHorizontal: 20, paddingTop: 20, flex: 1 },
  titleRow: { marginBottom: 15 },
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },

  inputCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  description: {
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 14,
    color: "#333",
    marginBottom: 25,
    lineHeight: 20,
  },
  inputArea: { marginBottom: 15 },
  label: { fontSize: 16, fontWeight: "bold", color: "#000", marginBottom: 10 },
  customInput: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    paddingVertical: 8,
  },
  inputText: { flex: 1, fontSize: 14, color: "#333" },
  orText: {
    textAlign: "center",
    marginVertical: 10,
    fontWeight: "bold",
    color: "#000",
  },

  // PERBAIKAN TOMBOL GPS
  gpsWrapper: { alignItems: "center", marginBottom: 25 },
  btnGPS: {
    backgroundColor: "#0870A5",
    paddingVertical: 10,
    paddingHorizontal: 40, // Memberi jarak agar tombol tidak kepanjangan
    borderRadius: 8,
    alignItems: "center",
  },
  btnTextGPS: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  buttonWrapper: { flexDirection: "row", justifyContent: "space-between" },
  btnBatal: {
    flex: 1,
    marginRight: 10,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D1D1",
    alignItems: "center",
  },
  btnSimpan: {
    flex: 1,
    marginLeft: 10,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#1E6F9F",
    alignItems: "center",
  },
  btnTextBatal: { color: "#999", fontWeight: "bold" },
  btnTextSimpan: { color: "#fff", fontWeight: "bold" },

  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  bottomSheetContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    height: "85%",
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: "#EEE",
    borderRadius: 10,
    alignSelf: "center",
    marginBottom: 15,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#333" },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    marginBottom: 20,
  },
  modalInput: { flex: 1, padding: 12, fontSize: 15 },
  locListItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F9F9F9",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F4F8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  locName: { fontSize: 16, fontWeight: "bold", color: "#333" },
  locDesc: { fontSize: 12, color: "#888", marginTop: 2 },

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
});
