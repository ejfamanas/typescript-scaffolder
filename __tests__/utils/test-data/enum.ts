

export enum Status {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  BANNED = "BANNED"
}

export interface UserWithStatus {
  id: number;
  name: string;
  status: Status;
}