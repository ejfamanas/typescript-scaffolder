import { generateInlineAuthHeader, generateClientAction } from '../../src/utils/client-constructors';
import {Endpoint} from "../../src";

describe('generateInlineAuthHeader', () => {
  it('should generate basic auth header', () => {
    const result = generateInlineAuthHeader('basic', {
      username: 'testUser',
      password: 'testPass',
    });
    expect(result).toContain('Authorization');
    expect(result).toContain('Basic');
  });

  it('should generate API key header', () => {
    const result = generateInlineAuthHeader('apikey', {
      apiKeyName: 'x-api-key',
      apiKeyValue: 'secret',
    });
    expect(result).toBe('{ "x-api-key": "secret" }');
  });

  it('should return empty object for authType none', () => {
    const result = generateInlineAuthHeader('none');
    expect(result).toBe('{}');
  });

  it('should return empty object if credentials are missing', () => {
    const result = generateInlineAuthHeader('apikey');
    expect(result).toBe('{}');
  });
});

describe('generateClientAction', () => {
  it('should generate filename and functionName from GET endpoint', () => {
    const endpoint: Endpoint = {
      method: 'GET',
      path: '/users',
      objectName: 'User',
      responseSchema: 'GET_RES_users',
    };
    const result = generateClientAction(endpoint);
    expect(result.functionName).toBe('GET_ALL_User');
    expect(result.fileName).toBe('User_api');
  });

  it('should generate correct function and file name from POST endpoint', () => {
    const endpoint: Endpoint = {
      method: 'POST',
      path: '/users',
      objectName: 'User',
      responseSchema: 'GET_RES_user',
    };
    const result = generateClientAction(endpoint);
    expect(result.functionName).toBe('POST_User');
    expect(result.fileName).toBe('User_api');
  });
});