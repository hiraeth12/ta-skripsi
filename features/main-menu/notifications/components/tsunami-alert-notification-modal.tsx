import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

export type TsunamiAlertNotificationData = {
  title?: string;
  body?: string;
  level?: string;
  message?: string;
  closeInSecond?: number;
};

export function TsunamiAlertNotificationModal({
  visible,
  level = "-",
  message = "",
  closeInSecond,
  onClose,
}: {
  visible: boolean;
  level?: string;
  message?: string;
  closeInSecond?: number;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const player = useAudioPlayer(require("@/assets/sounds/tsu_eva.wav"));

  const scaleValue = useRef(new Animated.Value(0.5)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;
  const blinkValue = useRef(new Animated.Value(0.55)).current;

  const panelWidth = Math.min(width * 0.86, 420);
  const bannerWidth = Math.min(panelWidth, 360);
  const bannerHeight = bannerWidth * (186 / 931);
  const messageMaxHeight = Math.min(height * 0.24, 160);
  const levelText = (level || "-").toUpperCase();

  const pauseSound = useCallback(() => {
    try {
      if (player && player.playing) {
        player.pause();
      }
    } catch {}
  }, [player]);

  const handleClose = useCallback(() => {
    pauseSound();

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
  }, [onClose, opacityValue, pauseSound, scaleValue]);

  useEffect(() => {
    let blinkAnimation: Animated.CompositeAnimation | null = null;

    async function playSound() {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          interruptionMode: "duckOthers",
        });

        player.loop = true;
        player.play();
      } catch (error) {
        console.warn("Tsunami audio playback error:", error);
      }
    }

    if (visible) {
      scaleValue.setValue(0.5);
      opacityValue.setValue(0);
      blinkValue.setValue(0.55);

      playSound();

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

      blinkAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(blinkValue, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(blinkValue, {
            toValue: 0.55,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      blinkAnimation.start();
    }

    return () => {
      blinkAnimation?.stop();
      pauseSound();
    };
  }, [blinkValue, opacityValue, pauseSound, player, scaleValue, visible]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (visible && closeInSecond && closeInSecond > 0) {
      timer = setTimeout(() => {
        handleClose();
      }, closeInSecond * 1000);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [closeInSecond, handleClose, visible]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      statusBarTranslucent={true}
    >
      <View style={styles.overlayBg}>
        <Animated.View
          style={[
            styles.popupContainer,
            { transform: [{ scale: scaleValue }], opacity: opacityValue },
          ]}
        >
          <View style={[styles.warningBox, { width: panelWidth }]}>
            <Animated.View style={{ opacity: blinkValue }}>
              <Image
                source={require("@/assets/images/svg/warning-tsunami-banner.svg")}
                style={[
                  styles.bannerImage,
                  { width: bannerWidth, height: bannerHeight },
                ]}
                contentFit="contain"
              />
            </Animated.View>

            <View style={styles.panel}>
              <View style={styles.panelContent}>
                <View style={styles.sectionBorder}>
                  <View style={styles.labelBand}>
                    <Text style={styles.labelText}>POTENSI TSUNAMI</Text>
                  </View>
                </View>

                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.labelBand}>
                      <Text style={styles.levelText}>{levelText}</Text>
                    </View>
                  </View>

                  <ScrollView
                    bounces={false}
                    showsVerticalScrollIndicator={message.length > 180}
                    style={{ maxHeight: messageMaxHeight }}
                    contentContainerStyle={styles.cardContent}
                  >
                    <Text selectable style={styles.messageText}>
                      {message}
                    </Text>
                  </ScrollView>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const COLORS = {
  black: "#000000",
  red: "#ff0000",
  danger: "#ff2233",
  orange: "#ffaa00",
  white: "#ffffff",
};

const styles = StyleSheet.create({
  overlayBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  popupContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  warningBox: {
    maxWidth: 420,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerImage: {
    marginBottom: 8,
  },
  panel: {
    width: "100%",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: COLORS.black,
    borderWidth: 1,
    borderColor: COLORS.red,
  },
  panelContent: {
    width: "100%",
    padding: 24,
  },
  sectionBorder: {
    width: "100%",
    marginBottom: 8,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  labelBand: {
    minHeight: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.black,
    borderWidth: 1,
    borderColor: COLORS.danger,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  labelText: {
    color: COLORS.orange,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0,
  },
  card: {
    width: "100%",
    backgroundColor: COLORS.black,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 8,
    overflow: "hidden",
  },
  cardHeader: {
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.danger,
  },
  levelText: {
    color: COLORS.orange,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0,
  },
  cardContent: {
    padding: 12,
  },
  messageText: {
    color: COLORS.white,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0,
  },
});
