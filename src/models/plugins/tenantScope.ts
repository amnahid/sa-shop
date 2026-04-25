import { AsyncLocalStorage } from 'async_hooks';
import mongoose from 'mongoose';

const tenantStore = new AsyncLocalStorage<string>();

export const TenantContext = {
  getTenantId: (): string | undefined => {
    return tenantStore.getStore();
  },
  setTenantId: (tenantId: string): void => {
    // Note: AsyncLocalStorage doesn't have a direct set method
    // Instead, we use run() to set the value within a callback
  },
  run: <T>(tenantId: string, callback: () => T): T => {
    return tenantStore.run(tenantId, callback);
  },
};

export const setTenantContext = (tenantId: string): void => {
  // This is a workaround - we store in a module-level variable
  // Actual tenant scoping happens via the plugin
  (global as any).__tenantId = tenantId;
};

export const clearTenantContext = (): void => {
  delete (global as any).__tenantId;
};

export const getTenantContext = (): string | undefined => {
  return (global as any).__tenantId;
};