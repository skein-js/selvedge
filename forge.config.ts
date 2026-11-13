import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import type { ForgeConfig } from '@electron-forge/shared-types';

const config: ForgeConfig = {
  packagerConfig: {
    name: 'Selvedge',
    executableName: 'selvedge',
    asar: true,
    ignore: (path) =>
      path !== '' &&
      !/^\/(package\.json$|node_modules($|\/)|dist($|\/desktop($|\/)|\/apps($|\/renderer($|\/))))/.test(
        path,
      ),
  },
  rebuildConfig: { onlyModules: ['better-sqlite3'] },
  plugins: [new AutoUnpackNativesPlugin({})],
  makers: [],
  publishers: [],
};

export default config;
