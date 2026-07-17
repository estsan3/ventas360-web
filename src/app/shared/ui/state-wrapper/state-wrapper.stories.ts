import type { Meta, StoryObj } from '@storybook/angular-vite';
import { StateWrapper } from './state-wrapper';

const meta: Meta<StateWrapper> = {
  title: 'UI/StateWrapper',
  component: StateWrapper,
  args: {
    status: 'loading',
    error: '',
    empty: false,
    skeletonRows: 3,
  },
  argTypes: {
    status: { control: 'select', options: ['idle', 'loading', 'success', 'error'] },
  },
  render: (args) => ({
    props: args,
    template: `
      <app-state-wrapper [status]="status" [error]="error" [empty]="empty" [skeletonRows]="skeletonRows">
        <p>Contenido cargado correctamente ✅</p>
      </app-state-wrapper>
    `,
  }),
};
export default meta;

type Story = StoryObj<StateWrapper>;

export const Cargando: Story = {};

export const Error: Story = {
  args: { status: 'error', error: 'No se pudieron cargar los despachos' },
};

export const Vacio: Story = {
  args: { status: 'success', empty: true, emptyMessage: 'Aún no hay despachos creados' },
};

export const ConContenido: Story = {
  args: { status: 'success' },
};
