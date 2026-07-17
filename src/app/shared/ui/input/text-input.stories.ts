import type { Meta, StoryObj } from '@storybook/angular-vite';
import { TextInput } from './text-input';

const meta: Meta<TextInput> = {
  title: 'UI/TextInput',
  component: TextInput,
  args: {
    label: 'Correo electrónico',
    placeholder: 'tu@empresa.com',
    type: 'email',
    error: '',
  },
  argTypes: {
    type: { control: 'select', options: ['text', 'email', 'password', 'number', 'date'] },
  },
};
export default meta;

type Story = StoryObj<TextInput>;

export const Default: Story = {};

export const Password: Story = {
  args: { label: 'Contraseña', placeholder: '••••••••', type: 'password' },
};

export const ConError: Story = {
  args: { error: 'El correo no es válido' },
};

/** Réplica de la sección Input del kit de Figma */
export const Kit: Story = {
  render: () => ({
    template: `
      <div style="display:flex; gap:24px; max-width:640px">
        <div style="flex:1">
          <app-text-input label="Correo electrónico" placeholder="tu@empresa.com" type="email" />
        </div>
        <div style="flex:1">
          <app-text-input label="Contraseña" placeholder="••••••••" type="password" />
        </div>
      </div>
    `,
  }),
};
