import { moduleMetadata } from '@storybook/angular-vite';
import type { Meta, StoryObj } from '@storybook/angular-vite';
import { Badge } from '../badge/badge';
import { Button } from '../button/button';
import { TableCellDef } from './table-cell-def';
import { Table } from './table';

const meta: Meta<Table> = {
  title: 'UI/Table',
  component: Table,
  decorators: [moduleMetadata({ imports: [TableCellDef, Badge, Button] })],
};
export default meta;

type Story = StoryObj<Table>;

/** Réplica de Table elements del kit de Figma (usuarios) */
export const Usuarios: Story = {
  render: () => ({
    props: {
      columns: [
        { key: 'nombre', label: 'Nombre y Apellido' },
        { key: 'dni', label: 'DNI' },
        { key: 'email', label: 'Email' },
        { key: 'acciones', label: 'Acciones', align: 'right' as const },
      ],
      rows: [
        { nombre: 'Juan Pérez', dni: '12345678', email: 'juan.perez@email.com' },
        { nombre: 'Juan Pérez', dni: '12345678', email: 'juan.perez@email.com' },
        { nombre: 'Juan Pérez', dni: '12345678', email: 'juan.perez@email.com' },
      ],
    },
    template: `
      <app-table [columns]="columns" [rows]="rows">
        <ng-template appTableCell="acciones">
          <app-button variant="danger" size="sm">Dar de Baja</app-button>
        </ng-template>
      </app-table>
    `,
  }),
};

/** Filas de viajes con badges de estado (tabla gestión operativa) */
export const Viajes: Story = {
  render: () => ({
    props: {
      columns: [
        { key: 'id', label: 'ID' },
        { key: 'chofer', label: 'Chofer / Patente' },
        { key: 'destino', label: 'Destino' },
        { key: 'toneladas', label: 'Toneladas' },
        { key: 'estado', label: 'Estado' },
        { key: 'observaciones', label: 'Observaciones' },
      ],
      rows: [
        {
          id: '#12345',
          chofer: 'Juan Pérez / AB123CD',
          destino: 'Buenos Aires - Puerto',
          toneladas: '28 tn',
          estado: 'en-viaje',
          observaciones: 'Viaje normal',
        },
        {
          id: '#12343',
          chofer: 'Sin asignar',
          destino: 'Buenos Aires - Puerto',
          toneladas: '28 tn',
          estado: 'pendiente',
          observaciones: 'Pendiente asignación',
        },
        {
          id: '#12342',
          chofer: 'Pedro Ramírez / XY789ZA',
          destino: 'Buenos Aires - Puerto',
          toneladas: '30 tn',
          estado: 'retrasado',
          observaciones: 'Desperfecto técnico en ruta',
        },
        {
          id: '#12340',
          chofer: 'Carlos Ruiz / DE456FG',
          destino: 'Buenos Aires - Puerto',
          toneladas: '29 tn',
          estado: 'completado',
          observaciones: 'Entregado',
        },
      ],
    },
    template: `
      <app-table [columns]="columns" [rows]="rows">
        <ng-template appTableCell="estado" let-row>
          @switch (row.estado) {
            @case ('en-viaje') { <app-badge variant="info">En viaje</app-badge> }
            @case ('pendiente') { <app-badge variant="warning">Pendiente</app-badge> }
            @case ('retrasado') { <app-badge variant="danger">Retrasado</app-badge> }
            @case ('completado') { <app-badge variant="success">Completado</app-badge> }
          }
        </ng-template>
      </app-table>
    `,
  }),
};

export const Vacia: Story = {
  render: () => ({
    props: {
      columns: [
        { key: 'nombre', label: 'Nombre y Apellido' },
        { key: 'dni', label: 'DNI' },
      ],
      rows: [],
    },
    template: `<app-table [columns]="columns" [rows]="rows" />`,
  }),
};
