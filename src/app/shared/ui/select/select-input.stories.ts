import type { Meta, StoryObj } from '@storybook/angular-vite';
import { SelectInput } from './select-input';

const meta: Meta<SelectInput> = {
  title: 'UI/SelectInput',
  component: SelectInput,
  args: {
    label: 'Productor *',
    placeholder: 'Seleccionar productor…',
    options: [
      { value: 'agro-sa', label: 'Agro SA' },
      { value: 'campo-verde', label: 'Campo Verde SRL' },
      { value: 'la-pampa', label: 'La Pampa Agro' },
    ],
    error: '',
  },
};
export default meta;

type Story = StoryObj<SelectInput>;

export const Default: Story = {};

export const ConError: Story = {
  args: { error: 'Seleccioná un productor' },
};
