import type { IDBInterface } from '../IDBInterface.js'

export async function checkStore(
  idb: IDBInterface, methodName: string, store: string,
) {
  await isDbReady(idb);
  if (!idb.db.objectStoreNames.contains(store)) {
    throw new Error(
      `${IDBError(methodName, store)}database haven't "${store}" store`
    );
  }
}

// type StoreArguments = [string, ...any[]]

// export function checkStore(
//   originalMethod: (this: IDBInterface, ...args: StoreArguments) => any,
//   context: ClassMethodDecoratorContext<IDBInterface>
// ) {
//   const methodName = String(context.name);
//   async function replacementMethod(this: IDBInterface, ...args: StoreArguments) {
//     await isDbReady(this);
//     const store = args[0];
//     if (!this.db.objectStoreNames.contains(store)) {
//       throw new Error(
//         `${IDBError(methodName, store)}database haven't "${store}" store`
//       );
//     }
//     return originalMethod.call(this, ...args);
//   }
//   return replacementMethod;
// }

async function isDbReady(idb: IDBInterface): Promise<boolean> {
  if (idb.closedDueToVersionChange) {
    throw new Error(
      '[IDB] Cannot access database due to versionchange event earlier happened'
    );
  }
  if (!idb.db) {
    await new Promise((resolve: (value: void) => void): void => {
      const isComplete = (): void => {
        idb.db ? resolve() : requestAnimationFrame(isComplete);
      }
      isComplete();
    });
  }
  return true;
}

export function IDBError(name: string, store?: string): string {
  return `[IDB] Error in db.${name}(${store || ' '}): `;
}
