import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useRef } from "react";
import {
  Animated,
  FlatList,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export type LocationSearchItem = {
  id: string;
  name: string;
  desc: string;
  latitude?: number;
  longitude?: number;
};

type LocationSearchModalProps = {
  visible: boolean;
  query: string;
  locations: LocationSearchItem[];
  onClose: () => void;
  onChangeQuery: (query: string) => void;
  onSelect: (item: LocationSearchItem) => void;
};

export default function LocationSearchModal({
  visible,
  query,
  locations,
  onClose,
  onChangeQuery,
  onSelect,
}: LocationSearchModalProps) {
  const translateY = useRef(new Animated.Value(0)).current;

  const closeWithAnimation = useCallback(() => {
    Animated.timing(translateY, {
      toValue: 500,
      duration: 160,
      useNativeDriver: true,
    }).start(() => {
      translateY.setValue(0);
      onClose();
    });
  }, [onClose, translateY]);

  const resetPosition = useCallback(() => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  }, [translateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > 6 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            translateY.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 80 || gestureState.vy > 0.8) {
            closeWithAnimation();
            return;
          }

          resetPosition();
        },
        onPanResponderTerminate: resetPosition,
      }),
    [closeWithAnimation, resetPosition, translateY],
  );

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      onShow={() => translateY.setValue(0)}
    >
      <View style={styles.bottomSheetOverlay}>
        <Animated.View
          style={[styles.bottomSheetContent, { transform: [{ translateY }] }]}
        >
          <View style={styles.handleBar} />

          <View style={styles.modalHeader} {...panResponder.panHandlers}>
            <Text style={styles.modalTitle}>Pilih Lokasi</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={28} color="#ccc" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBarContainer}>
            <Ionicons
              name="search"
              size={18}
              color="#999"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Ketik nama desa atau kecamatan..."
              autoFocus={true}
              value={query}
              onChangeText={onChangeQuery}
            />
          </View>

          <FlatList
            data={locations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.locationCard}
                onPress={() => onSelect(item)}
              >
                <View style={styles.iconCircle}>
                  <Ionicons name="map-outline" size={20} color="#1E6F9F" />
                </View>
                <View style={styles.locationTextWrapper}>
                  <Text style={styles.locName}>{item.name}</Text>
                  <Text style={styles.locDesc}>{item.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#ccc" />
              </TouchableOpacity>
            )}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    marginBottom: 20,
  },
  searchIcon: {
    marginLeft: 10,
  },
  modalInput: {
    flex: 1,
    padding: 12,
    fontSize: 15,
  },
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
  locationTextWrapper: {
    flex: 1,
  },
  locName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  locDesc: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
});
