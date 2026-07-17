import { moduleMetadata } from '@storybook/angular-vite';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { Icon } from '../icon/icon';
import { KpiCard } from './kpi-card';

const meta: Meta<KpiCard> = {
  title: 'UI/KpiCard',
  component: KpiCard,
  decorators: [moduleMetadata({ imports: [Icon] })],
  args: {
    variant: 'light',
    label: 'En Ruta',
    value: '24',
    trend: '+12%',
  },
  argTypes: {
    variant: { control: 'select', options: ['light', 'dark'] },
  },
  render: (args) => ({
    props: args,
    template: `
      <app-kpi-card [variant]="variant" [label]="label" [value]="value" [trend]="trend">
        <app-icon name="truck" />
      </app-kpi-card>
    `,
  }),
};
export default meta;

type Story = StoryObj<KpiCard>;

export const EnRuta: Story = {};

export const RecaudacionDark: Story = {
  args: {
    variant: 'dark',
    label: 'Recaudación 2026',
    value: '$619,000',
    trend: '+45.2%',
  },
  render: (args) => ({
    props: args,
    template: `
      <app-kpi-card [variant]="variant" [label]="label" [value]="value" [trend]="trend">
        <app-icon name="dollar" />
      </app-kpi-card>
    `,
  }),
};

export const TendenciaNegativa: Story = {
  args: { label: 'Retrasados', value: '3', trend: '-8%' },
};
