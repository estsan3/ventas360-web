import type { Meta, StoryObj } from '@storybook/angular-vite';
import { Logo } from './logo';

const meta: Meta<Logo> = {
  title: 'UI/Logo',
  component: Logo,
  args: { size: 'md', compact: false },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md'] },
  },
};
export default meta;

type Story = StoryObj<Logo>;

export const Default: Story = {};

export const Compacto: Story = {
  args: { compact: true },
};
