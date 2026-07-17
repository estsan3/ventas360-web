import type { StorybookConfig } from '@storybook/angular-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-vitest',
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
  ],
  framework: {
    name: '@storybook/angular-vite',
    options: {
      compodoc: true,
      compodocArgs: ['-e', 'json', '-d', '.'],
    },
  },
  viteFinal: async (config) => {
    // Mismos includePaths que angular.json para poder hacer @use 'tokens'
    // en los .scss de componentes también dentro de Storybook
    config.css = {
      ...config.css,
      preprocessorOptions: {
        ...config.css?.preprocessorOptions,
        scss: {
          ...(config.css?.preprocessorOptions as Record<string, object> | undefined)?.['scss'],
          loadPaths: ['src/styles'],
        },
      },
    };
    return config;
  },
};
export default config;
