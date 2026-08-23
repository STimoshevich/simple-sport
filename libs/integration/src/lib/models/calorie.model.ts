export interface CalorieEntry {
    name: string;
    calories: number;
    date: string;
}

export interface CalorieRecord extends CalorieEntry {
    id: string;
}
