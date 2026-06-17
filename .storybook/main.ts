import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.tsx'],
  addons: [
    '@storybook/addon-a11y',
  ],
  framework: '@storybook/nextjs-vite',
  staticDirs: ['../public'],
};

export default config;
