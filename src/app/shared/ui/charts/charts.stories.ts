import type { Meta, StoryObj } from '@storybook/angular-vite';
import { BarChart } from './bar-chart';
import { DonutChart } from './donut-chart';

const meta: Meta<DonutChart> = {
  title: 'UI/Charts',
  component: DonutChart,
};
export default meta;

export const Donut: StoryObj<DonutChart> = {
  args: {
    centerLabel: 'Viajes',
    data: [
      { label: 'Soja', value: 2467 },
      { label: 'Maíz', value: 1826 },
      { label: 'Girasol', value: 1463 },
    ],
  },
};

export const Barras: StoryObj<BarChart> = {
  render: () => ({
    props: {
      data: [
        { label: 'Campo Norte', value: 12 },
        { label: 'Los Nogales', value: 8 },
        { label: 'San Pedro', value: 5 },
        { label: 'La Esperanza', value: 9 },
      ],
    },
    moduleMetadata: { imports: [BarChart] },
    template: `<div style="max-width:480px"><app-bar-chart [data]="data" /></div>`,
  }),
};
