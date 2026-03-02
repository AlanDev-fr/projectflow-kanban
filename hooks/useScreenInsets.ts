import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";

import { Spacing } from "@/constants/theme";

export function useScreenInsets() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  return {
    paddingTop: headerHeight + Spacing.xl,
    paddingBottom: insets.bottom + Spacing.xl,
    scrollInsetBottom: insets.bottom + 16,
    insets,
    headerHeight,
  };
}
