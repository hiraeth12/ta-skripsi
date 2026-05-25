import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState, type ReactElement } from "react";
import {
  FlatList,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

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

const safeText = (value: string) => {
  const text = String(value ?? "").trim();
  return text || "-";
};

const formatHeight = (height: string) => {
  const value = safeText(height);
  return value === "-" ? value : `${value} m`;
};

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.min(Math.max(index, 0), length - 1);
}

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

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <FlatList
        data={data}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={keyExtractor}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        renderItem={({ item }) => renderItem(item, width)}
      />
      <View style={styles.paginationContainer}>
        {data.map((item, index) => (
          <View
            key={keyExtractor(item, index)}
            style={[
              styles.dot,
              activeIndex === index ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

export function ModalTsunamiInfo({
  visible,
  onClose,
  mapSlides,
  wzAreas,
  obsAreas,
}: ModalTsunamiInfoProps) {
  const { height, width } = useWindowDimensions();
  const [activeMapIndex, setActiveMapIndex] = useState(0);
  const [activeWzIndex, setActiveWzIndex] = useState(0);
  const [activeObsIndex, setActiveObsIndex] = useState(0);
  const hasAnyData =
    mapSlides.length > 0 || wzAreas.length > 0 || obsAreas.length > 0;

  useEffect(() => {
    if (!visible) return;
    setActiveMapIndex(0);
    setActiveWzIndex(0);
    setActiveObsIndex(0);
  }, [mapSlides.length, obsAreas.length, visible, wzAreas.length]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlayBottom}>
        <View style={[styles.modalCardBottom, { height: height * 0.9 }]}>
          <View style={styles.handleBar} />
          <View style={styles.modalHeaderBottom}>
            <View style={styles.headerText}>
              <Text style={styles.modalTitleBottom}>INFORMASI TSUNAMI</Text>
              <Text style={styles.modalSubtitle}>
                Sumber data: BMKG InaTEWS
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseCircle}>
              <Ionicons name="close" size={20} color="#333" />
            </TouchableOpacity>
          </View>

          {hasAnyData ? (
            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
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
                    <InfoLine label="Tinggi" value={formatHeight(item.height)} />
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
        </View>
      </View>
    </Modal>
  );
}

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
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: "#ccc",
    borderRadius: 10,
    alignSelf: "center",
    marginTop: 12,
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
