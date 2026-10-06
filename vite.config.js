import { defineConfig } from 'vite';

// The built site is published as a GitHub Pages project site at https://telingc.github.io/cq/;
// `vite preview` serves that build under the same path, while `vite` dev stays at the root.
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/cq/' : '/'
}));
