export interface TrainingContract {
  name: string;
  reps_count?: number;
  weeight?: number;
  arcived?: boolean;
  group_id?: string;
  date: string;
}

export interface TrainingContractRecord extends TrainingContract {
  id: string;
}
