import React, { useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    Platform,
    useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    useAnimatedProps,
    withTiming,
    withSpring,
    withRepeat,
    withSequence,
    Easing,
    interpolate,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import Svg, { Defs, Mask, Rect, Circle } from 'react-native-svg';
import { ThemedText } from '@/components/ThemedText';
import { Feather } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/src/contexts/ThemeContext';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

const IMAGE_WIDTH = 200;
const IMAGE_HEIGHT = 160;

const PEEPUP_W = 160;
const PEEPUP_H = 130;
const PEEP_W = 95;
const PEEP_H = 75;

const CARD_ESTIMATED_H = 180;
const CARD_H_MARGIN = 20;

const CONFETTI_COLORS = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C77DFF', '#FF9F1C', '#FF6FC8', '#00C9A7'];
const CONFETTI_COUNT = 28;

export interface TutorialStep {
    targetX: number;
    targetY: number;
    targetWidth: number;
    targetHeight: number;
    title: string;
    description: string;
    shape?: 'circle' | 'rect';
    allowInteraction?: boolean;
    canNext?: boolean;
}

export type MascotType = 'wc' | 'peep' | 'peepup' | 'none';

interface TutorialOverlayProps {
    step: number;
    steps: TutorialStep[];
    onNext: () => void;
    onBack: () => void;
    onSkip: () => void;
    isModalTutorial?: boolean;
    onSpotlightPress?: () => void;
    bannerOnly?: boolean;
    mascot?: MascotType;
    /** When true, renders without dark overlay — only mascot + bottom card visible */
    noOverlay?: boolean;
    /** When true: shows confetti, centers WC mascot, hides back/skip, shows only Finalizar button */
    isCompletionStep?: boolean;
}

// ─── ConfettiPiece — individual animated piece ────────────────────────────────
function ConfettiPiece({
    color,
    size,
    startX,
    startDelay,
    screenWidth,
    screenHeight,
    active,
}: {
    color: string;
    size: number;
    startX: number;
    startDelay: number;
    screenWidth: number;
    screenHeight: number;
    active: boolean;
}) {
    const x = useSharedValue(startX);
    const y = useSharedValue(-30);
    const rot = useSharedValue(0);
    const opacity = useSharedValue(0);

    useEffect(() => {
        if (!active) {
            x.value = startX;
            y.value = -30;
            rot.value = 0;
            opacity.value = 0;
            return;
        }

        const targetX = startX + (Math.random() - 0.5) * 140;

        opacity.value = 0;
        x.value = startX;
        y.value = -30;
        rot.value = 0;

        setTimeout(() => {
            opacity.value = withTiming(1, { duration: 200 });
            y.value = withTiming(screenHeight + 40, {
                duration: 2600 + Math.random() * 600,
                easing: Easing.in(Easing.ease),
            });
            x.value = withTiming(targetX, {
                duration: 2800 + Math.random() * 400,
                easing: Easing.inOut(Easing.ease),
            });
            rot.value = withTiming((Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 360), {
                duration: 2800,
                easing: Easing.linear,
            });
            setTimeout(() => {
                opacity.value = withTiming(0, { duration: 400 });
            }, 2000);
        }, startDelay);
    }, [active]);

    const style = useAnimatedStyle(() => ({
        position: 'absolute' as const,
        left: x.value,
        top: y.value,
        width: size,
        height: size * (Math.random() > 0.5 ? 1 : 0.5),
        borderRadius: Math.random() > 0.5 ? size / 2 : 2,
        backgroundColor: color,
        opacity: opacity.value,
        transform: [{ rotate: `${rot.value}deg` }],
        zIndex: 100020,
    }));

    return <Animated.View style={style} pointerEvents="none" />;
}

// ─── TutorialOverlay ──────────────────────────────────────────────────────────
export default function TutorialOverlay({
    step,
    steps,
    onNext,
    onBack,
    onSkip,
    isModalTutorial = false,
    onSpotlightPress,
    bannerOnly = false,
    mascot = 'none',
    noOverlay = false,
    isCompletionStep = false,
}: TutorialOverlayProps) {
    const { isDark } = useTheme();
    const colors = isDark ? Colors.dark : Colors.light;

    const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
    const insets = useSafeAreaInsets();

    const currentStepData = steps[step] ?? steps[0];

    const isWelcome = step === 0 && !isModalTutorial;
    const isRect = currentStepData?.shape === 'rect';
    const canNext = currentStepData?.canNext !== false;
    const showBackButton = step > 0 && !isWelcome && !isCompletionStep;
    const allowInteraction = currentStepData?.allowInteraction ?? false;

    const isLastModalStep = isModalTutorial && step === steps.length - 1;
    const isDashboardStep6 = !isModalTutorial && step === 2 && !isCompletionStep;

    // ─── Confetti data (stable across renders) ────────────────────────────────
    const confettiData = useRef(
        Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
            color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            size: 7 + Math.random() * 7,
            startX: Math.random() * 400, // placeholder, overridden with SCREEN_WIDTH
            startDelay: i * 70,
        }))
    ).current;

    // ─── Spotlight animated values ────────────────────────────────────────────
    const spotX = useSharedValue(currentStepData?.targetX ?? SCREEN_WIDTH / 2);
    const spotY = useSharedValue(currentStepData?.targetY ?? SCREEN_HEIGHT / 2);
    const spotW = useSharedValue(currentStepData?.targetWidth ?? 200);
    const spotH = useSharedValue(currentStepData?.targetHeight ?? 200);

    const overlayOpacity = useSharedValue(0);
    const cardOpacity = useSharedValue(0);

    const cardTopVal = useSharedValue(SCREEN_HEIGHT + 100);
    const cardTranslateY = useSharedValue(400);

    const imageOpacity = useSharedValue(0);
    const imageScale = useSharedValue(0.7);
    const imageX = useSharedValue(SCREEN_WIDTH / 2 - IMAGE_WIDTH / 2);
    const imageY = useSharedValue(SCREEN_HEIGHT / 2 - 220);
    const floatY = useSharedValue(0);
    const spotlightOpacity = useSharedValue(1);

    const isFirstRender = useRef(true);

    // ─── Spotlight spring on step data change ─────────────────────────────────
    useEffect(() => {
        if (currentStepData) {
            spotX.value = withSpring(currentStepData.targetX, { damping: 22, stiffness: 130, mass: 0.8 });
            spotY.value = withSpring(currentStepData.targetY, { damping: 22, stiffness: 130, mass: 0.8 });
            spotW.value = withSpring(currentStepData.targetWidth, { damping: 22, stiffness: 130, mass: 0.8 });
            spotH.value = withSpring(currentStepData.targetHeight, { damping: 22, stiffness: 130, mass: 0.8 });
        }
    }, [
        currentStepData?.targetX,
        currentStepData?.targetY,
        currentStepData?.targetWidth,
        currentStepData?.targetHeight,
    ]);

    // ─── Main step animation ──────────────────────────────────────────────────
    useEffect(() => {
        const centerX = SCREEN_WIDTH / 2;
        const centerY = SCREEN_HEIGHT / 2 - 100;

        if (isFirstRender.current) {
            isFirstRender.current = false;
            overlayOpacity.value = withTiming(1, { duration: 400 });

            if (step === 0 && !isModalTutorial) {
                spotX.value = centerX;
                spotY.value = centerY;
                spotW.value = 200;
                spotH.value = 200;
                spotlightOpacity.value = 1;

                imageX.value = centerX - IMAGE_WIDTH / 2;
                imageY.value = centerY - 80;
                imageScale.value = withSpring(1, { damping: 12, stiffness: 100 });
                imageOpacity.value = withTiming(1, { duration: 350 });

                floatY.value = withRepeat(
                    withSequence(
                        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                    ),
                    -1,
                    false,
                );

                cardTopVal.value = SCREEN_HEIGHT + 100;
                cardTopVal.value = withSpring(SCREEN_HEIGHT / 2 + 80, { damping: 20, stiffness: 110 });
            } else if (currentStepData) {
                spotX.value = currentStepData.targetX;
                spotY.value = currentStepData.targetY;
                spotW.value = currentStepData.targetWidth;
                spotH.value = currentStepData.targetHeight;
                imageOpacity.value = withTiming(1, { duration: 350 });
                imageScale.value = withSpring(1, { damping: 14, stiffness: 120 });

                cardTranslateY.value = 400;
                cardTranslateY.value = withSpring(0, { damping: 20, stiffness: 110 });
            }

            cardOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
            return;
        }

        if (currentStepData || step === 0) {
            cardOpacity.value = withTiming(0, { duration: 150 });

            if (!isModalTutorial) {
                if (step === 0) {
                    imageScale.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
                } else if (step === 1) {
                    imageScale.value = withTiming(0.6, { duration: 300, easing: Easing.out(Easing.ease) });
                } else {
                    imageScale.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
                }
            }

            spotlightOpacity.value = withTiming(0, { duration: 180 });

            setTimeout(() => {
                if (step === 0 && !isModalTutorial) {
                    spotX.value = withSpring(centerX, { damping: 22, stiffness: 130, mass: 0.8 });
                    spotY.value = withSpring(centerY, { damping: 22, stiffness: 130, mass: 0.8 });
                    spotW.value = withSpring(200, { damping: 22, stiffness: 130, mass: 0.8 });
                    spotH.value = withSpring(200, { damping: 22, stiffness: 130, mass: 0.8 });
                } else if (currentStepData) {
                    spotX.value = withSpring(currentStepData.targetX, { damping: 22, stiffness: 130, mass: 0.8 });
                    spotY.value = withSpring(currentStepData.targetY, { damping: 22, stiffness: 130, mass: 0.8 });
                    spotW.value = withSpring(currentStepData.targetWidth, { damping: 22, stiffness: 130, mass: 0.8 });
                    spotH.value = withSpring(currentStepData.targetHeight, { damping: 22, stiffness: 130, mass: 0.8 });
                }
                spotlightOpacity.value = withTiming(1, { duration: 250 });
            }, 150);

            if (!isModalTutorial) {
                if (step === 0) {
                    setTimeout(() => {
                        imageX.value = withSpring(centerX - IMAGE_WIDTH / 2, { damping: 18, stiffness: 110 });
                        imageY.value = withSpring(centerY - 80, { damping: 18, stiffness: 110 });
                    }, 150);
                } else if (step === 1 && currentStepData) {
                    setTimeout(() => {
                        imageX.value = withSpring(currentStepData.targetX - 180, { damping: 18, stiffness: 110 });
                        imageY.value = withSpring(currentStepData.targetY - 80, { damping: 18, stiffness: 110 });
                    }, 150);
                }
            }

            setTimeout(() => {
                if (step === 0 && !isModalTutorial) {
                    cardTopVal.value = withSpring(SCREEN_HEIGHT / 2 + 80, { damping: 20, stiffness: 110 });
                } else {
                    cardTranslateY.value = 400;
                    cardTranslateY.value = withSpring(0, { damping: 20, stiffness: 110 });
                }
                cardOpacity.value = withTiming(1, { duration: 300 });
            }, 200);
        }
    }, [step]);

    // ─── Completion step: animate WC mascot to center ─────────────────────────
    useEffect(() => {
        if (!isCompletionStep) return;
        // Bring mascot to screen center, above the card
        imageX.value = withSpring(SCREEN_WIDTH / 2 - IMAGE_WIDTH / 2, { damping: 16, stiffness: 100 });
        imageY.value = withSpring(SCREEN_HEIGHT / 2 - 260, { damping: 16, stiffness: 100 });
        imageScale.value = withSpring(1, { damping: 14, stiffness: 100 });
        imageOpacity.value = withTiming(1, { duration: 300 });
        // Gentle float
        floatY.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
                withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
            ),
            -1,
            false,
        );
    }, [isCompletionStep]);

    // ─── SVG hole animated props ──────────────────────────────────────────────
    const circleHoleProps = useAnimatedProps(() => {
        const radius = Math.min(spotW.value, spotH.value) / 2;
        return { cx: spotX.value, cy: spotY.value, r: radius };
    });

    const rectHoleProps = useAnimatedProps(() => {
        const halfW = spotW.value / 2;
        const halfH = spotH.value / 2;
        return {
            x: spotX.value - halfW,
            y: spotY.value - halfH,
            width: spotW.value,
            height: spotH.value,
            rx: 12,
            ry: 12,
        };
    });

    const circleBorderProps = useAnimatedProps(() => {
        const radius = Math.min(spotW.value, spotH.value) / 2 + 3;
        return { cx: spotX.value, cy: spotY.value, r: radius };
    });

    const rectBorderProps = useAnimatedProps(() => {
        const halfW = spotW.value / 2;
        const halfH = spotH.value / 2;
        return {
            x: spotX.value - halfW - 3,
            y: spotY.value - halfH - 3,
            width: spotW.value + 6,
            height: spotH.value + 6,
            rx: 14,
            ry: 14,
        };
    });

    // ─── Animated styles ──────────────────────────────────────────────────────
    const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
    const spotlightStyle = useAnimatedStyle(() => ({ opacity: spotlightOpacity.value }));

    const welcomeCardStyle = useAnimatedStyle(() => ({
        opacity: cardOpacity.value,
        top: cardTopVal.value,
    }));

    const bottomCardAnimStyle = useAnimatedStyle(() => ({
        opacity: cardOpacity.value,
        transform: [{ translateY: cardTranslateY.value }],
    }));

    const nonModalImageStyle = useAnimatedStyle(() => {
        const floatOffset = interpolate(floatY.value, [0, 1], [-10, 10]);
        return {
            position: 'absolute' as const,
            left: imageX.value,
            top: imageY.value,
            transform: [
                { scale: imageScale.value },
                { translateY: floatOffset },
            ],
            opacity: imageScale.value,
        };
    });

    const dashboardStep6ImageStyle = useAnimatedStyle(() => {
        const halfH = spotH.value / 2;
        return {
            position: 'absolute' as const,
            top: spotY.value + halfH + 15,
            left: SCREEN_WIDTH / 2 - 80,
            zIndex: 10001,
        };
    });

    const modalPeepupImageStyle = useAnimatedStyle(() => {
        const halfH = spotH.value / 2;
        return {
            position: 'absolute' as const,
            top: spotY.value + halfH + 16,
            left: SCREEN_WIDTH / 2 - PEEPUP_W / 2,
            zIndex: 100002,
        };
    });

    const nonModalPeepupBelowStyle = useAnimatedStyle(() => {
        const halfH = spotH.value / 2;
        return {
            position: 'absolute' as const,
            top: spotY.value + halfH + 16,
            left: spotX.value - PEEPUP_W / 2,
            zIndex: 100002,
        };
    });

    const modalPeepImageStyle = useAnimatedStyle(() => {
        const halfH = spotH.value / 2;
        const halfW = spotW.value / 2;
        return {
            position: 'absolute' as const,
            top: spotY.value - PEEP_H / 2,
            left: spotX.value - halfW - PEEP_W - 16,
            zIndex: 100002,
        };
    });

    const modalCardBelowStyle = useAnimatedStyle(() => {
        const halfH = spotH.value / 2;
        return {
            opacity: cardOpacity.value,
            position: 'absolute' as const,
            top: spotY.value + halfH + 16 + PEEPUP_H + 8,
            left: CARD_H_MARGIN,
            right: CARD_H_MARGIN,
            zIndex: 100003,
        };
    });

    const modalCardAboveStyle = useAnimatedStyle(() => {
        const halfH = spotH.value / 2;
        return {
            opacity: cardOpacity.value,
            position: 'absolute' as const,
            top: spotY.value - halfH - PEEP_H - 16 - CARD_ESTIMATED_H - 8,
            left: CARD_H_MARGIN,
            right: CARD_H_MARGIN,
            zIndex: 100003,
        };
    });

    const topInset = insets.top;
    const noOverlayWcStyle = useAnimatedStyle(() => {
        return {
            position: 'absolute' as const,
            width: IMAGE_WIDTH,
            height: IMAGE_HEIGHT,
            left: SCREEN_WIDTH / 2 - IMAGE_WIDTH / 2,
            top: topInset + 16,
            opacity: imageOpacity.value,
            zIndex: 100002,
        };
    });

    // ─── Card content ─────────────────────────────────────────────────────────
    const renderCardContent = () => (
        <>
            <ThemedText type="h4" style={styles.cardTitle}>
                {currentStepData?.title ?? ''}
            </ThemedText>
            <ThemedText
                type="small"
                style={[styles.cardDesc, { color: colors.textSecondary }]}
            >
                {currentStepData?.description ?? ''}
            </ThemedText>

            <View style={styles.buttonsRow} pointerEvents="box-none">
                {isCompletionStep ? (
                    // ── Solo botón Finalizar — sin atrás ni saltar ──────────────
                    <Pressable
                        onPress={onNext}
                        style={[
                            styles.btn,
                            styles.btnPrimary,
                            { backgroundColor: colors.primary, flex: 1 },
                        ]}
                    >
                        <ThemedText type="small" style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                            ¡Finalizar!
                        </ThemedText>
                        <Feather name="check" size={16} color="#fff" />
                    </Pressable>
                ) : isWelcome ? (
                    <>
                        <Pressable
                            onPress={onSkip}
                            style={[styles.btn, styles.btnOutline, { borderColor: colors.border }]}
                        >
                            <ThemedText type="small" style={{ color: colors.textSecondary }}>
                                Omitir
                            </ThemedText>
                        </Pressable>
                        <Pressable
                            onPress={onNext}
                            style={[styles.btn, styles.btnPrimary, { backgroundColor: colors.primary }]}
                        >
                            <ThemedText type="small" style={{ color: '#fff', fontWeight: '600' }}>
                                Empezar
                            </ThemedText>
                            <Feather name="arrow-right" size={14} color="#fff" />
                        </Pressable>
                    </>
                ) : (
                    <>
                        {showBackButton && (
                            <Pressable
                                onPress={onBack}
                                style={[styles.btn, styles.btnOutline, { borderColor: colors.border }]}
                            >
                                <Feather name="arrow-left" size={14} color={colors.textSecondary} />
                                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                                    Atrás
                                </ThemedText>
                            </Pressable>
                        )}

                        <Pressable onPress={onSkip} style={styles.skipBtn}>
                            <ThemedText type="tiny" style={{ color: colors.textSecondary }}>
                                Saltar
                            </ThemedText>
                        </Pressable>

                        {canNext && (
                            <Pressable
                                onPress={onNext}
                                style={[styles.btn, styles.btnPrimary, { backgroundColor: colors.primary }]}
                            >
                                <ThemedText type="small" style={{ color: '#fff', fontWeight: '600' }}>
                                    Siguiente
                                </ThemedText>
                                <Feather name="arrow-right" size={14} color="#fff" />
                            </Pressable>
                        )}
                    </>
                )}
            </View>

            {steps.length > 1 && !isCompletionStep && (
                <View style={styles.dots} pointerEvents="box-none">
                    {steps.map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dot,
                                {
                                    backgroundColor:
                                        i === step
                                            ? colors.primary
                                            : colors.textSecondary + '40',
                                    width: i === step ? 12 : 6,
                                },
                            ]}
                        />
                    ))}
                </View>
            )}
        </>
    );

    // ─── bannerOnly ───────────────────────────────────────────────────────────
    if (bannerOnly && currentStepData) {
        return (
            <Animated.View
                style={[
                    styles.cardBottomFixed,
                    bottomCardAnimStyle,
                    {
                        backgroundColor: colors.cardBackground,
                        zIndex: 10002,
                        paddingBottom: insets.bottom + Spacing.xl,
                    },
                ]}
                pointerEvents="box-none"
            >
                <ThemedText type="h4" style={styles.cardTitle}>
                    {currentStepData.title}
                </ThemedText>
                <ThemedText type="small" style={[styles.cardDesc, { color: colors.textSecondary }]}>
                    {currentStepData.description}
                </ThemedText>
                <Pressable onPress={onSkip} style={{ alignItems: 'center', marginTop: 8 }}>
                    <ThemedText type="tiny" style={{ color: colors.textSecondary }}>
                        Saltar tutorial
                    </ThemedText>
                </Pressable>
            </Animated.View>
        );
    }

    // ─── noOverlay ────────────────────────────────────────────────────────────
    if (noOverlay) {
        return (
            <Animated.View
                style={[
                    StyleSheet.absoluteFill,
                    overlayStyle,
                    { zIndex: isModalTutorial ? 100000 : 9999 },
                ]}
                pointerEvents="box-none"
            >
                {mascot === 'wc' && (
                    <Animated.View style={noOverlayWcStyle} pointerEvents="none">
                        <Image
                            source={require('@/assets/images/wc.webp')}
                            style={styles.mascotImage}
                            contentFit="contain"
                        />
                    </Animated.View>
                )}

                {mascot === 'peepup' && isModalTutorial && (
                    <Animated.View style={[styles.modalPeepupContainer, modalPeepupImageStyle]} pointerEvents="none">
                        <Image
                            source={require('@/assets/images/peepup.webp')}
                            style={styles.modalPeepupImage}
                            contentFit="contain"
                        />
                    </Animated.View>
                )}

                {mascot === 'peepup' && !isModalTutorial && (
                    <Animated.View style={[styles.modalPeepupContainer, nonModalPeepupBelowStyle]} pointerEvents="none">
                        <Image
                            source={require('@/assets/images/peepup.webp')}
                            style={styles.modalPeepupImage}
                            contentFit="contain"
                        />
                    </Animated.View>
                )}

                <Animated.View
                    style={[
                        styles.cardBottomFixed,
                        bottomCardAnimStyle,
                        {
                            backgroundColor: colors.cardBackground,
                            zIndex: 10002,
                            paddingBottom: insets.bottom + Spacing.xl,
                        },
                    ]}
                    pointerEvents="box-none"
                >
                    {renderCardContent()}
                </Animated.View>

                {allowInteraction && onSpotlightPress && currentStepData && (
                    <Pressable
                        onPress={onSpotlightPress}
                        style={{
                            position: 'absolute',
                            left: currentStepData.targetX - currentStepData.targetWidth / 2,
                            top: currentStepData.targetY - currentStepData.targetHeight / 2,
                            width: currentStepData.targetWidth,
                            height: currentStepData.targetHeight,
                            zIndex: 100010,
                        }}
                    />
                )}
            </Animated.View>
        );
    }

    // ─── Render principal ─────────────────────────────────────────────────────
    return (
        <Animated.View
            style={[
                StyleSheet.absoluteFill,
                styles.overlay,
                overlayStyle,
                { zIndex: isModalTutorial ? 100000 : 9999 },
            ]}
            pointerEvents={allowInteraction ? 'box-none' : 'auto'}
        >
            <Pressable
                style={[styles.darkBackground, { zIndex: isModalTutorial ? 99999 : 1 }]}
                onPress={() => { }}
                pointerEvents={allowInteraction ? 'none' : 'auto'}
            />

            <Animated.View
                style={[
                    StyleSheet.absoluteFill,
                    spotlightStyle,
                    { zIndex: isModalTutorial ? 100001 : 10000 },
                ]}
                pointerEvents={allowInteraction ? 'box-none' : 'auto'}
            >
                <Svg
                    width="100%"
                    height="100%"
                    style={StyleSheet.absoluteFill}
                    pointerEvents={allowInteraction ? 'none' : 'auto'}
                >
                    <Defs>
                        <Mask id="spotMask">
                            <Rect x="0" y="0" width="100%" height="100%" fill="white" />
                            {!isWelcome && !isCompletionStep && (
                                isRect
                                    ? <AnimatedRect animatedProps={rectHoleProps} fill="black" />
                                    : <AnimatedCircle animatedProps={circleHoleProps} fill="black" />
                            )}
                        </Mask>
                    </Defs>

                    <Rect
                        x="0"
                        y="0"
                        width="100%"
                        height="100%"
                        fill="rgba(0,0,0,0.85)"
                        mask={!isWelcome && !isCompletionStep ? 'url(#spotMask)' : undefined}
                    />

                    {!isWelcome && !isCompletionStep && (
                        isRect
                            ? (
                                <AnimatedRect
                                    animatedProps={rectBorderProps}
                                    fill="none"
                                    stroke="rgba(255,255,255,0.7)"
                                    strokeWidth="3"
                                />
                            )
                            : (
                                <AnimatedCircle
                                    animatedProps={circleBorderProps}
                                    fill="none"
                                    stroke="rgba(255,255,255,0.7)"
                                    strokeWidth="3"
                                />
                            )
                    )}
                </Svg>
            </Animated.View>

            {/* ─── Confetti (solo en completion step) ──────────────────────── */}
            {isCompletionStep && confettiData.map((piece, i) => (
                <ConfettiPiece
                    key={`confetti-${i}`}
                    color={piece.color}
                    size={piece.size}
                    startX={Math.random() * SCREEN_WIDTH}
                    startDelay={piece.startDelay}
                    screenWidth={SCREEN_WIDTH}
                    screenHeight={SCREEN_HEIGHT}
                    active={isCompletionStep}
                />
            ))}

            {/* ─── Mascotas ────────────────────────────────────────────────── */}

            {/* WC: usa nonModalImageStyle que se mueve a centro en isCompletionStep */}
            {mascot === 'wc' && (
                <Animated.View
                    style={[styles.imageContainer, nonModalImageStyle]}
                    pointerEvents="none"
                >
                    <Image
                        source={require('@/assets/images/wc.webp')}
                        style={styles.mascotImage}
                        contentFit="contain"
                    />
                </Animated.View>
            )}

            {/* Peep: izquierda del spotlight */}
            {mascot === 'peep' && (
                <Animated.View
                    style={[styles.modalPeepContainer, modalPeepImageStyle]}
                    pointerEvents="none"
                >
                    <Image
                        source={require('@/assets/images/peep.webp')}
                        style={styles.modalPeepImage}
                        contentFit="contain"
                    />
                </Animated.View>
            )}

            {/* Peepup modal */}
            {mascot === 'peepup' && isModalTutorial && (
                <Animated.View
                    style={[styles.modalPeepupContainer, modalPeepupImageStyle]}
                    pointerEvents="none"
                >
                    <Image
                        source={require('@/assets/images/peepup.webp')}
                        style={styles.modalPeepupImage}
                        contentFit="contain"
                    />
                </Animated.View>
            )}

            {/* Peepup no-modal */}
            {mascot === 'peepup' && !isModalTutorial && (
                <Animated.View
                    style={[styles.modalPeepupContainer, nonModalPeepupBelowStyle]}
                    pointerEvents="none"
                >
                    <Image
                        source={require('@/assets/images/peepup.webp')}
                        style={styles.modalPeepupImage}
                        contentFit="contain"
                    />
                </Animated.View>
            )}

            {/* Dashboard step 6 */}
            {isDashboardStep6 && (
                <Animated.View
                    style={[styles.dashboardStep6ImageContainer, dashboardStep6ImageStyle]}
                    pointerEvents="none"
                >
                    <Image
                        source={require('@/assets/images/peepup.webp')}
                        style={styles.dashboardStep6Image}
                        contentFit="contain"
                    />
                </Animated.View>
            )}

            {/* ─── Cards modal ─────────────────────────────────────────────── */}
            {isModalTutorial && !isLastModalStep && (
                <Animated.View
                    style={[
                        styles.floatingCard,
                        modalCardBelowStyle,
                        { backgroundColor: colors.cardBackground },
                    ]}
                    pointerEvents="box-none"
                >
                    {renderCardContent()}
                </Animated.View>
            )}

            {isModalTutorial && isLastModalStep && (
                <Animated.View
                    style={[
                        styles.floatingCard,
                        modalCardAboveStyle,
                        { backgroundColor: colors.cardBackground },
                    ]}
                    pointerEvents="box-none"
                >
                    {renderCardContent()}
                </Animated.View>
            )}

            {/* ─── Área presionable del spotlight ──────────────────────────── */}
            {allowInteraction && onSpotlightPress && currentStepData && (
                <Pressable
                    onPress={onSpotlightPress}
                    style={{
                        position: 'absolute',
                        left: currentStepData.targetX - currentStepData.targetWidth / 2,
                        top: currentStepData.targetY - currentStepData.targetHeight / 2,
                        width: currentStepData.targetWidth,
                        height: currentStepData.targetHeight,
                        zIndex: 100010,
                    }}
                />
            )}

            {/* ─── Cards no-modal ───────────────────────────────────────────── */}
            {!isModalTutorial && isWelcome && (
                <Animated.View
                    style={[
                        styles.cardCentered,
                        welcomeCardStyle,
                        {
                            backgroundColor: colors.cardBackground,
                            zIndex: 10002,
                            paddingBottom: Platform.OS === 'ios' ? Spacing['2xl'] : Spacing.xl,
                        },
                    ]}
                    pointerEvents="box-none"
                >
                    {renderCardContent()}
                </Animated.View>
            )}

            {!isModalTutorial && !isWelcome && step === 1 && !isCompletionStep && (
                <Animated.View
                    style={[
                        styles.cardStep1,
                        bottomCardAnimStyle,
                        {
                            backgroundColor: colors.cardBackground,
                            zIndex: 10002,
                            paddingBottom: insets.bottom + Spacing.xl,
                        },
                    ]}
                    pointerEvents="box-none"
                >
                    {renderCardContent()}
                </Animated.View>
            )}

            {!isModalTutorial && !isWelcome && (step !== 1 || isCompletionStep) && (
                <Animated.View
                    style={[
                        styles.cardBottomFixed,
                        bottomCardAnimStyle,
                        {
                            backgroundColor: colors.cardBackground,
                            zIndex: 10002,
                            paddingBottom: insets.bottom + Spacing.xl,
                        },
                    ]}
                    pointerEvents="box-none"
                >
                    {renderCardContent()}
                </Animated.View>
            )}
        </Animated.View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    overlay: {
        zIndex: 9999,
    },
    darkBackground: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'transparent',
        zIndex: 1,
    },
    imageContainer: {
        width: IMAGE_WIDTH,
        height: IMAGE_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10001,
    },
    mascotImage: {
        width: '100%',
        height: '100%',
    },
    dashboardStep6ImageContainer: {
        width: 160,
        height: 130,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dashboardStep6Image: {
        width: '100%',
        height: '100%',
    },
    modalPeepupContainer: {
        width: PEEPUP_W,
        height: PEEPUP_H,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalPeepupImage: {
        width: '100%',
        height: '100%',
    },
    modalPeepContainer: {
        width: PEEP_W,
        height: PEEP_H,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalPeepImage: {
        width: '100%',
        height: '100%',
    },
    floatingCard: {
        borderRadius: 20,
        padding: Spacing.xl,
        paddingBottom: Platform.OS === 'ios' ? Spacing['2xl'] : Spacing.xl,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 12,
        elevation: 10,
    },
    cardCentered: {
        position: 'absolute',
        left: Spacing.xl,
        right: Spacing.xl,
        borderRadius: 24,
        padding: Spacing.xl,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 12,
        zIndex: 10002,
    },
    cardStep1: {
        position: 'absolute',
        left: Spacing.xl,
        right: Spacing.xl,
        bottom: 180,
        borderRadius: 24,
        padding: Spacing.xl,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 12,
        zIndex: 10002,
    },
    cardBottomFixed: {
        position: 'absolute',
        left: Spacing.md,
        right: Spacing.md,
        bottom: 0,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        padding: Spacing.xl,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 12,
        zIndex: 10002,
    },
    cardTitle: {
        textAlign: 'center',
        marginBottom: Spacing.sm,
        fontWeight: '700',
        fontSize: 20,
    },
    cardDesc: {
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: Spacing.lg,
        fontSize: 14,
    },
    buttonsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        justifyContent: 'center',
    },
    btn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        borderRadius: 12,
    },
    btnOutline: {
        borderWidth: 1.5,
    },
    btnPrimary: {},
    skipBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: Spacing.md,
    },
    dots: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: Spacing.sm,
        marginTop: Spacing.lg,
    },
    dot: {
        height: 6,
        borderRadius: 3,
    },
});