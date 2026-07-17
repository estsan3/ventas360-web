/**
 * Estado async consistente para stores y state-wrapper.
 * Evita que cada componente invente su propio manejo de loading/error.
 */
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  status: AsyncStatus;
  data?: T;
  error?: string;
}

export const asyncIdle = <T>(): AsyncState<T> => ({ status: 'idle' });
export const asyncLoading = <T>(): AsyncState<T> => ({ status: 'loading' });
export const asyncSuccess = <T>(data: T): AsyncState<T> => ({ status: 'success', data });
export const asyncError = <T>(error: string): AsyncState<T> => ({ status: 'error', error });
