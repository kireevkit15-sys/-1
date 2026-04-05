import { Difficulty } from '../battle/types';
import { StatName } from '../stats/types';

export enum Branch {
  STRATEGY = 'STRATEGY',
  LOGIC = 'LOGIC',
}

export interface QuestionData {
  id: string;
  category: string;
  branch: Branch;
  difficulty: Difficulty;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  statPrimary: StatName;
  statSecondary?: StatName;
}
