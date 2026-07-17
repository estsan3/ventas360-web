import { Component } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular-vite';

/**
 * Story de fundamentos: muestra los design tokens extraídos de Figma
 * y valida que el pipeline SCSS (@use 'tokens') funciona en Storybook.
 * Solo existe para documentación — no se usa en la app.
 */
@Component({
  selector: 'app-color-palette',
  template: `
    <section>
      <h2>Marca</h2>
      <div class="row">
        <div class="swatch primary">primary</div>
        <div class="swatch primary-dark">primary-dark</div>
        <div class="swatch primary-deep">primary-deep</div>
        <div class="swatch primary-light">primary-light</div>
        <div class="swatch primary-surface">primary-surface</div>
        <div class="swatch accent-green">accent-green</div>
      </div>
      <h2>Semánticos</h2>
      <div class="row">
        <div class="swatch success">success</div>
        <div class="swatch danger">danger</div>
        <div class="swatch danger-bg">danger-bg</div>
        <div class="swatch warning-bg">warning-bg</div>
        <div class="swatch info-bg">info-bg</div>
      </div>
      <h2>Tipografía (Inter)</h2>
      <p class="type-3xl">Título de página — 22px Bold</p>
      <p class="type-2xl">Título de sección — 20px Bold</p>
      <p class="type-lg">Label / botón — 16px Medium</p>
      <p class="type-md">Cuerpo por defecto — 14px Regular</p>
      <p class="type-sm">Texto secundario / badge — 12px Regular</p>
    </section>
  `,
  styles: [
    `
      @use 'tokens' as t;
      @use 'typography' as ty;

      section {
        font-family: ty.$font-family-base;
        color: t.$color-text;
        padding: t.$space-lg;
      }
      h2 {
        font-size: ty.$font-size-xl;
        font-weight: ty.$font-weight-semibold;
        margin: t.$space-lg 0 t.$space-sm;
      }
      .row {
        display: flex;
        flex-wrap: wrap;
        gap: t.$space-sm;
      }
      .swatch {
        width: 128px;
        height: 72px;
        border-radius: t.$radius-md;
        border: 1px solid t.$color-border;
        display: flex;
        align-items: flex-end;
        padding: t.$space-xs t.$space-sm;
        font-size: ty.$font-size-sm;
        color: #fff;
      }
      .primary {
        background: t.$color-primary;
      }
      .primary-dark {
        background: t.$color-primary-dark;
      }
      .primary-deep {
        background: t.$color-primary-deep;
      }
      .primary-light {
        background: t.$color-primary-light;
        color: t.$color-text;
      }
      .primary-surface {
        background: t.$color-primary-surface;
        color: t.$color-text;
      }
      .accent-green {
        background: t.$color-accent-green;
        color: t.$color-text;
      }
      .success {
        background: t.$color-success;
      }
      .danger {
        background: t.$color-danger;
      }
      .danger-bg {
        background: t.$color-danger-bg;
        color: t.$color-text;
      }
      .warning-bg {
        background: t.$color-warning-bg;
        color: t.$color-text;
      }
      .info-bg {
        background: t.$color-info-bg;
        color: t.$color-text;
      }
      .type-3xl {
        font-size: ty.$font-size-3xl;
        font-weight: ty.$font-weight-bold;
      }
      .type-2xl {
        font-size: ty.$font-size-2xl;
        font-weight: ty.$font-weight-bold;
      }
      .type-lg {
        font-size: ty.$font-size-lg;
        font-weight: ty.$font-weight-medium;
      }
      .type-md {
        font-size: ty.$font-size-md;
      }
      .type-sm {
        font-size: ty.$font-size-sm;
        color: t.$color-text-muted;
      }
    `,
  ],
})
class ColorPalette {}

const meta: Meta<ColorPalette> = {
  title: 'Fundamentos/Design Tokens',
  component: ColorPalette,
};
export default meta;

type Story = StoryObj<ColorPalette>;

export const Paleta: Story = {};
