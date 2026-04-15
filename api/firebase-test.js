export async function testFirebaseAppName() {
  try {
    const firebaseModule = await import("@react-native-firebase/app");
    const firebase = firebaseModule.default ?? firebaseModule;

    console.log(firebase.app().name);
  } catch (error) {
    console.warn(
      "Firebase app module is not available. Install @react-native-firebase/app first.",
      error,
    );
  }
}
