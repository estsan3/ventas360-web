import type { Meta, StoryObj } from '@storybook/angular-vite';
import { Toast } from './toast';

const meta: Meta<Toast> = {
  title: 'UI/Toast',
  component: Toast,
  args: {
    variant: 'success',
    title: '¡Operación exitosa!',
    message: 'Tu solicitud se ha completado correctamente.',
    dismissible: true,
  },
  argTypes: {
    variant: { control: 'select', options: ['success', 'error', 'warning'] },
  },
};
export default meta;

type Story = StoryObj<Toast>;

export const Exito: Story = {};

/** Réplica de la sección Toasts del kit de Figma */
export const Kit: Story = {
  render: () => ({
    template: `
      <div style="display:flex; flex-direction:column; gap:16px">
        <app-toast
          variant="error"
          title="Error al procesar"
          message="No se pudo completar la operación. Inténtalo de nuevo."
        />
        <app-toast
          variant="success"
          title="¡Operación exitosa!"
          message="Tu solicitud se ha completado correctamente."
        />
        <app-toast
          variant="warning"
          title="Actualización importante"
          message="Por favor revisa la información antes de continuar."
        />
      </div>
    `,
  }),
};
