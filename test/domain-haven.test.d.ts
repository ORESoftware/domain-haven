export interface HavenData {
  timeoutAmount: number;
  throwSync?: boolean;
  timeoutThrow: boolean;
  promiseThrow: boolean;
  asyncPromiseThrow: boolean;
  asyncAwaitThrow: boolean;
  asyncAwaitTimeoutThrow: boolean;
}