import type { Meta, StoryObj } from '@storybook/angular-vite';
import { ProgressBar } from './progress-bar';

const meta: Meta<ProgressBar> = {
  title: 'UI/ProgressBar',
  component: ProgressBar,
  args: { value: 65, variant: 'info' },
  argTypes: {
    variant: { control: 'select', options: ['success', 'info', 'danger', 'neutral'] },
  },
};
export default meta;

type Story = StoryObj<ProgressBar>;

export const Default: Story = {};

/** Réplica de las barras del kit de Figma */
export const Kit: Story = {
  render: () => ({
    template: `
      <div style="display:flex; flex-direction:column; gap:8px">
        <app-progress-bar [value]="100" variant="success" />
        <app-progress-bar [value]="0" variant="neutral" />
        <app-progress-bar [value]="65" variant="info" />
        <app-progress-bar [value]="42" variant="danger" />
      </div>
    `,
  }),
};
