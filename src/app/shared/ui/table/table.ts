import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  contentChildren,
  input,
} from '@angular/core';
import { TableCellDef } from './table-cell-def';

export interface TableColumn {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

/**
 * Tabla genérica del kit Ventas360 (Figma: Componentes → Table elements).
 * Header solid (verde de marca) o soft (verde pálido, como la tabla de
 * gestión operativa); celdas custom por columna vía appTableCell.
 * Responsive: scrollea horizontal dentro de su contenedor en tablet.
 */
@Component({
  selector: 'app-table',
  imports: [NgTemplateOutlet],
  templateUrl: './table.html',
  styleUrl: './table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Table {
  readonly columns = input.required<TableColumn[]>();
  readonly rows = input.required<Record<string, unknown>[]>();
  readonly headerVariant = input<'solid' | 'soft'>('solid');
  /** fixed: anchos deterministas — tablas repetidas quedan alineadas entre sí */
  readonly layout = input<'auto' | 'fixed'>('auto');
  readonly minWidth = input('');
  readonly striped = input(false);
  readonly compact = input(false);
  readonly dense = input(false);
  /** Clase de estado por fila: 'row--danger' | 'row--warning' | 'row--success' | '' */
  readonly rowClass = input<(row: Record<string, unknown>) => string>(() => '');

  private readonly cellDefs = contentChildren(TableCellDef);

  protected templateFor(key: string): TemplateRef<{ $implicit: Record<string, unknown> }> | null {
    return this.cellDefs().find((def) => def.appTableCell() === key)?.template ?? null;
  }
}
