import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function PengaturanProfil() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  // State Utama (Data yang tampil di Header)
  const [profile, setProfile] = useState({
    namaDepan: "Fasya Burhanis",
    namaBelakang: "Syauqi",
    email: "fasyaburhaniss@gmail.com",
    nomorPonsel: "081-3983-8389",
  });

  // State Sementara (Untuk Input Field agar data di header tidak langsung berubah)
  const [tempForm, setTempForm] = useState({ ...profile });

  const handleSimpan = () => {
    setProfile({ ...tempForm });
    setShowModal(true);
  };

  return (
    <View style={styles.container}>
      {/* HEADER PROFIL - Disamakan persis dengan Account.tsx */}
      <View style={styles.headerSection}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>FBS</Text>
          <TouchableOpacity style={styles.editBadge}>
            <MaterialCommunityIcons name="camera" size={14} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.userName}>
          {`${profile.namaDepan} ${profile.namaBelakang}`}
        </Text>
        <Text style={styles.userDetails}>{profile.email}</Text>
        <Text style={styles.userDetails}>Bandung</Text>
        <Text style={styles.userDetails}>{profile.nomorPonsel}</Text>
      </View>

      {/* FORM SECTION - Area Biru Gelap Selaras */}
      <View style={styles.menuContainer}>
        <View style={styles.menuContent}>
          <View style={styles.titleRow}>
            <Text style={styles.sectionTitle}>Pengaturan Profil</Text>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.inputCard}>
              {/* Input Area Selaras dengan style Starter */}
              <View style={styles.inputArea}>
                <Text style={styles.label}>Nama Depan</Text>
                <TextInput
                  style={styles.input}
                  value={tempForm.namaDepan}
                  onChangeText={(txt) =>
                    setTempForm({ ...tempForm, namaDepan: txt })
                  }
                  selectionColor="#1E6F9F"
                />
              </View>

              <View style={styles.inputArea}>
                <Text style={styles.label}>Nama Belakang</Text>
                <TextInput
                  style={styles.input}
                  value={tempForm.namaBelakang}
                  onChangeText={(txt) =>
                    setTempForm({ ...tempForm, namaBelakang: txt })
                  }
                  selectionColor="#1E6F9F"
                />
              </View>

              <View style={styles.inputArea}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={tempForm.email}
                  keyboardType="email-address"
                  onChangeText={(txt) =>
                    setTempForm({ ...tempForm, email: txt })
                  }
                  selectionColor="#1E6F9F"
                />
              </View>

              <View style={styles.inputArea}>
                <Text style={styles.label}>Nomor Ponsel</Text>
                <TextInput
                  style={styles.input}
                  value={tempForm.nomorPonsel}
                  keyboardType="phone-pad"
                  onChangeText={(txt) =>
                    setTempForm({ ...tempForm, nomorPonsel: txt })
                  }
                  selectionColor="#1E6F9F"
                />
              </View>

              {/* Action Buttons Selaras */}
              <View style={styles.buttonWrapper}>
                <TouchableOpacity
                  style={styles.btnBatal}
                  onPress={() => router.back()}
                >
                  <Text style={styles.btnTextBatal}>Batal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnSimpan}
                  onPress={handleSimpan}
                >
                  <Text style={styles.btnTextSimpan}>Simpan</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>

      {/* MODAL SUKSES */}
      <Modal visible={showModal} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowModal(false)}
        >
          <View style={styles.infoCard}>
            <Ionicons
              name="checkmark-circle"
              size={50}
              color="#1E6F9F"
              style={styles.modalIcon}
            />
            <Text style={styles.infoTitle}>Berhasil</Text>
            <Text style={styles.infoDesc}>
              Profil Anda telah berhasil diperbarui di sistem SeismoTrack.
            </Text>
            <TouchableOpacity
              style={styles.infoButton}
              onPress={() => setShowModal(false)}
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
  menuContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    flex: 1,
  },
  titleRow: { marginBottom: 15 },
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  scrollContent: { paddingBottom: 20 },

  // INPUT CARD - Diselaraskan dengan MenuItem di Account.tsx
  inputCard: {
    backgroundColor: "#fff",
    borderRadius: 12, // Selaras dengan MenuItem
    padding: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  inputArea: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: "bold", color: "#000", marginBottom: 5 },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    paddingVertical: 8,
    fontSize: 14,
    color: "#333",
  },

  // BUTTONS
  buttonWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
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

  // MODAL STYLES
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
  modalIcon: { alignSelf: "center", marginBottom: 12 },
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
