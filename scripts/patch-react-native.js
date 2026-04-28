#!/usr/bin/env node
/**
 * Apply React Native patches for iOS New Architecture disable (RCTEventEmitter fix).
 * Run after npm install. Allows ENV RCT_NEW_ARCH_ENABLED=0 in Podfile to take effect.
 */
const fs = require('fs');
const path = require('path');

const rnRoot = path.join(__dirname, '..', 'node_modules', 'react-native');
const podsPath = path.join(rnRoot, 'scripts', 'react_native_pods.rb');
const newArchPath = path.join(rnRoot, 'scripts', 'cocoapods', 'new_architecture.rb');
const rootViewFactoryPath = path.join(rnRoot, 'Libraries', 'AppDelegate', 'RCTRootViewFactory.mm');
const reactNativeFactoryPath = path.join(rnRoot, 'Libraries', 'AppDelegate', 'RCTReactNativeFactory.mm');
const rctBridgePath = path.join(rnRoot, 'React', 'Base', 'RCTBridge.mm');
const rnXcodeScriptPath = path.join(rnRoot, 'scripts', 'react-native-xcode.sh');

if (!fs.existsSync(rnRoot)) {
  process.exit(0);
}

let changed = false;

// 1) react_native_pods.rb: do not overwrite RCT_NEW_ARCH_ENABLED when set to 0
if (fs.existsSync(podsPath)) {
  let content = fs.readFileSync(podsPath, 'utf8');
  const search = '  ENV["RCT_NEW_ARCH_ENABLED"] = "1"';
  const replace =
    '  # Allow disabling New Arch via Podfile (ENV set before use_react_native!) for bridgeless compatibility\n' +
    '  ENV["RCT_NEW_ARCH_ENABLED"] = (ENV["RCT_NEW_ARCH_ENABLED"] == "0" ? "0" : "1")';
  if (content.includes(search) && !content.includes('== "0" ? "0" : "1"')) {
    content = content.replace(search, replace);
    fs.writeFileSync(podsPath, content);
    changed = true;
  }
}

// 2) new_architecture.rb: new_arch_enabled respects ENV
if (fs.existsSync(newArchPath)) {
  let content = fs.readFileSync(newArchPath, 'utf8');
  const search = '        return true';
  const replace = "        return ENV['RCT_NEW_ARCH_ENABLED'] != '0'";
  if (content.includes('def self.new_arch_enabled') && content.includes(search) && !content.includes("!= '0'")) {
    content = content.replace(search, replace);
    fs.writeFileSync(newArchPath, content);
    changed = true;
  }
}

// 3) RCTRootViewFactory.mm: use newArchEnabled/turboModuleEnabled/bridgelessEnabled params instead of hardcoding YES
if (fs.existsSync(rootViewFactoryPath)) {
  let content = fs.readFileSync(rootViewFactoryPath, 'utf8');
  const marker = 'bridgelessEnabled:(BOOL)bridgelessEnabled';
  const search = marker + '\n{\n  if (self = [super init]) {\n    _bundleURLBlock = bundleURLBlock;\n    _fabricEnabled = YES;\n    _turboModuleEnabled = YES;\n    _bridgelessEnabled = YES;\n  }';
  const replace = marker + '\n{\n  if (self = [super init]) {\n    _bundleURLBlock = bundleURLBlock;\n    _fabricEnabled = newArchEnabled;\n    _turboModuleEnabled = turboModuleEnabled;\n    _bridgelessEnabled = bridgelessEnabled;\n  }';
  if (content.includes(search) && !content.includes('_bridgelessEnabled = bridgelessEnabled')) {
    content = content.replace(search, replace);
    fs.writeFileSync(rootViewFactoryPath, content);
    changed = true;
  }
}

