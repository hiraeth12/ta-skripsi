import { StyleSheet } from "react-native";


export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EDEDED",
  },
  scrollContainer: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100%",
  },
  logo: {
    width: 160,
    height: 50,
    alignSelf: "center",
    marginBottom: 10,
    marginTop: 20,
  },
  image: {
    width: 220,
    height: 220,
    alignSelf: "center",
    marginBottom: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#000",
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    color: "#666",
    marginBottom: 30,
    lineHeight: 20,
  },
  emailText: {
    fontWeight: "bold",
    color: "#333",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    width: "100%",
    paddingHorizontal: 10,
    marginBottom: 35,
  },
  inputWrapper: {
    width: 55, // Ukuran kotak lebih proporsional
    height: 70,
    borderWidth: 2,
    borderColor: "#1E6F9F",
    borderRadius: 12,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  input: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    width: "100%",
    height: "100%",
    color: "#1E6F9F",
    padding: 0, // Penting agar kursor benar-benar di tengah
  },
  underline: {
    position: "absolute",
    bottom: 12,
    width: 18,
    height: 2,
    borderRadius: 1,
  },
  underlineInactive: {
    backgroundColor: "#ccc",
  },
  underlineActive: {
    backgroundColor: "#1E6F9F",
  },
  resendText: {
    color: "#555",
    fontSize: 14,
    marginBottom: 20,
  },
});
