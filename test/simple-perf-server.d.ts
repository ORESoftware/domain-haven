declare global  {
    namespace Express {
        interface Request {
            havenData: HavenData;
        }
    }
}
export interface HavenData {
    timeoutAmount: number;
    throwSync?: boolean;
    timeoutThrow: boolean;
    promiseThrow: boolean;
}
