import type { Meta, StoryObj } from '@storybook/angular-vite';
import { Sidebar, SidebarItem } from './sidebar';

const ITEMS: SidebarItem[] = [
  { id: 'despachos', icon: 'truck', label: 'Despachos' },
  { id: 'gestion', icon: 'grid', label: 'Gestión operativa' },
  { id: 'reportes', icon: 'dollar', label: 'Reportería' },
  { id: 'mensajeria', icon: 'message', label: 'Mensajería' },
  { id: 'borradores', icon: 'list', label: 'Borradores' },
  { id: 'configuracion', icon: 'settings', label: 'Configuración', section: 'bottom' },
];

const meta: Meta<Sidebar> = {
  title: 'UI/Sidebar',
  component: Sidebar,
  args: {
    items: ITEMS,
    activeId: 'despachos',
  },
  render: (args) => ({
    props: args,
    template: `
      <div style="height: 560px">
        <app-sidebar [items]="items" [activeId]="activeId" />
      </div>
    `,
  }),
};
export default meta;

type Story = StoryObj<Sidebar>;

export const Default: Story = {};

/** Réplica de Bars del kit de Figma: las 6 variantes de item activo */
export const Estados: Story = {
  render: (args) => ({
    props: { ...args, ids: ITEMS.map((item) => item.id) },
    template: `
      <div style="display:flex; gap:16px; height: 560px">
        @for (id of ids; track id) {
          <app-sidebar [items]="items" [activeId]="id" />
        }
      </div>
    `,
  }),
};
