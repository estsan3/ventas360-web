import type { Meta, StoryObj } from '@storybook/angular-vite';
import { Button } from './button';

const meta: Meta<Button> = {
  title: 'UI/Button',
  component: Button,
  args: {
    variant: 'primary',
    size: 'md',
    disabled: false,
    fullWidth: false,
  },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'danger', 'outline'] },
    size: { control: 'select', options: ['xl', 'md', 'sm'] },
  },
  render: (args) => ({
    props: args,
    template: `
      <app-button [variant]="variant" [size]="size" [disabled]="disabled" [fullWidth]="fullWidth">
        Iniciar sesión
      </app-button>
    `,
  }),
};
export default meta;

type Story = StoryObj<Button>;

export const Primary: Story = {};

export const XL: Story = {
  args: { size: 'xl', fullWidth: true },
};

export const Danger: Story = {
  args: { variant: 'danger', size: 'sm' },
  render: (args) => ({
    props: args,
    template: `<app-button [variant]="variant" [size]="size">Dar de Baja</app-button>`,
  }),
};

export const Outline: Story = {
  args: { variant: 'outline' },
  render: (args) => ({
    props: args,
    template: `<app-button [variant]="variant" [size]="size">Filtros</app-button>`,
  }),
};

export const ConIcono: Story = {
  render: () => ({
    template: `
      <app-button variant="primary" size="md">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Crear Despacho
      </app-button>
    `,
  }),
};

/** Réplica de la sección XL / Medium / Small del kit de Figma */
export const Kit: Story = {
  render: () => ({
    template: `
      <div style="display:flex; flex-direction:column; gap:16px; max-width:480px">
        <app-button variant="primary" size="xl" [fullWidth]="true">Iniciar sesión</app-button>
        <div style="display:flex; gap:12px; align-items:center">
          <app-button variant="primary" size="md">Iniciar sesión</app-button>
          <app-button variant="outline" size="md">Filtros</app-button>
          <app-button variant="danger" size="sm">Dar de Baja</app-button>
        </div>
      </div>
    `,
  }),
};
