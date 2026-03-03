import 'react-native-url-polyfill/auto';
import './src/__create/polyfills';

import 'expo-router/entry';
import { type ReactNode } from 'react';
import { AppRegistry } from 'react-native';
import { DeviceErrorBoundaryWrapper } from './__create/DeviceErrorBoundary';

if (__DEV__) {
  function WrapperComponentProvider({
    children,
  }: {
    children: ReactNode;
  }) {
    return <DeviceErrorBoundaryWrapper>{children}</DeviceErrorBoundaryWrapper>;
  }

  AppRegistry.setWrapperComponentProvider(() => WrapperComponentProvider);
}
