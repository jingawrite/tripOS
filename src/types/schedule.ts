export type Category =
  | "boarding_pass"
  | "accommodation"
  | "sim"
  | "custom";

export type ScheduleItem = {
  id: string;
  category: Category;
  emoji: string;
  date: string; // YYYY-MM-DD
  topText: string; // 최대 8자
  bottomText?: string; // 최대 8자
  url?: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};
