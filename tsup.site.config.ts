import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    main: 'src/site/main.ts',
  },
  bundle: true,
  clean: false,
  dts: false,
  format: ['esm'],
  outExtension() {
    return {
      js: '.js',
    };
  },
  outDir: 'site-dist/assets',
  platform: 'browser',
  sourcemap: false,
  splitting: false,
  target: 'es2022',
});
