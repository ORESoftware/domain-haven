/// <reference types="node" />
/// <reference types="express" />
import { RequestHandler, Response, Request } from 'express';
import { Domain } from 'domain';
import EventEmitter = require('events');
export interface HavenOptions {
    auto: boolean;
    handleGlobalErrors: boolean;
    showStackTracesInResponse: boolean;
}
export interface HavenDomain extends Domain {
    havenUuid: string;
}
export interface HavenTrappedError {
    message: string;
    domain: Domain | null;
    error: Error;
    request: Request | null;
    response: Response | null;
    pinned: true | false;
}
export interface HavenException {
    message: string;
    domain: Domain | null;
    uncaughtException: true;
    error: Error;
    request: Request | null;
    response: Response | null;
    pinned: true | false;
}
export interface HavenRejection {
    message: string;
    domain: Domain | null;
    unhandledRejection: true;
    error: Error;
    request: Request | null;
    response: Response | null;
    pinned: true | false;
    promise: Promise<any> | null;
}
export declare type HavenBlunder = HavenException | HavenTrappedError | HavenRejection;
export interface Haven {
    (opts?: Partial<HavenOptions>): RequestHandler;
    emitter?: EventEmitter;
}
export declare const haven: Haven;
export default haven;
