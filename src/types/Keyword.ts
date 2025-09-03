export interface Keyword {
  _id: string;
  name: string;
  displayName?: string;
  description?: string;
  category?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
