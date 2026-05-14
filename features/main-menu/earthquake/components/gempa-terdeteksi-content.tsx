import { NetworkErrorModal } from "@/components/ui/network-error-modal";
import EarthquakeMap from "@/components/earthquake-map";
import type { MapViewType } from "@/constants/map";
import { useEarthquakeShare } from "@/hooks/use-earthquake-share";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  PanResponder,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { styles } from "./styles/gempa-terdeteksi-content.styles";

const API_URL = process.env.EXPO_PUBLIC_GEMPA_TERDETEKSI_API_URL!;

type LatestQuake = {
  latitude: number;
  longitude: number;
  magnitude: string;
  wilayah: string;
  tanggal: string;
  jam: string;
  kedalaman: string;
  felt: string;
  latText: string;
  lonText: string;
};

type Props = {
  tabBar: React.ReactNode;
  onLoadingChange?: (loading: boolean) => void;
  isActive?: boolean;
};

export default function GempaTerdeteksi({
  tabBar,
  onLoadingChange,
  isActive = true,
}: Props) {
  const { shareQuake } = useEarthquakeShare();
  const [latestQuake, setLatestQuake] = useState<LatestQuake | null>(null);
  const [showCard, setShowCard] = useState(false);
  const showCardRef = useRef(false);
  const networkErrorShownRef = useRef(false);
  const mapRef = useRef<MapViewType | null>(null);
  const translateY = useRef(new Animated.Value(600)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;
  const [networkErrorModalVisible, setNetworkErrorModalVisible] = useState(false);

  const showNetworkError = useCallback(() => {
    if (networkErrorShownRef.current) return;
    networkErrorShownRef.current = true;
    setNetworkErrorModalVisible(true);
  }, []);


  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) {
          translateY.setValue(gs.dy);
          opacity.setValue(Math.max(0, 1 - gs.dy / 300));
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80) {
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: 600,
              duration: 220,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 180,
              useNativeDriver: true,
            }),
            Animated.timing(btnOpacity, {
              toValue: 0,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start(() => {
            showCardRef.current = false;
            setShowCard(false);
          });
        } else {
          Animated.parallel([
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
            Animated.timing(opacity, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
            Animated.timing(btnOpacity, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    }),
  ).current;

  function openCard() {
    translateY.setValue(600);
    opacity.setValue(0);
    btnOpacity.setValue(0);
    showCardRef.current = true;
    setShowCard(true);
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        bounciness: 4,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(btnOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function dismissCard(callback?: () => void) {
    if (showCardRef.current) {
      showCardRef.current = false;
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 600,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(btnOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowCard(false);
        callback?.();
      });
    } else {
      callback?.();
    }
  }

  const hasFetchedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isActive) return;
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    abortRef.current = new AbortController();

    async function fetchLatestQuake() {
      onLoadingChange?.(true);
      try {
        if (!API_URL) {
          return;
        }
        const url = `${API_URL.trim()}${Date.now()}`;
        const res = await fetch(url, { signal: abortRef.current?.signal });
        const data = await res.json();

        const features = data?.features;
        if (!Array.isArray(features) || features.length === 0) return;
        const sorted = [...features].sort((a, b) => {
          const tA = a?.properties?.time ?? "";
          const tB = b?.properties?.time ?? "";
          return tB.localeCompare(tA);
        });
        const latest = sorted[0];
        if (!latest) return;

        const props = latest?.properties ?? {};
        const coords = latest?.geometry?.coordinates;
        const longitude = parseFloat(coords?.[0] ?? "0");
        const latitude = parseFloat(coords?.[1] ?? "0");
        if (isNaN(latitude) || isNaN(longitude)) return;

        const [tanggal, jamRaw] = (props.time ?? "").split(" ");
        const jam = (jamRaw ?? "").split(".")[0];
        const absLat = Math.abs(latitude).toFixed(2);
        const absLon = Math.abs(longitude).toFixed(2);

        setLatestQuake({
          latitude,
          longitude,
          magnitude: parseFloat(props.mag ?? "0").toFixed(1),
          wilayah: props.place ?? "",
          tanggal: tanggal ?? "",
          jam: jam ?? "",
          kedalaman: `${parseFloat(props.depth ?? "0").toFixed(1)} km`,
          felt: props.fase ?? "",
          latText: `${absLat}°${latitude < 0 ? "LS" : "LU"}`,
          lonText: `${absLon}°${longitude >= 0 ? "BT" : "BB"}`,
        });

        mapRef.current?.animateToRegion(
          { latitude, longitude, latitudeDelta: 2, longitudeDelta: 2 },
          800,
        );
      } catch (e) {
        if ((e as Error).name === "AbortError") return;

        // Perbaikan: Hanya panggil satu metode untuk menampilkan error
        if (
          !networkErrorShownRef.current &&
          e instanceof TypeError &&
          (e as Error).message.includes('Network')
        ) {
          // Cukup panggil fungsi ini, karena di dalamnya sudah mengeset ref dan state
          showNetworkError();
        }
      } finally {
        onLoadingChange?.(false);
      }
    }

    fetchLatestQuake();
    return () => abortRef.current?.abort();
  }, [isActive, onLoadingChange, showNetworkError]);

  return (
    <View style={styles.container}>
      <EarthquakeMap
        mapRef={mapRef}
        isCardOpen={showCard}
        markerCoordinate={
          latestQuake
            ? {
              latitude: latestQuake.latitude,
              longitude: latestQuake.longitude,
              magnitude: latestQuake.magnitude,
              depth: latestQuake.kedalaman,
            }
            : null
        }
        onMapPress={() => dismissCard()}
        onMarkerPress={() => openCard()}
      />

      <View style={styles.topControls}>
        {tabBar}
        {showCard && (
          <Animated.View style={[styles.mapButtons, { opacity: btnOpacity }]}>
            <TouchableOpacity
              style={styles.mapButton}
              onPress={() => shareQuake(latestQuake, "terdeteksi")}
            >
              <Feather name="share" size={12} color="white" />
              <Text style={styles.mapButtonText}>BAGIKAN</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      {showCard && latestQuake && (
        <Animated.View
          style={[
            styles.locationCard,
            { transform: [{ translateY }], opacity },
          ]}
        >
          <View {...panResponder.panHandlers} style={styles.dragHandleArea}>
            <View style={styles.dragHandle} />
          </View>

          <View style={styles.statsTopRow}>
            <View style={styles.statTopItem}>
              <MaterialCommunityIcons
                name="triangle-wave"
                size={20}
                color="#0369A1"
              />
              <Text style={styles.statTopValue}>{latestQuake.magnitude}</Text>
              <Text style={styles.statTopLabel}>Magnitudo</Text>
            </View>
            <View style={styles.statTopDivider} />
            <View style={styles.statTopItem}>
              <MaterialCommunityIcons name="rss" size={20} color="#0369A1" />
              <Text style={styles.statTopValue}>{latestQuake.kedalaman}</Text>
              <Text style={styles.statTopLabel}>Kedalaman</Text>
            </View>
            <View style={styles.statTopDivider} />
            <View style={styles.statTopItem}>
              <MaterialCommunityIcons
                name="compass-outline"
                size={20}
                color="#0369A1"
              />
              <Text style={styles.statTopValue}>{latestQuake.latText}</Text>
              <Text style={styles.statTopLabel}>LS</Text>
            </View>
            <View style={styles.statTopDivider} />
            <View style={styles.statTopItem}>
              <MaterialCommunityIcons
                name="compass-outline"
                size={20}
                color="#0369A1"
              />
              <Text style={styles.statTopValue}>{latestQuake.lonText}</Text>
              <Text style={styles.statTopLabel}>BT</Text>
            </View>
          </View>

          <View style={styles.separator} />

          <View style={styles.infoRow}>
            <Ionicons
              name="location"
              size={18}
              color="#1E6F9F"
              style={styles.infoIcon}
            />
            <View>
              <Text style={styles.infoLabel}>Lokasi Gempa :</Text>
              <Text style={styles.infoValue}>{latestQuake.wilayah}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Ionicons
              name="calendar-outline"
              size={18}
              color="#1E6F9F"
              style={styles.infoIcon}
            />
            <View>
              <Text style={styles.infoLabel}>Tanggal :</Text>
              <Text style={styles.infoValue}>{latestQuake.tanggal}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Ionicons
              name="time-outline"
              size={18}
              color="#1E6F9F"
              style={styles.infoIcon}
            />
            <View>
              <Text style={styles.infoLabel}>Jam :</Text>
              <Text style={styles.infoValue}>{latestQuake.jam}</Text>
            </View>
          </View>
          {!!latestQuake.felt && (
            <View style={styles.infoRow}>
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color="#1E6F9F"
                style={styles.infoIcon}
              />
              <View style={styles.infoTextFlex}>
                <Text style={styles.infoLabel}>Fase :</Text>
                <Text style={styles.infoValue}>{latestQuake.felt}</Text>
              </View>
            </View>
          )}
        </Animated.View>
      )}

      <NetworkErrorModal
        visible={networkErrorModalVisible}
        onClose={() => {
          setNetworkErrorModalVisible(false);
          networkErrorShownRef.current = false;
        }}
      />
    </View>
  );
}

