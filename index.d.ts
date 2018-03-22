/// <reference types="node" />
/// <reference types="express" />
import { RequestHandler } from 'express';
import { Domain } from 'domain';
export interface HavenOptions {
    handleGlobalErrors: boolean;
    showStackTracesInResponse: boolean;
}
export interface HavenDomain extends Domain {
    havenUuid: string;
}
export declare const haven: (opts: HavenOptions) => RequestHandler;
export default haven;
