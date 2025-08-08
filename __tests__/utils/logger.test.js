"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const logger_1 = require("../../src/utils/logger");
jest.mock('fs');
const mockedFs = fs_1.default;
describe('Logger', () => {
    const testMessage = 'Hello log';
    const testFunc = 'testFunction';
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.DEBUG = 'true';
    });
    it('logs info', () => {
        logger_1.Logger.info(testFunc, testMessage);
        // console.log check removed
        expect(mockedFs.appendFileSync).toHaveBeenCalled();
    });
    it('logs warn', () => {
        logger_1.Logger.warn(testFunc, testMessage);
        // console.warn check removed
        expect(mockedFs.appendFileSync).toHaveBeenCalled();
    });
    it('logs error and throws', () => {
        expect(() => {
            logger_1.Logger.error(testFunc, testMessage);
        }).toThrow();
        expect(mockedFs.appendFileSync).toHaveBeenCalled();
    });
    it('logs debug when DEBUG=true', () => {
        logger_1.Logger.debug(testFunc, testMessage);
        // console.debug check removed
        expect(mockedFs.appendFileSync).toHaveBeenCalled();
    });
    it('does not log debug when DEBUG is false', () => {
        process.env.DEBUG = 'false';
        logger_1.Logger.debug(testFunc, testMessage);
        expect(mockedFs.appendFileSync).not.toHaveBeenCalled();
    });
});
describe('Logger failure scenarios', () => {
    const testMessage = 'Hello log';
    const testFunc = 'testFunction';
    it('throwss file write failure in info()', () => {
        mockedFs.appendFileSync.mockImplementation(() => {
            throw new Error('Disk full');
        });
        expect(() => {
            logger_1.Logger.info(testFunc, testMessage);
        }).toThrow();
    });
    it('throws when handling file write failure in error()', () => {
        mockedFs.appendFileSync.mockImplementation(() => {
            throw new Error('Permission denied');
        });
        expect(() => {
            logger_1.Logger.error(testFunc, testMessage);
        }).toThrow();
    });
    it('throws if file logging fails in debug() with DEBUG=true', () => {
        process.env.DEBUG = 'true';
        mockedFs.appendFileSync.mockImplementation(() => {
            throw new Error('Logging unavailable');
        });
        expect(() => {
            logger_1.Logger.debug(testFunc, testMessage);
        }).toThrow();
    });
});
