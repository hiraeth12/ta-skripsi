import { DetailItem } from "@/components/ui/quake-card";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState, type ReactElement } from "react";
import {
  Animated,
  FlatList,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TsunamiMapSlide = {
  title: string;
  imageUrl: string;
};

export type TsunamiWzArea = {
  province: string;
  district: string;
  level: string;
  date: string;
  time: string;
};

export type TsunamiObsArea = {
  location: string;
  loclatitude: string;
  loclongitude: string;
  height: string;
  date: string;
  time: string;
};

type ModalTsunamiInfoProps = {
  visible: boolean;
  onClose: () => void;
  mapSlides: TsunamiMapSlide[];
  wzAreas: TsunamiWzArea[];
  obsAreas: TsunamiObsArea[];
  headline?: string;
};

type CarouselSectionProps<T> = {
  title: string;
  data: T[];
  activeIndex: number;
  width: number;
  onIndexChange: (index: number) => void;
  keyExtractor: (item: T, index: number) => string;
  renderItem: (item: T, width: number) => ReactElement;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_VISIBLE_DOTS = 5;
/** Jarak drag ke bawah (px) sebelum modal ditutup */
const DRAG_CLOSE_THRESHOLD = 120;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const safeText = (value: unknown): string => {
  const text = String(value ?? "").trim();
  return text || "-";
};

const formatHeight = (height: string): string => {
  const value = safeText(height);
  return value === "-" ? value : `${value} m`;
};

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.min(Math.max(index, 0), length - 1);
}

/**
 * Hitung sliding window untuk pagination dot.
 * Maksimal MAX_VISIBLE_DOTS dot tampil, dot aktif selalu di tengah window.
 * hasBefore/hasAfter menandakan ada item di luar window yang ditampilkan
 * sebagai dot kecil overflow indicator.
 */
function getPaginationWindow(
  activeIndex: number,
  length: number,
): {
  indexes: number[];
  hasBefore: boolean;
  hasAfter: boolean;
  activeDotIndex: number;
} {
  if (length <= 0) {
    return {
      indexes: [],
      hasBefore: false,
      hasAfter: false,
      activeDotIndex: 0,
    };
  }

  const activeDotIndex = clampIndex(activeIndex, length);
  const visibleCount = Math.min(MAX_VISIBLE_DOTS, length);
  const halfWindow = Math.floor(visibleCount / 2);
  let start = activeDotIndex - halfWindow;
  let end = start + visibleCount - 1;

  if (start < 0) {
    start = 0;
    end = visibleCount - 1;
  }
  if (end >= length) {
    end = length - 1;
    start = Math.max(0, end - visibleCount + 1);
  }

  return {
    indexes: Array.from({ length: end - start + 1 }, (_, i) => start + i),
    hasBefore: start > 0,
    hasAfter: end < length - 1,
    activeDotIndex,
  };
}

// ---------------------------------------------------------------------------
// CarouselSection
// ---------------------------------------------------------------------------

function CarouselSection<T>({
  title,
  data,
  activeIndex,
  width,
  onIndexChange,
  keyExtractor,
  renderItem,
}: CarouselSectionProps<T>) {
  const handleMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    onIndexChange(clampIndex(nextIndex, data.length));
  };

  if (data.length === 0) return null;

  const pagination = getPaginationWindow(activeIndex, data.length);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>

      <FlatList
        data={data}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        directionalLockEnabled
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
        keyExtractor={keyExtractor}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        renderItem={({ item }) => renderItem(item, width)}
        // Jangan re-render FlatList saat hanya activeIndex yang berubah
        extraData={undefined}
      />

      {/* Pagination: teks "X / N" jika item > MAX_VISIBLE_DOTS, dot jika tidak */}
      {data.length > MAX_VISIBLE_DOTS ? (
        <View style={styles.paginationContainer}>
          <Text style={styles.paginationText}>
            {pagination.activeDotIndex + 1} / {data.length}
          </Text>
        </View>
      ) : (
        <View style={styles.paginationContainer}>
          {pagination.hasBefore && (
            <Text style={styles.dotOverflowIndicator}>{"\u2022"}</Text>
          )}
          {pagination.indexes.map((index) => (
            <View
              key={`dot-${index}`}
              style={[
                styles.dot,
                pagination.activeDotIndex === index
                  ? styles.dotActive
                  : styles.dotInactive,
              ]}
            />
          ))}
          {pagination.hasAfter && (
            <Text style={styles.dotOverflowIndicator}>{"\u2022"}</Text>
          )}
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// ModalTsunamiInfo
// ---------------------------------------------------------------------------

export function ModalTsunamiInfo({
  visible,
  onClose,
  mapSlides,
  wzAreas,
  obsAreas,
  headline,
}: ModalTsunamiInfoProps) {
  const { height, width } = useWindowDimensions();
  const [activeMapIndex, setActiveMapIndex] = useState(0);
  const [activeWzIndex, setActiveWzIndex] = useState(0);
  const [activeObsIndex, setActiveObsIndex] = useState(0);

  // Animated value untuk drag gesture
  const translateY = useRef(new Animated.Value(0)).current;

  // Opacity overlay di-interpolate dari translateY agar sinkron saat drag
  const overlayOpacity = translateY.interpolate({
    inputRange: [0, height * 0.9],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  // Reset posisi card setiap kali modal dibuka
  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
    }
  }, [visible, translateY]);

  // PanResponder hanya pada handle bar — tidak konflik dengan ScrollView
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        gestureState.dy > 5 &&
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy >= DRAG_CLOSE_THRESHOLD) {
          Animated.timing(translateY, {
            toValue: height,
            duration: 200,
            useNativeDriver: true,
          }).start(onClose);
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
    }),
  ).current;

  const headlineText = safeText(headline);
  const hasHeadline = headlineText !== "-";
  const hasAnyData =
    hasHeadline ||
    mapSlides.length > 0 ||
    wzAreas.length > 0 ||
    obsAreas.length > 0;

  // Reset index hanya saat DATA berubah, bukan saat visible toggle.
  // Ini menghilangkan re-render ekstra yang menyebabkan delay saat modal dibuka.
  useEffect(() => {
    setActiveMapIndex(0);
  }, [mapSlides.length]);

  useEffect(() => {
    setActiveWzIndex(0);
  }, [wzAreas.length]);

  useEffect(() => {
    setActiveObsIndex(0);
  }, [obsAreas.length]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      // statusBarTranslucent mencegah layout recalculation di Android
      // yang menjadi salah satu penyebab delay saat modal muncul
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View
        style={[styles.modalOverlayBottom, { opacity: overlayOpacity }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.modalCardBottom,
            { height: height * 0.9, transform: [{ translateY }] },
          ]}
        >
              {/* Handle bar — area drag-to-close */}
              <View {...panResponder.panHandlers} style={styles.handleBarArea}>
                <View style={styles.handleBar} />
              </View>

              <View style={styles.modalHeaderBottom}>
                <View style={styles.headerText}>
                  <Text style={styles.modalTitleBottom}>INFORMASI TSUNAMI</Text>
                  <Text style={styles.modalSubtitle}>
                    Sumber data: BMKG InaTEWS
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.modalCloseCircle}
                >
                  <Ionicons name="close" size={20} color="#333" />
                </TouchableOpacity>
              </View>

              {hasAnyData ? (
                <ScrollView
                  style={styles.modalBody}
                  contentContainerStyle={styles.modalContent}
                  nestedScrollEnabled
                  directionalLockEnabled
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {hasHeadline && (
                    <View style={styles.headlineSection}>
                      <DetailItem
                        icon="megaphone-outline"
                        label="Informasi Tsunami :"
                        value={headlineText}
                        styles={styles}
                      />
                    </View>
                  )}

                  <CarouselSection
                    title="Informasi Visual"
                    data={mapSlides}
                    activeIndex={activeMapIndex}
                    width={width}
                    onIndexChange={setActiveMapIndex}
                    keyExtractor={(item, index) => `${item.title}-${index}`}
                    renderItem={(item, itemWidth) => (
                      <View style={[styles.slide, { width: itemWidth }]}>
                        <Text style={styles.slideTitle}>{item.title}</Text>
                        <Image
                          source={{ uri: item.imageUrl }}
                          style={[
                            styles.mapImage,
                            {
                              width: itemWidth - 40,
                              height: Math.max(300, height * 0.5),
                            },
                          ]}
                          resizeMode="contain"
                        />
                      </View>
                    )}
                  />

                  <CarouselSection
                    title="Wilayah Peringatan Tsunami"
                    data={wzAreas}
                    activeIndex={activeWzIndex}
                    width={width}
                    onIndexChange={setActiveWzIndex}
                    keyExtractor={(item, index) =>
                      `${item.province}-${item.district}-${item.time}-${index}`
                    }
                    renderItem={(item, itemWidth) => (
                      <View style={[styles.dataSlide, { width: itemWidth }]}>
                        <InfoLine label="Provinsi" value={item.province} />
                        <InfoLine label="Wilayah" value={item.district} />
                        <InfoLine label="Level" value={item.level} strong />
                        <InfoLine
                          label="Waktu"
                          value={`${safeText(item.date)}, ${safeText(item.time)}`}
                        />
                      </View>
                    )}
                  />

                  <CarouselSection
                    title="Observasi Tsunami"
                    data={obsAreas}
                    activeIndex={activeObsIndex}
                    width={width}
                    onIndexChange={setActiveObsIndex}
                    keyExtractor={(item, index) =>
                      `${item.location}-${item.time}-${index}`
                    }
                    renderItem={(item, itemWidth) => (
                      <View style={[styles.dataSlide, { width: itemWidth }]}>
                        <InfoLine label="Lokasi" value={item.location} />
                        <InfoLine
                          label="Koordinat"
                          value={`${safeText(item.loclatitude)}, ${safeText(
                            item.loclongitude,
                          )}`}
                        />
                        <InfoLine
                          label="Tinggi"
                          value={formatHeight(item.height)}
                        />
                        <InfoLine
                          label="Waktu"
                          value={`${safeText(item.date)}, ${safeText(item.time)}`}
                        />
                      </View>
                    )}
                  />
                </ScrollView>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>
                    Informasi lengkap tsunami belum tersedia.
                  </Text>
                </View>
              )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// InfoLine
// ---------------------------------------------------------------------------

function InfoLine({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={[styles.infoValue, strong && styles.infoValueStrong]}>
        {safeText(value)}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
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
  handleBarArea: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 6,
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: "#ccc",
    borderRadius: 10,
  },
  modalHeaderBottom: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerText: {
    flex: 1,
  },
  modalTitleBottom: {
    color: "#0C4A6E",
    fontWeight: "700",
    fontSize: 16,
  },
  modalSubtitle: {
    fontSize: 11,
    color: "#777",
  },
  modalCloseCircle: {
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    padding: 4,
  },
  modalBody: {
    flex: 1,
  },
  modalContent: {
    paddingBottom: 18,
  },
  section: {
    paddingTop: 16,
  },
  sectionTitle: {
    color: "#0C4A6E",
    fontSize: 15,
    fontWeight: "800",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  slide: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  slideTitle: {
    color: "#0C4A6E",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },
  mapImage: {
    backgroundColor: "#F8FAFC",
  },
  dataSlide: {
    paddingHorizontal: 20,
  },
  headlineSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  infoIcon: {
    marginTop: 2,
  },
  infoLine: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  infoLabel: {
    color: "#64748B",
    fontSize: 12,
    marginBottom: 3,
  },
  infoValue: {
    color: "#1E3A5F",
    fontSize: 14,
    fontWeight: "700",
  },
  infoValueStrong: {
    color: "#0C4A6E",
    fontSize: 15,
  },
  paginationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingTop: 12,
    paddingBottom: 2,
  },
  paginationText: {
    color: "#0369A1",
    fontSize: 13,
    fontWeight: "700",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: "#0369A1",
    width: 18,
  },
  dotInactive: {
    backgroundColor: "#CBD5E1",
  },
  dotOverflowIndicator: {
    color: "#94A3B8",
    fontSize: 10,
    lineHeight: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyText: {
    color: "#1E3A5F",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
});
