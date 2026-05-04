import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  View
} from "react-native";

export type GempaBumiNotificationData = {
  title?: string;
  body?: string;
  magnitudo?: string;
  kedalaman?: string;
  closeInSecond?: number;
};

export function GempaBumiNotificationModal({
  visible,
  magnitudo = "-",
  kedalaman = "-",
  closeInSecond,
  onClose,
}: {
  visible: boolean;
  magnitudo?: string;
  kedalaman?: string;
  closeInSecond?: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const player = useAudioPlayer(require("../../assets/sounds/eq_eva.wav"));

  // Animations
  const scaleValue = useRef(new Animated.Value(0.5)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;
  const blinkValue = useRef(new Animated.Value(0.4)).current;

  // Sound and entry animation
  useEffect(() => {
    async function playSound() {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          interruptionMode: 'duckOthers'
        });

        player.loop = true;
        player.play();
      } catch (error) {
        console.warn("Audio playback error:", error);
      }
    }

    if (visible) {
      playSound();

      // Show pop-up animation
      Animated.parallel([
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Blink animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(blinkValue, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(blinkValue, {
            toValue: 0.4,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }

    return () => {
      try {
        if (player && player.playing) {
          player.pause();
        }
      } catch (e) {}
    };
  }, [visible, player]);

  // Auto close effect
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (visible && closeInSecond === 6) {
      timer = setTimeout(() => {
        handleClose();
      }, 6000);
    }
    return () => clearTimeout(timer);
  }, [visible, closeInSecond]);

  const handleClose = () => {
    try {
      if (player && player.playing) {
        player.pause();
      }
    } catch (e) {}

    // Close pop-up animation
    Animated.parallel([
      Animated.timing(scaleValue, {
        toValue: 0.5,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="none">
      <View style={styles.overlayBg}>
        <Animated.View
          style={[
            styles.popupContainer,
            { transform: [{ scale: scaleValue }], opacity: opacityValue },
          ]}
        >
          <View style={styles.warningContainer}>
            {/* Main big hex warning background (.long-hex) */}
            <View style={styles.shapesContainer}>
              <Image
                source={require("../../assets/images/big_warning.svg")}
                style={styles.bigWarning}
                contentFit="contain"
              />
              
              <View style={styles.radarGroup}>
                 <Animated.View style={[styles.radarContainer, { opacity: blinkValue }]}>
                   <Image
                     source={require("../../assets/images/warning_gempa_yellow.png")}
                     style={styles.warningGempaYellow}
                     contentFit="contain"
                   />
                 </Animated.View>
                 <Animated.View style={[styles.radarContainer, { opacity: blinkValue }]}>
                   <Image
                     source={require("../../assets/images/warning_gempa_yellow.png")}
                     style={styles.warningGempaYellow}
                     contentFit="contain"
                   />
                 </Animated.View>
              </View>
            </View>

            {/* TWO WARNING BLACK HEXAGON (Emergency) */}
            <View style={styles.emergencyHexGroup}>
              <View style={styles.emergencyHex}>
                <Image
                   source={require("../../assets/images/warning_shape_yellow.svg")}
                   style={styles.warningShapeYellow}
                   contentFit="contain"
                 />
              </View>
              <View style={styles.emergencyHex}>
                <Image
                   source={require("../../assets/images/warning_shape_yellow.svg")}
                   style={styles.warningShapeYellow}
                   contentFit="contain"
                 />
              </View>
            </View>

            {/* THREE BASIC HEXAGON (INFO) */}
            <View style={styles.infoHexagons}>
               <Animated.View style={[styles.hexWrapper, styles.hexLeft, { opacity: blinkValue }]}>
                 <Image
                   source={require("../../assets/images/hex_shape.svg")}
                   style={styles.hexShape}
                   contentFit="contain"
                 />
                 <View style={styles.hexContent}>
                   <Text style={[styles.hexValue, styles.textGlow]}>{magnitudo}</Text>
                   <Text style={styles.hexLabel}>MAGNITUDO</Text>
                 </View>
               </Animated.View>

               <View style={styles.hexWrapperCenter}>
                 <Image
                   source={require("../../assets/images/hex_shape.svg")}
                   style={styles.hexShape}
                   contentFit="contain"
                 />
               </View>

               <Animated.View style={[styles.hexWrapper, styles.hexRight, { opacity: blinkValue }]}>
                 <Image
                   source={require("../../assets/images/hex_shape.svg")}
                   style={styles.hexShape}
                   contentFit="contain"
                 />
                 <View style={styles.hexContent}>
                   <Text style={[styles.hexValue, styles.textGlow]}>{kedalaman}</Text>
                   <Text style={styles.hexLabel}>KEDALAMAN</Text>
                 </View>
               </Animated.View>
            </View>

            {/* TWO EARTHQUAKE DETECTED ALERT YELLOW */}
            <View style={styles.alertGroup}>
              <Animated.View style={[styles.alertImageWrapper, styles.alertLeft, { opacity: blinkValue }]}>
                <Image
                  source={require("../../assets/images/earthquake_detected.svg")}
                  style={styles.earthquakeDetected}
                  contentFit="contain"
                />
              </Animated.View>
              <Animated.View style={[styles.alertImageWrapper, styles.alertRight, { opacity: blinkValue }]}>
                <Image
                  source={require("../../assets/images/earthquake_detected.svg")}
                  style={styles.earthquakeDetected}
                  contentFit="contain"
                />
              </Animated.View>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  popupContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  warningContainer: {
    width: 450,
    height: 500,
    justifyContent: "center",
    alignItems: "center",
    transform: [{ scale: 0.75 }],
  },
  shapesContainer: {
    width: 300,
    height: 150,
    justifyContent: "center",
    alignItems: "center",
  },
  bigWarning: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  radarGroup: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    width: "100%",
    position: "absolute",
    top: 228, // Posisikan tepat di bawah susunan info hexagons secara relatif (seperti request: top: 170px)
    gap: 96,
    zIndex: 5,
  },
  radarContainer: {
    width: 60,
    height: 65,
    justifyContent: "center",
    alignItems: "center",
  },
  warningGempaYellow: {
    width: "100%",
    height: "100%",
  },

  // EMERGENCY HEXAGONS
  emergencyHexGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: -80,
  },
  emergencyHex: {
    width: 100,
    height: 100,
  },
  warningShapeYellow: {
    width: "100%",
    height: "100%",
  },

  // INFO HEXAGONS (MAG & DEPTH)
  infoHexagons: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
  },
  hexWrapper: {
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  hexLeft: {
    marginRight: -8,
    marginTop: -48,
  },
  hexRight: {
    marginLeft: -8,
    marginTop: -48,
  },
  hexWrapperCenter: {
    width: 100,
    height: 100,
  },
  hexShape: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  hexContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  hexLabel: {
    color: "#000000",
    fontSize: 9,
    fontWeight: "bold",
  },
  hexValue: {
    color: "#000000",
    fontSize: 24,
    fontWeight: "bold",
  },
  textGlow: {
    textShadowColor: "rgba(255, 102, 0, 0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },

  // ALERT YELLOW BOXES
  alertGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  alertImageWrapper: {
    width: 50,
    height: 80,
    marginTop: -96,
  },
  alertLeft: {
    marginLeft: 24,
  },
  alertRight: {
    marginRight: 24,
  },
  earthquakeDetected: {
    width: "100%",
    height: "100%",
  },
});