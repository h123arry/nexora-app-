const config = {
  appId: 'com.voiceofharrison.nexora',
  appName: 'NEXORA',
  webDir: 'dist',
  server: { androidScheme: 'https', cleartext: false },
  android: { allowMixedContent: false, captureInput: false },
  ios: { contentInset: 'automatic', preferredContentMode: 'mobile' },
  plugins: { SplashScreen: { launchShowDuration: 0, launchAutoHide: true, backgroundColor: '#090714' } },
};
export default config;
