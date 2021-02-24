import bundleAsync from './bundleAsync';

jest.setTimeout(100000);

describe('bundler', () => {
  it('creates bundle for a single platform', async () => {
    const bundle = await bundleAsync('firestorter@2.0.1', ['ios']);
    expect(bundle).toMatchSnapshot();
  });

  it('fails when no package name is specified', async () => {
    await expect(bundleAsync('', ['ios'])).rejects.toEqual(new Error(`Failed to parse request`));
  });

  it('externalizes dependencies that are marked as external', async () => {
    // `expo-google-app-auth` declares `expo-app-auth` as a direct dependency.
    // The `expo-app-auth` dependency should however still be externalized and
    // not linked into the bundle.
    const bundle = await bundleAsync('expo-google-app-auth@8.1.3');
    expect(bundle).toMatchSnapshot();
    expect(bundle.files.android['bundle.js'].externals).toEqual(
      expect.arrayContaining(['expo-app-auth'])
    );
  });

  it('resolves external source-code references', async () => {
    // `expo-linear-gradient` imports source-code from react-native-web directly.
    // e.g. "import normalizeColor from 'react-native-web/src/modules/normalizeColor';"
    // The bundler should install `react-native-web` and resolve the import correctly.
    // All regular `react-native-web` imports should be externalized.
    const bundle = await bundleAsync('expo-linear-gradient@8.2.1');
    expect(bundle).toMatchSnapshot();
  });

  it('resolves commonly missing peer-deps (prop-types)', async () => {
    // For example 'react-native-responsive-grid@0.32.4' has a dependency
    // on prop-types but no peerDep listed in package.json.
    const bundle = await bundleAsync('react-native-responsive-grid@0.32.4');
    expect(bundle).toMatchSnapshot();
    expect(bundle.files.android['bundle.js'].externals).not.toEqual(
      expect.arrayContaining(['prop-types'])
    );
  });

  it.skip('creates bundle for @react-navigation/native', async () => {
    const bundle = await bundleAsync('@react-navigation/native@5.7.3');
    expect(bundle).toMatchSnapshot();
    // @react-navigation/core should be included in the bundle and not an external
    expect(bundle.files.android['bundle.js'].externals).not.toEqual(
      expect.arrayContaining(['@react-navigation/core'])
    );
  });

  it('creates bundle for @react-navigation/stack', async () => {
    const bundle = await bundleAsync('@react-navigation/stack@5.9.0');
    expect(bundle).toMatchSnapshot();
    // @react-navigation/native should be included as an external
    expect(bundle.files.android['bundle.js'].externals).toEqual(
      expect.arrayContaining(['@react-navigation/native'])
    );
  });

  it('externalizes references to react-native-gesture-handler/DrawerLayout', async () => {
    const bundle = await bundleAsync('react-navigation@3.13.0', ['ios']);
    expect(bundle).toMatchSnapshot();
    // react-native-gesture-handler/DrawerLayout should be included as an external
    expect(bundle.files.ios['bundle.js'].externals).toEqual(
      expect.arrayContaining(['react-native-gesture-handler/DrawerLayout'])
    );
  });

  it('creates bundle for subpath', async () => {
    const bundle = await bundleAsync('react-native-gesture-handler/DrawerLayout@1.6.0');
    expect(bundle).toMatchSnapshot();
  });

  it('disallows bundling of core modules', async () => {
    await expect(bundleAsync('expo', ['ios'])).rejects.toEqual(
      new Error(`Bundling core module 'expo' is prohibited`)
    );
    await expect(bundleAsync('react-native', ['ios'])).rejects.toEqual(
      new Error(`Bundling core module 'react-native' is prohibited`)
    );
    await expect(bundleAsync('react-native-web', ['ios'])).rejects.toEqual(
      new Error(`Bundling core module 'react-native-web' is prohibited`)
    );
    await expect(bundleAsync('react-native-windows', ['ios'])).rejects.toEqual(
      new Error(`Bundling core module 'react-native-windows' is prohibited`)
    );
    await expect(
      bundleAsync('react-native/Libraries/Image/AssetRegistry', ['ios'])
    ).rejects.toEqual(
      new Error(`Bundling core module 'react-native/Libraries/Image/AssetRegistry' is prohibited`)
    );
  });

  it('creates bundle for subpath of core package', async () => {
    const bundle2 = await bundleAsync('react-native-web/src/modules/normalizeColor@0.14.4');
    expect(bundle2).toMatchSnapshot();
  });

  it('created bundle for react-native-gesture-handler', async () => {
    const bundle = await bundleAsync('react-native-gesture-handler@1.6.0');
    expect(bundle).toMatchSnapshot();
  });

  it('creates bundle for react-native-webview', async () => {
    const bundle = await bundleAsync('react-native-webview@10.9.1');
    expect(bundle).toMatchSnapshot();
    // react-native-webview contains a direct reference to
    // 'react-native/Libraries/BatchedBridge/BatchedBridge` and
    // should bundle correctly
  });

  it('creates bundle for react-native-screens/native-stack', async () => {
    const bundle = await bundleAsync('react-native-screens/native-stack@2.11.0');
    expect(bundle).toMatchSnapshot();
    // react-native-webview contains a direct reference to
    // 'react-native/Libraries/ReactNative/AppContainer` and
    // should bundle correctly
  });

  it('creates native bundles when web entry point is not found', async () => {
    const bundle = await bundleAsync('react-native-reanimated@2.0.0-alpha.6');
    // entry point cannot be found for the web platform for this package.
    // this should not cause the bundler to fail but continue with the native
    // platforms instead.
    expect(bundle.files['ios']['bundle.js'].size).toBeGreaterThanOrEqual(10000);
    expect(bundle.files['android']['bundle.js'].size).toBeGreaterThanOrEqual(10000);
    expect(bundle.files['web']['bundle.js'].size).toBe(0);
  });

  it('compiles reanimated2 worklets', async () => {
    const bundle = await bundleAsync('react-native-reanimated@2.0.0-rc.3', undefined, true);
    // verify that the number of expected worklet instances appear in the
    // generated bundle.
    expect(bundle.files['ios']['bundle.js'].code!.match(/worklet/g)!.length).toBe(150);
    expect(bundle.files['android']['bundle.js'].code!.match(/worklet/g)!.length).toBe(150);
  });

  it('filter aliased react-native dependencies', async () => {
    const bundle = await bundleAsync('@react-native-community/datetimepicker@3.0.3');
    expect(bundle).toMatchSnapshot();
    // datetimepicker contains a peer-dependency on `react-native-windows`
    // which causes the snack-sdk to try and bundle that dependency as it is not
    // listed as a preloaded module. 'react-native-windows' is considered a special
    // alias for 'react-native` and it therefore removed as a peer dependency
    expect(bundle.peerDependencies['react-native-windows']).toBeUndefined();
  });
});
