import type { Meta, StoryObj } from '@storybook/angular-vite';
import { Sidebar, SidebarItem } from './sidebar';

const ITEMS: SidebarItem[] = [
  { id: 'dashboard', icon: 'grid', label: 'Inicio' },
  { id: 'ventas', icon: 'file-text', label: 'Mostrador' },
  { id: 'presupuestos', icon: 'ticket', label: 'Presup.' },
  { id: 'pedidos', icon: 'list', label: 'Pedidos' },
  { id: 'remitos', icon: 'truck', label: 'Remitos' },
  { id: 'clientes', icon: 'user', label: 'Clientes' },
  { id: 'cuenta-corriente', icon: 'dollar', label: 'Cta. cte.' },
  { id: 'productos', icon: 'package', label: 'Artículos' },
  { id: 'inventario', icon: 'package', label: 'Stock' },
  { id: 'compras', icon: 'truck', label: 'Compras' },
  { id: 'caja', icon: 'dollar', label: 'Caja' },
  { id: 'configuracion', icon: 'settings', label: 'Config.', section: 'bottom' },
];

const meta: Meta<Sidebar> = {
  title: 'UI/Sidebar',
  component: Sidebar,
  args: {
    items: ITEMS,
    activeId: 'dashboard',
    avatarIniciales: 'MG',
    pieTexto: 'Suc. Central · Caja 1',
  },
  render: (args) => ({
    props: args,
    template: `
      <div style="height: 100vh; display:flex; background:#faf9f7">
        <app-sidebar
          [items]="items"
          [activeId]="activeId"
          [avatarIniciales]="avatarIniciales"
          [pieTexto]="pieTexto"
        />
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
