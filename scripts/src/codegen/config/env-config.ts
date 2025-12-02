export class EnvConfig {
    static readonly DEBUG: boolean = process.env.DEBUG ?? false;
    static readonly PERSON_API_APIKEY: string = process.env.PERSON_API_APIKEY ?? 'my-new-api-key';
    static readonly USER_API_USERNAME: string = process.env.USER_API_USERNAME ?? 'my-other-username';
    static readonly USER_API_PASSWORD: string = process.env.USER_API_PASSWORD ?? 'my-other-user-password';
}

export enum EnvKeys {
    DEBUG = "DEBUG",
    PERSON_API_APIKEY = "PERSON_API_APIKEY",
    USER_API_USERNAME = "USER_API_USERNAME",
    USER_API_PASSWORD = "USER_API_PASSWORD"
}
