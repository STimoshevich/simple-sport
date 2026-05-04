import { Injectable } from '@angular/core';
import { TrainingContract, TrainingContractRecord } from '../models/training-contract.model';
import { TrainingNameService } from './training-name.service';

export interface TrainingDayRecord {
  date: string;
  trainings: TrainingContractRecord[];
}

@Injectable({ providedIn: 'root' })
export class TrainingContractService {
  private contracts: TrainingContractRecord[] = [];

  constructor(private readonly trainingNameService: TrainingNameService) {
    this.seedMockData();
  }

  getAll(): TrainingContractRecord[] { return [...this.contracts]; }
  getById(id: string): TrainingContractRecord | undefined { return this.contracts.find((c) => c.id === id); }

  add(contract: TrainingContract): TrainingContractRecord {
    const record: TrainingContractRecord = { ...contract, id: this.generateId() };
    this.trainingNameService.ensureName(record.name);
    this.contracts = [...this.contracts, record];
    return record;
  }

  update(id: string, payload: Partial<TrainingContract>): TrainingContractRecord | undefined {
    const existing = this.getById(id);
    if (!existing) return undefined;
    const updated: TrainingContractRecord = { ...existing, ...payload, id };
    this.trainingNameService.ensureName(updated.name);
    this.contracts = this.contracts.map((contract) => (contract.id === id ? updated : contract));
    return updated;
  }

  remove(id: string): boolean {
    const previousLength = this.contracts.length;
    this.contracts = this.contracts.filter((contract) => contract.id !== id);
    return this.contracts.length < previousLength;
  }

  getTrainingNames(): string[] {
    return Array.from(new Set(this.contracts.map((c) => c.name.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }

  getTrainingDays(): TrainingDayRecord[] {
    const grouped = new Map<string, TrainingContractRecord[]>();
    for (const contract of this.contracts) {
      const dayKey = contract.date.slice(0, 10);
      if (!grouped.has(dayKey)) grouped.set(dayKey, []);
      grouped.get(dayKey)?.push(contract);
    }

    return Array.from(grouped.entries()).map(([date, trainings]) => ({ date, trainings })).sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  getProgressSeriesByName(name: string, days = 20): { dates: string[]; reps: number[]; weights: number[] } {
    const end = new Date();
    const range: string[] = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date(end);
      d.setDate(end.getDate() - i);
      range.push(d.toISOString().slice(0, 10));
    }

    const repsByDate = new Map<string, number>();
    const weightsByDate = new Map<string, number>();

    for (const c of this.contracts) {
      if (c.name !== name) continue;
      const day = c.date.slice(0, 10);
      repsByDate.set(day, (repsByDate.get(day) ?? 0) + (c.reps_count ?? 0));
      weightsByDate.set(day, (weightsByDate.get(day) ?? 0) + (c.weeight ?? 0));
    }

    return {
      dates: range.map((d) => d.slice(5)),
      reps: range.map((d) => repsByDate.get(d) ?? 0),
      weights: range.map((d) => weightsByDate.get(d) ?? 0)
    };
  }

  private seedMockData(): void {
    if (this.contracts.length > 0) return;
    const names = ['Push Ups', 'Squats', 'Bench Press'];
    for (let dayOffset = 0; dayOffset < 40; dayOffset += 1) {
      const date = new Date();
      date.setDate(date.getDate() - dayOffset);
      names.forEach((name, index) => this.add({
        name,
        reps_count: 10 + index * 5 + (dayOffset % 4),
        weeight: name === 'Bench Press' ? 40 + (dayOffset % 6) * 2 : undefined,
        date: date.toISOString()
      }));
    }
  }

  private generateId(): string { return `training_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
}
