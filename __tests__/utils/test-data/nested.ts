export interface Address {
  street: string;
  city: string;
  postalCode: string;
}

export interface User {
  id: number;
  name: string;
  address: Address;
}