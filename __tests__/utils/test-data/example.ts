export interface User {
    /** user identifier */
    id: number;
    name: string;
    email?: string;
    roles: ("admin" | "user")[];
}