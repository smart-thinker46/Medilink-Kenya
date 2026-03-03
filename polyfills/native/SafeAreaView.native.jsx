import React, { forwardRef } from "react";
import { SafeAreaView as NativeSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = forwardRef(({ edges, ...rest }, ref) => {
  return (
    <NativeSafeAreaView
      ref={ref}
      edges={edges || ["top", "right", "bottom", "left"]}
      {...rest}
    />
  );
});

SafeAreaView.displayName = "SafeAreaView";

export default SafeAreaView;
export { SafeAreaView };
