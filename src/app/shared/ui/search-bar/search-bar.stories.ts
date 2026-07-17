import type { Meta, StoryObj } from '@storybook/angular-vite';
import { SearchBar } from './search-bar';

const meta: Meta<SearchBar> = {
  title: 'UI/SearchBar',
  component: SearchBar,
  args: {
    placeholder: 'Grupo, viaje, chofere, productores...',
    value: '',
  },
};
export default meta;

type Story = StoryObj<SearchBar>;

export const Default: Story = {};
