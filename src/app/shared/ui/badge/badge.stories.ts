import type { Meta, StoryObj } from '@storybook/angular-vite';
import { Badge } from './badge';

const meta: Meta<Badge> = {
  title: 'UI/Badge',
  component: Badge,
  args: { variant: 'success' },
  argTypes: {
    variant: { control: 'select', options: ['success', 'danger', 'info', 'warning', 'neutral'] },
  },
  render: (args) => ({
    props: args,
    template: `<app-badge [variant]="variant">Completado</app-badge>`,
  }),
};
export default meta;

type Story = StoryObj<Badge>;

export const Success: Story = {};

/** Réplica de la sección Labels del kit de Figma (estados de viaje) */
export const EstadosDeViaje: Story = {
  render: () => ({
    template: `
      <div style="display:flex; flex-direction:column; gap:8px; align-items:flex-start">
        <app-badge variant="success">Completado</app-badge>
        <app-badge variant="danger">Retrasado</app-badge>
        <app-badge variant="info">En viaje</app-badge>
        <app-badge variant="warning">Pendiente</app-badge>
        <app-badge variant="neutral">Sin asignar</app-badge>
      </div>
    `,
  }),
};
