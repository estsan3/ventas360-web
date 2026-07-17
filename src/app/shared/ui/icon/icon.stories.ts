import type { Meta, StoryObj } from '@storybook/angular-vite';
import { Icon } from './icon';

const ICONS = [
  'search',
  'filter',
  'plus',
  'x',
  'check-circle',
  'alert-triangle',
  'alert-circle',
  'info',
  'truck',
  'grid',
  'dollar',
  'message',
  'list',
  'settings',
  'play',
  'bell',
  'user',
] as const;

const meta: Meta<Icon> = {
  title: 'UI/Icon',
  component: Icon,
  args: { name: 'truck' },
  argTypes: {
    name: { control: 'select', options: [...ICONS] },
  },
};
export default meta;

type Story = StoryObj<Icon>;

export const Default: Story = {};

export const Catalogo: Story = {
  render: () => ({
    props: { icons: ICONS },
    template: `
      <div style="display:flex; flex-wrap:wrap; gap:16px; font-size:24px; color:#1f2937">
        @for (icon of icons; track icon) {
          <div style="display:flex; flex-direction:column; align-items:center; gap:4px; width:88px">
            <app-icon [name]="icon" />
            <span style="font-size:11px; color:#6b7280">{{ icon }}</span>
          </div>
        }
      </div>
    `,
  }),
};