// 4) RCTReactNativeFactory.mm: read RCTNewArchEnabled from Info.plist and pass to configuration
if (fs.existsSync(reactNativeFactoryPath)) {
  let content = fs.readFileSync(reactNativeFactoryPath, 'utf8');
  const search =
    '  RCTRootViewFactoryConfiguration *configuration =\n      [[RCTRootViewFactoryConfiguration alloc] initWithBundleURLBlock:bundleUrlBlock\n                                                       newArchEnabled:YES\n                                                   turboModuleEnabled:YES\n                                                    bridgelessEnabled:YES];';
  const replace =
    '  // Respect RCTNewArchEnabled from Info.plist (allows disabling to fix RCTEventEmitter/bridgeless issues)\n  NSNumber *plistNewArch = [[NSBundle mainBundle] objectForInfoDictionaryKey:@"RCTNewArchEnabled"];\n  BOOL newArchEnabled = (plistNewArch != nil) ? plistNewArch.boolValue : YES;\n\n  RCTRootViewFactoryConfiguration *configuration =\n      [[RCTRootViewFactoryConfiguration alloc] initWithBundleURLBlock:bundleUrlBlock\n                                                       newArchEnabled:newArchEnabled\n                                                   turboModuleEnabled:newArchEnabled\n                                                    bridgelessEnabled:newArchEnabled];';
  if (content.includes('newArchEnabled:YES') && content.includes('bridgelessEnabled:YES') && !content.includes('objectForInfoDictionaryKey:@\"RCTNewArchEnabled\"')) {
    content = content.replace(
      '  RCTRootViewFactoryConfiguration *configuration =\n      [[RCTRootViewFactoryConfiguration alloc] initWithBundleURLBlock:bundleUrlBlock\n                                                       newArchEnabled:YES\n                                                   turboModuleEnabled:YES\n                                                    bridgelessEnabled:YES];',
      replace
    );
    fs.writeFileSync(reactNativeFactoryPath, content);
    changed = true;
  }
}

// 5) RCTRootViewFactory.mm: when bridgelessEnabled is NO, use bridge path instead of RCTHost
if (fs.existsSync(rootViewFactoryPath)) {
  let content = fs.readFileSync(rootViewFactoryPath, 'utf8');
  const search =
    '- (UIView *)viewWithModuleName:(NSString *)moduleName\n             initialProperties:(NSDictionary *)initProps\n                 launchOptions:(NSDictionary *)launchOptions\n          devMenuConfiguration:(RCTDevMenuConfiguration *)devMenuConfiguration\n{\n  [self initializeReactHostWithLaunchOptions:launchOptions devMenuConfiguration:devMenuConfiguration];\n\n  RCTFabricSurface *surface = [self.reactHost createSurfaceWithModuleName:moduleName';
  const replace =
    '- (UIView *)viewWithModuleName:(NSString *)moduleName\n             initialProperties:(NSDictionary *)initProps\n                 launchOptions:(NSDictionary *)launchOptions\n          devMenuConfiguration:(RCTDevMenuConfiguration *)devMenuConfiguration\n{\n  if (!_configuration.bridgelessEnabled) {\n    // Use bridge + legacy RCTRootView (no Fabric) when RCTNewArchEnabled is false\n    [self createBridgeIfNeeded:launchOptions];\n    UIView *rootView = [self createRootViewWithBridge:self.bridge moduleName:moduleName initProps:initProps ? initProps : @{}];\n    if (!rootView) { return nil; }\n    rootView.backgroundColor = [UIColor systemBackgroundColor];\n    if (_configuration.customizeRootView != nil) {\n      _configuration.customizeRootView((RCTRootView *)rootView);\n    }\n    return rootView;\n  }\n\n  [self initializeReactHostWithLaunchOptions:launchOptions devMenuConfiguration:devMenuConfiguration];\n\n  RCTFabricSurface *surface = [self.reactHost createSurfaceWithModuleName:moduleName';
  if (content.includes(search) && !content.includes('if (!_configuration.bridgelessEnabled) {')) {
    content = content.replace(search, replace);
    fs.writeFileSync(rootViewFactoryPath, content);
    changed = true;
  }
}

