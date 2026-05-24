import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EDEDED",
    padding: 24, 
    alignItems: "center", 
    justifyContent: "center", 
  },

  logo: {
    width: 160,
    height: 50,
    alignSelf: "center",
    marginBottom: 40,
    marginTop: 20,
  },
  image: {
    width: 220, 
    height: 220,
    alignSelf: "center",
    marginBottom: 15,
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
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
    color: "#000",
  },
});
