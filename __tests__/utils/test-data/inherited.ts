export interface Person {
  id: number;
  name: string;
}

export interface Employee extends Person {
  position: string;
}
