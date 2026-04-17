import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { Text, TouchableOpacity } from "react-native";
import { styles } from "../styles/homeStyles";
import { ShareModal } from "./share-modal";

type DirasakanQuake = {
  distanceKm: string;
  magnitude: string;
  kedalaman: string;
  latText: string;
  lonText: string;
  wilayah: string;
  tanggal: string;
  jam: string;
  felt: string;
};

type TerdeteksiQuake = {
  distanceKm: string;
  magnitude: string;
  kedalaman: string;
  latText: string;
  lonText: string;
  wilayah: string;
  tanggal: string;
  jam: string;
  fase: string;
};

export const ShareButton = ({
  data,
  type = "dirasakan",
}: {
  data?: DirasakanQuake | TerdeteksiQuake | null;
  type?: "dirasakan" | "terdeteksi";
}) => {
  const [shareModalVisible, setShareModalVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={styles.mapButton}
        onPress={(e) => {
          e.stopPropagation();
          setShareModalVisible(true);
        }}
      >
        <Feather name="share" size={12} color="white" />
        <Text style={styles.mapButtonText}>BAGIKAN</Text>
      </TouchableOpacity>

      <ShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        data={data || null}
        type={type}
      />
    </>
  );
};