// 6) RCTRootViewFactory.mm: use legacy RCTRootView (not Fabric) when bridgelessEnabled is NO
if (fs.existsSync(rootViewFactoryPath)) {
  let content = fs.readFileSync(rootViewFactoryPath, 'utf8');
  const search =
    '- (UIView *)createRootViewWithBridge:(RCTBridge *)bridge\n                          moduleName:(NSString *)moduleName\n                           initProps:(NSDictionary *)initProps\n{\n  UIView *rootView = RCTAppSetupDefaultRootView(bridge, moduleName, initProps, YES);\n  rootView.backgroundColor = [UIColor systemBackgroundColor];\n  return rootView;\n}';
  const replace =
    '- (UIView *)createRootViewWithBridge:(RCTBridge *)bridge\n                          moduleName:(NSString *)moduleName\n                           initProps:(NSDictionary *)initProps\n{\n  UIView *rootView;\n  if (!_configuration.bridgelessEnabled) {\n    rootView = [[RCTRootView alloc] initWithBridge:bridge moduleName:moduleName initialProperties:initProps ? initProps : @{}];\n  } else {\n    rootView = RCTAppSetupDefaultRootView(bridge, moduleName, initProps, YES);\n  }\n  rootView.backgroundColor = [UIColor systemBackgroundColor];\n  return rootView;\n}';
  if (content.includes('RCTAppSetupDefaultRootView(bridge, moduleName, initProps, YES)') && !content.includes('[[RCTRootView alloc] initWithBridge:bridge')) {
    content = content.replace(search, replace);
    fs.writeFileSync(rootViewFactoryPath, content);
    changed = true;
  }
}

// 7) RCTBridge.mm: allow legacy bridge when RCT_NEW_ARCH_ENABLED=0 (RN 0.83+ throws otherwise)
if (fs.existsSync(rctBridgePath)) {
  let content = fs.readFileSync(rctBridgePath, 'utf8');
  if (content.includes('You are trying to initialize the legacy architecture') && !content.includes('No-op so bridge can initialize')) {
    content = content.replace(
      /\+ \(void\)throwIfOnLegacyArch\s*\{\s*@throw \[NSException[\s\S]*?userInfo:nil\];\s*\}/,
      '+ (void)throwIfOnLegacyArch\n{\n  // No-op so bridge can initialize when using legacy path (Podfile ENV RCT_NEW_ARCH_ENABLED=0).\n}'
    );
    fs.writeFileSync(rctBridgePath, content);
    changed = true;
  }
}

// 8) react-native-xcode.sh: if HERMES_CLI_PATH is set but invalid, fall back to Pods hermesc.
// This fixes Archive failures when a stale HERMES_CLI_PATH points to a different checkout.
if (fs.existsSync(rnXcodeScriptPath)) {
  let content = fs.readFileSync(rnXcodeScriptPath, 'utf8');
  const search = 'HERMES_ENGINE_PATH="$PODS_ROOT/hermes-engine"\\n[ -z "$HERMES_CLI_PATH" ] && HERMES_CLI_PATH="$HERMES_ENGINE_PATH/destroot/bin/hermesc"';
  const replace =
    'HERMES_ENGINE_PATH="$PODS_ROOT/hermes-engine"\\n' +
    'if [[ -z "$HERMES_CLI_PATH" || ! -f "$HERMES_CLI_PATH" ]]; then\\n' +
    '  HERMES_CLI_PATH="$HERMES_ENGINE_PATH/destroot/bin/hermesc"\\n' +
    'fi';
  if (content.includes('HERMES_ENGINE_PATH="$PODS_ROOT/hermes-engine"') && content.includes('[ -z "$HERMES_CLI_PATH" ] && HERMES_CLI_PATH=') && !content.includes('|| ! -f "$HERMES_CLI_PATH"')) {
    content = content.replace(search, replace);
    fs.writeFileSync(rnXcodeScriptPath, content);
    changed = true;
  }
}

if (changed) {
  console.log('patch-react-native: applied iOS New Arch disable patches');
} else if (fs.existsSync(podsPath)) {
  console.log('patch-react-native: iOS New Arch disable patches already applied');
}
