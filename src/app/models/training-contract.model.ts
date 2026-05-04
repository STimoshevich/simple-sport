export interface TrainingContract {
  name: string;
  reps_count?: number;
  weeight?: number;
  arcived?: boolean;
  date: string;
}

export interface TrainingContractRecord extends TrainingContract {
  id: string;
}
