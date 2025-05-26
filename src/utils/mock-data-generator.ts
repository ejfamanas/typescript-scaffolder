import typia from 'typia';
import { faker } from '@faker-js/faker';
import { Logger } from './logger';

export function generateMockData<T extends object>(
    count: number,
    overrides?: Partial<T> | ((item: T, index: number) => Partial<T>)
): T[] {
    const funcName = 'generateMockData';
    Logger.info(funcName, 'Starting mock data generation...');
    const results: T[] = [];

    for (let i = 0; i < count; i++) {
        const base = typia.random<T>() as T;
        const autoFaked: Partial<T> = {} as Partial<T>;

        Logger.debug(funcName, `Identified the following keys: ${Object.keys(base).join(', ')}`);

        for (const key of Object.keys(base) as (keyof T)[]) {
            const value = base[key];

            switch (typeof value) {
                case 'string': {
                    Logger.debug(funcName, `String identified at key: ${String(key)}`);
                    const faked = getFakerValueForKey(String(key)) ?? faker.lorem.word();
                    autoFaked[key] = faked as T[typeof key];
                    break;
                }
                case 'number': {
                    Logger.debug(funcName, `Number identified at key: ${String(key)}`);
                    autoFaked[key] = faker.number.int({ min: 0, max: 100 }) as T[typeof key];
                    break;
                }
                case 'boolean': {
                    Logger.debug(funcName, `Boolean identified at key: ${String(key)}`);
                    autoFaked[key] = faker.datatype.boolean() as T[typeof key];
                    break;
                }
                case 'object': {
                    if (Array.isArray(value)) {
                        Logger.debug(funcName, `Array identified at key: ${String(key)}`);
                        const arrValue = value.map(item => {
                            switch (typeof item) {
                                case 'string': return faker.lorem.word();
                                case 'number': return faker.number.int();
                                case 'boolean': return faker.datatype.boolean();
                                case 'object': return item; // nested object — preserve as-is
                                // TODO: For some reason jest is still flagging this as uncovered
                                default: return item;
                            }
                        });
                        autoFaked[key] = arrValue as T[typeof key];
                    } else if (value !== null) {
                        Logger.debug(funcName, `Object identified at key: ${String(key)}`);
                        autoFaked[key] = value as T[typeof key]; // Optional: recurse here later
                    }
                    break;
                }
            }
        }

        const typedBase = base as T;
        const enhanced = {
            ...typedBase,
            ...autoFaked,
            ...(typeof overrides === 'function' ? overrides(typedBase, i) : overrides ?? {})
        } as T;

        results.push(enhanced);
    }
    return results;
}

function getFakerValueForKey(key: string): string | null {
    const funcName = 'getFakeValueForKey';
    Logger.debug(funcName, `String identified at key: ${String(key)}`);
    const lowerKey = key.toLowerCase();

    if (lowerKey.includes('email')) return faker.internet.email();
    if (lowerKey.includes('name')) return faker.person.fullName();
    if (lowerKey.includes('url')) return faker.internet.url();

    return null;
}