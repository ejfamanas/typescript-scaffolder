import fs from 'fs';
import { Logger, LogTag } from "../../src/utils/logger";

jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('Logger', () => {
    const testMessage = 'Hello log';
    const testFunc = 'testFunction';

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.DEBUG = 'true';
    });

    it('logs info', () => {
        Logger.info(testFunc, testMessage);
        // console.log check removed
        expect(mockedFs.appendFileSync).toHaveBeenCalled();
    });

    it('logs warn', () => {
        Logger.warn(testFunc, testMessage);
        // console.warn check removed
        expect(mockedFs.appendFileSync).toHaveBeenCalled();
    });

    it('logs error and throws', () => {
        expect(() => {
            Logger.error(testFunc, testMessage);
        }).toThrow();

        expect(mockedFs.appendFileSync).toHaveBeenCalled();
    });

    it('logs debug when DEBUG=true', () => {
        Logger.debug(testFunc, testMessage);
        // console.debug check removed
        expect(mockedFs.appendFileSync).toHaveBeenCalled();
    });

    it('does not log debug when DEBUG is false', () => {
        process.env.DEBUG = 'false';
        Logger.debug(testFunc, testMessage);
        expect(mockedFs.appendFileSync).not.toHaveBeenCalled();
    });
});

describe('Logger failure scenarios', () => {
    const testMessage = 'Hello log';
    const testFunc = 'testFunction';

    it('throwss file write failure in info()', () => {
        (mockedFs.appendFileSync as jest.Mock).mockImplementation(() => {
            throw new Error('Disk full');
        });

        expect(() => {
            Logger.info(testFunc, testMessage);
        }).toThrow();
    });

    it('throws when handling file write failure in error()', () => {
        (mockedFs.appendFileSync as jest.Mock).mockImplementation(() => {
            throw new Error('Permission denied');
        });

        expect(() => {
            Logger.error(testFunc, testMessage);
        }).toThrow();
    });

    it('throws if file logging fails in debug() with DEBUG=true', () => {
        process.env.DEBUG = 'true';
        (mockedFs.appendFileSync as jest.Mock).mockImplementation(() => {
            throw new Error('Logging unavailable');
        });

        expect(() => {
            Logger.debug(testFunc, testMessage);
        }).toThrow();
    });
});