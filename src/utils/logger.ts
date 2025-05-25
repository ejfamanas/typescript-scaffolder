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

    private static append(level: string, message: string) {
        const entry = `${new Date().toISOString()} ${level} ${message}\n`;
        fs.appendFileSync(Logger.logFile, entry, 'utf8');
    }

    static info(funcName: string, ...args: any[]) {
        const msg = util.format(...args);
        console.log(`${Logger.prefix} ${LogTag.Info} [${funcName}]`, msg);
        Logger.append(LogTag.Info, msg);
    }

    static warn(funcName: string, ...args: any[]) {
        const msg = util.format(...args);
        console.warn(`${Logger.prefix} ${LogTag.Warn} [${funcName}]`, msg);
        Logger.append(LogTag.Warn, msg);
    }

    static error(funcName: string, ...args: any[]) {
        const msg = util.format(...args);
        console.error(`${Logger.prefix} ${LogTag.Error} [${funcName}]`, msg);
        Logger.append(LogTag.Error, msg);
    }

    static debug(funcName: string, ...args: any[]) {
        if (process.env.DEBUG === 'true') {
            const msg = util.format(...args);
            console.debug(`${Logger.prefix} ${LogTag.Debug} [${funcName}]`, msg);
            Logger.append(LogTag.Debug, msg);
        }
    }

    static logInvocation(levels: {
        start?: LogLevel;
        success?: LogLevel;
        failure?: LogLevel;
    } = {}) {
        return function (
            _target: any,
            propertyKey: string,
            descriptor: PropertyDescriptor
        ) {
            const originalMethod = descriptor.value;

            descriptor.value = function (...args: any[]) {
                const startLevel = levels.start || LogLevel.Debug;
                const successLevel = levels.success || LogLevel.Info;
                const failureLevel = levels.failure || LogLevel.Error;

                Logger[startLevel](`[${propertyKey}] called with`, ...args);

                try {
                    const result = originalMethod.apply(this, args);

                    if (result instanceof Promise) {
                        return result
                            .then(res => {
                                Logger[successLevel](`[${propertyKey}] resolved`);
                                return res;
                            })
                            .catch(err => {
                                Logger[failureLevel === LogLevel.Error ? LogLevel.Warn : failureLevel](
                                    `[${propertyKey}] rejected with`,
                                    err
                                );
                                throw err;
                            });
                    }

                    Logger[successLevel](`[${propertyKey}] completed`);
                    return result;
                } catch (err) {
                    Logger[failureLevel](`[${propertyKey}] threw`, err);
                    throw err;
                }
            };

            return descriptor;
        };
    }
}