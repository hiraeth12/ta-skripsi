import AuthButton from "@/components/auth-button";
import EvilIcons from "@expo/vector-icons/EvilIcons";
import {
    Image,
    KeyboardAvoidingView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function AskLocation() {
  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <Text style={styles.logo}>SeismoTrack</Text>

      <Image
        style={styles.image}
        source={require("@/assets/images/navigation-map.png")}
        resizeMode="contain"
      />

      <Text style={styles.description}>
        Silakan pilih lokasi Anda atau gunakan GPS
      </Text>

      {/* Location Input */}
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Cari Desa, Kecamatan, Kabupaten atau Kota"
          style={styles.input}
          placeholderTextColor="#999"
        />
        <TouchableOpacity>
          <EvilIcons name="chevron-down" size={28} color="#555" />
        </TouchableOpacity>
      </View>

      <Text style={styles.orText}>Atau</Text>

      <AuthButton title="Gunakan GPS" onPress={() => {}} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#EDEDED",
  },
  logo: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#1E6F9F",
  },
  image: {
    width: 250,
    height: 250,
    alignSelf: "center",
    marginBottom: 30,
  },
  description: {
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  orText: {
    textAlign: "center",
    marginVertical: 24,
    fontWeight: "600",
    color: "#555",
  },
});
