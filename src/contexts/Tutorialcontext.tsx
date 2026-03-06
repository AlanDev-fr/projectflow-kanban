import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TutorialContextType {
    showTutorial: boolean;
    currentStep: number;
    nextStep: () => void;
    prevStep: () => void;
    skipTutorial: () => void;
    restartTutorial: () => void;
    completeTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

const TUTORIAL_KEY = '@tutorial_completed';

export function TutorialProvider({ children }: { children: React.ReactNode }) {
    const [showTutorial, setShowTutorial] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const completed = await AsyncStorage.getItem(TUTORIAL_KEY);
                if (completed === null) setShowTutorial(true);
            } catch (e) {
                console.error('Error checking tutorial status:', e);
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    const nextStep = () => setCurrentStep((prev) => prev + 1);
    const prevStep = () => setCurrentStep((prev) => Math.max(0, prev - 1));

    const markDone = async () => {
        try {
            await AsyncStorage.setItem(TUTORIAL_KEY, 'true');
        } catch (e) {
            console.error('Error saving tutorial state:', e);
        }
        setShowTutorial(false);
        setCurrentStep(0);
    };

    const skipTutorial = markDone;
    const completeTutorial = markDone;

    const restartTutorial = async () => {
        try {
            await AsyncStorage.removeItem(TUTORIAL_KEY);
        } catch (e) {
            console.error('Error restarting tutorial:', e);
        }
        setCurrentStep(0);
        setShowTutorial(true);
    };

    if (isLoading) return null;

    return (
        <TutorialContext.Provider
            value={{
                showTutorial,
                currentStep,
                nextStep,
                prevStep,
                skipTutorial,
                restartTutorial,
                completeTutorial,
            }}
        >
            {children}
        </TutorialContext.Provider>
    );
}

export function useTutorial() {
    const ctx = useContext(TutorialContext);
    if (!ctx) throw new Error('useTutorial must be used within TutorialProvider');
    return ctx;
}