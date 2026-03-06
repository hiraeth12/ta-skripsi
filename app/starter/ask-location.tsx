import AuthButton from "@/components/auth-button";
import { EvilIcons, Ionicons } from "@expo/vector-icons"; // Tambah Ionicons agar lebih variatif
import { useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";

export default function AskLocation() {
  const [query, setQuery] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("");
  const router = useRouter();

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
    setModalVisible(false);
    setQuery("");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <Image
          style={styles.logo}
          source={require("@/assets/images/SeismoTrack_2-removebg-preview.png")}
          resizeMode="contain"
        />

        <Image
          style={styles.image}
          source={require("@/assets/images/Navigation-amico (1) 1.png")}
          resizeMode="contain"
        />

        <Text style={styles.description}>Dimana lokasi Anda saat ini?</Text>

        <View style={styles.inputArea}>
          <TouchableOpacity
            style={styles.customInput}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="location-sharp"
              size={20}
              color="#1E6F9F"
              style={{ marginRight: 10 }}
            />
            <Text
              style={[styles.inputText, !selectedLocation && { color: "#999" }]}
              numberOfLines={1}
            >
              {selectedLocation || "Cari Kelurahan atau Desa..."}
            </Text>
            <EvilIcons name="search" size={24} color="#1E6F9F" />
          </TouchableOpacity>
        </View>

        <Text style={styles.orText}>Atau deteksi otomatis</Text>

        <View style={styles.buttonWrapper}>
          <AuthButton title="Gunakan GPS" onPress={() => {router.push("/main-menu/home")}} />
        </View>

        
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.bottomSheetOverlay}>
            <View style={styles.bottomSheetContent}>
              <View style={styles.handleBar} />

              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Pilih Lokasi</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
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
                    style={styles.locationCard}
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#EDEDED" },
  scrollContainer: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100%",
  },
  logo: { width: 160, height: 50, marginBottom: 30, marginTop: 20 },
  image: { width: 220, height: 220, marginBottom: 20 },
  description: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
    color: "#333",
  },
  inputArea: { width: "100%" },
  customInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#DDD",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  inputText: { flex: 1, fontSize: 14, color: "#000" },
  orText: {
    textAlign: "center",
    marginVertical: 20,
    color: "#777",
    fontSize: 14,
  },
  buttonWrapper: { width: "100%", alignItems: "center" },

  
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
  locationCard: {
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
});
