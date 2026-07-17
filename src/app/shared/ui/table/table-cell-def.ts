import { Directive, TemplateRef, inject, input } from '@angular/core';

/**
 * Marca un ng-template como celda custom de una columna de app-table.
 * Uso: <ng-template appTableCell="estado" let-row>...</ng-template>
 */
@Directive({
  selector: 'ng-template[appTableCell]',
})
export class TableCellDef {
  readonly appTableCell = input.required<string>();
  readonly template = inject(TemplateRef<{ $implicit: Record<string, unknown> }>);
}
