import { createConfig } from '@nx/angular-rspack';

export default createConfig(
  {
    options: {
      root: import.meta.dirname,
      outputPath: { base: '../../dist/apps/renderer' },
      index: './src/index.html',
      browser: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      styles: ['./src/styles.css'],
      baseHref: './',
      aot: true,
      devServer: { host: '127.0.0.1', port: 4200 },
    },
    rspackConfigOverrides: { devtool: 'source-map' },
  },
  {
    production: {
      options: {
        outputHashing: 'all',
        optimization: {
          scripts: true,
          // Critical-CSS activation injects an inline script, which our CSP rejects.
          styles: { minify: true, inlineCritical: false },
        },
      },
    },
    development: { options: { optimization: false, sourceMap: true, namedChunks: true } },
  },
);
