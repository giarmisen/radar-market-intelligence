import type { Preview } from '@storybook/nextjs-vite';
import React from 'react';
import '../app/globals.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'content',
      values: [
        { name: 'content', value: '#FAFAF8' },
        { name: 'white', value: '#FFFFFF' },
        { name: 'sidebar', value: '#0F172A' },
      ],
    },
    viewport: {
      defaultViewport: 'desktop',
      viewports: {
        desktop: {
          name: 'Desktop',
          styles: { width: '1280px', height: '800px' },
          type: 'desktop',
        },
        tablet: {
          name: 'Tablet',
          styles: { width: '768px', height: '1024px' },
          type: 'tablet',
        },
        mobile: {
          name: 'Mobile',
          styles: { width: '375px', height: '667px' },
          type: 'mobile',
        },
      },
    },
    a11y: {
      context: 'body',
      test: 'error',
    },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          fontFamily: 'var(--font-primary)',
          color: 'var(--color-text-primary)',
          minHeight: '100%',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default preview;

export const tags = ['autodocs'];
