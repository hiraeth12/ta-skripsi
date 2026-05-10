import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EDEDED",
  },
  scrollContainer: {
    padding: 24,
    alignItems: "center", // Memastikan semua elemen berada di tengah secara horizontal
    justifyContent: "center",
    minHeight: "100%",
  },
  logo: {
    width: 160,
    height: 50,
    alignSelf: "center",
    marginBottom: 20,
    marginTop: 20,
  },
  image: {
    width: 220, // Ukuran disamakan dengan VerifyCode agar proporsional
    height: 220,
    alignSelf: "center",
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
    color: "#000",
  },
  description: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 30,
    color: "#555",
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  inputArea: {
    width: "100%",
    marginBottom: 35,
  },
  label: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  input: {
    borderBottomWidth: 1.5, // Sedikit lebih tebal agar lebih tegas seperti kotak OTP
    borderBottomColor: "#ccc",
    paddingVertical: 10,
    fontSize: 16,
    color: "#000",
  },
  buttonWrapper: {
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
  },
});
