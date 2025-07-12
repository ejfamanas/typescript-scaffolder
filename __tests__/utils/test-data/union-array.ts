export interface Item {
  id: number;
  name: string;
  tags: string[];
  status: "draft" | "published" | "archived";
}
