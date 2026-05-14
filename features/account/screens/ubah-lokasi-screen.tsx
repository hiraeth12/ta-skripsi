// ─── ubah-lokasi-screen.tsx ────────────────────────────────────────────────────
// Only the profile-read and the save (optimistic update) differ from original.

import { useHaversine } from "@/hooks/use-haversine";
import { EvilIcons, Ionicons } from "@expo/vector-icons";
import { getApp } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";
import { getDatabase, ref, update } from "@react-native-firebase/database";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ProfilePageLayout from "../components/profile-page-layout";
import { useProfileContext } from "../profile-context";
import { styles } from "./styles/ubah-lokasi-styles";

function findNearestLocation(
  gpsLat: number,
  gpsLon: number,
  locations: any[],
  haversineDistanceKm: (a: number, b: number, c: number, d: number) => number,
) {
  if (!locations.length) return null;
  return locations.reduce(
    (nearest, loc) => {
      const d = haversineDistanceKm(gpsLat, gpsLon, loc.latitude, loc.longitude);
      return d < nearest.dist ? { loc, dist: d } : nearest;
    },
    {
      loc: locations[0],
      dist: haversineDistanceKm(gpsLat, gpsLon, locations[0].latitude, locations[0].longitude),
    },
  ).loc;
}

export default function UbahLokasi() {
  const router = useRouter();
  const { haversineDistanceKm } = useHaversine();
  const { profile, setProfile } = useProfileContext(); // ← no local fetch

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedLocationItem, setSelectedLocationItem] = useState<any>(null);
  const [allLocations, setAllLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsMessage, setGpsMessage] = useState("Sedang mencari lokasi GPS Anda...");

  // Locations list is NOT profile data — still fetched locally once
  useState(() => {
    const fetchLocations = async () => {
      try {
        const dbUrl = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
        if (!dbUrl) throw new Error("Database URL not configured");
        const res = await fetch(`${dbUrl}/locations.json`);
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const data = await res.json();
        setAllLocations(
          Object.entries(data || {}).map(([id, loc]: any) => ({
            id,
            name: loc.name || "",
            desc: loc.alt_name || loc.name || "",
            latitude: loc.latitude,
            longitude: loc.longitude,
          })),
        );
      } catch {
        setAllLocations([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLocations();
  });

  const filteredLocations = allLocations.filter(
    (item) =>
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.desc.toLowerCase().includes(query.toLowerCase()),
  );

  const handleSelect = (item: any) => {
    setSelectedLocation(`${item.name}, ${item.desc}`);
    setSelectedLocationItem(item);
    setLocationModalVisible(false);
    setQuery("");
  };

  const handleUseGPS = async () => {
    setGpsLoading(true);
    setGpsMessage("Meminta izin akses lokasi...");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Ditolak", "Aktifkan izin lokasi di pengaturan.");
        return;
      }
      setGpsMessage("Sedang menentukan posisi Anda...");
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      const nearest = findNearestLocation(latitude, longitude, allLocations, haversineDistanceKm);
      const name = nearest?.name ?? "Lokasi GPS";
      const desc = nearest?.desc ?? "";
      setSelectedLocation(desc ? `${name}, ${desc}` : name);
      setSelectedLocationItem({ name, latitude, longitude });
    } catch {
      Alert.alert("Error", "Tidak dapat mengakses GPS.");
    } finally {
      setGpsLoading(false);
    }
  };

  const handleSimpan = async () => {
    if (!selectedLocationItem) {
      Alert.alert("Error", "Silakan pilih lokasi terlebih dahulu");
      return;
    }
    try {
      const app = getApp();
      const auth = getAuth(app);
      const user = auth.currentUser;
      if (user) {
        const dbUrl = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
        const db = dbUrl ? getDatabase(app, dbUrl) : getDatabase(app);
        await update(ref(db, `users/${user.uid}`), {
          latitude: selectedLocationItem.latitude?.toFixed(6) ?? selectedLocationItem.latitude,
          longitude: selectedLocationItem.longitude?.toFixed(6) ?? selectedLocationItem.longitude,
          locationName: selectedLocationItem.name,
          locationUpdatedAt: new Date().toISOString(),
        });
      }
    } catch {
      Alert.alert("Error", "Gagal menyimpan lokasi ke database");
      return;
    }

    // ── Optimistic update ─────────────────────────────────────────────────────
    setProfile((prev) => ({ ...prev, location: selectedLocationItem.name }));

    setShowSuccessModal(true);
    setTimeout(() => {
      setShowSuccessModal(false);
      router.replace("/main-menu/account");
    }, 1500);
  };

  return (
    <>
      <ProfilePageLayout
        title="Ubah Lokasi"
        headerName={profile.name}
        headerEmail={profile.email}
        headerLocation={profile.location}
        headerInitials={profile.initials}
      >
        <View style={styles.inputCard}>
          <Text style={styles.description}>Silahkan Pilih Lokasi Anda atau Menggunakan Mode GPS</Text>

          <View style={styles.inputArea}>
            <Text style={styles.label}>Cari Lokasi</Text>
            <TouchableOpacity
              style={styles.customInput}
              onPress={() => setLocationModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.inputText, !selectedLocation && { color: "#999" }]} numberOfLines={1}>
                {selectedLocation || "Cari Kelurahan atau Desa..."}
              </Text>
              <EvilIcons name="chevron-down" size={24} color="#1E6F9F" />
            </TouchableOpacity>
          </View>

          <Text style={styles.orText}>Atau</Text>

          <View style={styles.gpsWrapper}>
            <TouchableOpacity
              style={[styles.btnGPS, gpsLoading && styles.btnGPSLoading]}
              activeOpacity={0.8}
              onPress={handleUseGPS}
              disabled={gpsLoading}
            >
              {gpsLoading ? (
                <View style={styles.gpsButtonInner}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.btnTextGPS}>{gpsMessage}</Text>
                </View>
              ) : (
                <View style={styles.gpsButtonInner}>
                  <Ionicons name="navigate" size={18} color="#ffffff" />
                  <Text style={styles.btnTextGPS}>Pakai GPS</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.buttonWrapper}>
            <TouchableOpacity style={styles.btnBatal} onPress={() => router.back()}>
              <Text style={styles.btnTextBatal}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSimpan} onPress={handleSimpan}>
              <Text style={styles.btnTextSimpan}>Simpan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ProfilePageLayout>

      {/* Modal list lokasi */}
      <Modal animationType="slide" transparent visible={locationModalVisible} onRequestClose={() => setLocationModalVisible(false)}>
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
              <Ionicons name="search" size={18} color="#999" style={{ marginLeft: 10 }} />
              <TextInput
                style={styles.modalInput}
                placeholder="Ketik nama desa atau kecamatan..."
                autoFocus
                value={query}
                onChangeText={setQuery}
              />
            </View>
            <FlatList
              data={filteredLocations}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.locListItem} onPress={() => handleSelect(item)}>
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

      {/* Modal berhasil */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => { setShowSuccessModal(false); router.replace("/main-menu/account"); }}>
          <View style={styles.infoCard}>
            <Ionicons name="checkmark-circle" size={50} color="#1E6F9F" style={{ alignSelf: "center", marginBottom: 12 }} />
            <Text style={styles.infoTitle}>Berhasil</Text>
            <Text style={styles.infoDesc}>Lokasi Anda telah berhasil diperbarui di sistem SeismoTrack.</Text>
            <TouchableOpacity style={styles.infoButton} onPress={() => { setShowSuccessModal(false); router.replace("/main-menu/account"); }}>
              <Text style={styles.infoButtonText}>Mengerti</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}