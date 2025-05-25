import util from 'util';
import fs from 'fs';
import path from 'path';

export enum LogLevel {
    Debug = 'debug',
    Info = 'info',
    Warn = 'warn',
    Error = 'error'
}

export enum LogTag {
    Debug = '[DEBUG]',
    Info = '[INFO]',
    Warn = '[WARN]',
    Error = '[ERROR]',
}

export class Logger {
    private static readonly prefix = '[codegen]';
    private static readonly logDir = path.resolve(process.cwd(), 'logs');
    private static readonly logFile = path.join(
        Logger.logDir,
        `${new Date().toISOString().split('T')[0]}-codegen.log`
    );

    static {
        if (!fs.existsSync(Logger.logDir)) {
            fs.mkdirSync(Logger.logDir, { recursive: true });
        }
    }

    private static append(level: string, funcTag: string, message: string) {
        const entry = `${new Date().toISOString()} ${level} ${funcTag} ${message}\n`;
        fs.appendFileSync(Logger.logFile, entry, 'utf8');
    }

    static info(funcName: string, ...args: any[]) {
        const funcTag = `[${funcName}]`
        const msg = util.format(...args);
        console.log(`${Logger.prefix} ${LogTag.Info} ${funcTag}`, msg);
        Logger.append(LogTag.Info, funcTag, msg);
    }

    static warn(funcName: string, ...args: any[]) {
        const funcTag = `[${funcName}]`
        const msg = util.format(...args);
        console.warn(`${Logger.prefix} ${LogTag.Warn} ${funcTag}`, msg);
        Logger.append(LogTag.Warn, funcTag, msg);
    }

    static error(funcName: string, ...args: any[]) {
        const funcTag = `[${funcName}]`
        const msg = util.format(...args);
        console.error(`${Logger.prefix} ${LogTag.Error} ${funcTag}`, msg);
        Logger.append(LogTag.Error, funcTag, msg);
    }

    static debug(funcName: string, ...args: any[]) {
        const funcTag = `[${funcName}]`
        if (process.env.DEBUG === 'true') {
            const msg = util.format(...args);
            console.debug(`${Logger.prefix} ${LogTag.Debug} ${funcTag}`, msg);
            Logger.append(LogTag.Debug,funcTag, msg);
        }
    }
}