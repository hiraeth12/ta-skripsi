import { useCallback, useRef, useState } from "react";
import { Animated, PanResponder } from "react-native";

type CardAnimationOptions = {
  onSwipeDismiss?: () => void;
};

export function useCardAnimation(options: CardAnimationOptions = {}) {
  const [showCard, setShowCard] = useState(false);
  const showCardRef = useRef(false);
  const onSwipeDismissRef = useRef(options.onSwipeDismiss);
  const translateY = useRef(new Animated.Value(600)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;

  onSwipeDismissRef.current = options.onSwipeDismiss;

  const runDismissAnimation = useCallback(
    (
      callback?: () => void,
      durations: {
        translateDuration?: number;
        opacityDuration?: number;
        buttonOpacityDuration?: number;
      } = {},
    ) => {
      const {
        translateDuration = 220,
        opacityDuration = 180,
        buttonOpacityDuration = 150,
      } = durations;

      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 600,
          duration: translateDuration,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: opacityDuration,
          useNativeDriver: true,
        }),
        Animated.timing(btnOpacity, {
          toValue: 0,
          duration: buttonOpacityDuration,
          useNativeDriver: true,
        }),
      ]).start(callback);
    },
    [btnOpacity, opacity, translateY],
  );

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) {
          translateY.setValue(gs.dy);
          opacity.setValue(Math.max(0, 1 - gs.dy / 300));
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80) {
          showCardRef.current = false;
          runDismissAnimation(() => {
            showCardRef.current = false;
            setShowCard(false);
            onSwipeDismissRef.current?.();
          });
        } else {
          Animated.parallel([
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
            Animated.timing(btnOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
          ]).start();
        }
      },
    }),
  ).current;

  const openCard = useCallback(() => {
    translateY.setValue(600);
    opacity.setValue(0);
    btnOpacity.setValue(0);
    showCardRef.current = true;
    setShowCard(true);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, bounciness: 4, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(btnOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [btnOpacity, opacity, translateY]);

  const dismissCard = useCallback((callback?: () => void) => {
    if (showCardRef.current) {
      showCardRef.current = false;
      runDismissAnimation(() => {
        setShowCard(false);
        callback?.();
      });
    } else {
      callback?.();
    }
  }, [runDismissAnimation]);

  const closeCardForReplacement = useCallback(
    (callback: () => void) => {
      if (!showCardRef.current) {
        callback();
        return;
      }

      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 600,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(btnOpacity, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start(() => {
        showCardRef.current = false;
        setShowCard(false);
        callback();
      });
    },
    [btnOpacity, opacity, translateY],
  );

  const hideCardImmediately = useCallback(
    (callback?: () => void) => {
      translateY.setValue(600);
      opacity.setValue(0);
      btnOpacity.setValue(0);
      showCardRef.current = false;
      setShowCard(false);
      callback?.();
    },
    [btnOpacity, opacity, translateY],
  );

  return {
    showCard,
    showCardRef,
    translateY,
    opacity,
    btnOpacity,
    panResponder,
    openCard,
    dismissCard,
    closeCardForReplacement,
    hideCardImmediately,
  };
}
