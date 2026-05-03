import { Injectable } from '@angular/core';
import { TrainingContract, TrainingContractRecord } from '../models/training-contract.model';
import { TrainingNameService } from './training-name.service';

@Injectable({
  providedIn: 'root'
})
export class TrainingContractService {
  private contracts: TrainingContractRecord[] = [];

  constructor(private readonly trainingNameService: TrainingNameService) {}

  getAll(): TrainingContractRecord[] {
    return [...this.contracts];
  }

  getById(id: string): TrainingContractRecord | undefined {
    return this.contracts.find((contract) => contract.id === id);
  }

  add(contract: TrainingContract): TrainingContractRecord {
    const record: TrainingContractRecord = {
      ...contract,
      id: this.generateId()
    };

    this.trainingNameService.ensureName(record.name);
    this.contracts = [...this.contracts, record];

    return record;
  }

  update(id: string, payload: Partial<TrainingContract>): TrainingContractRecord | undefined {
    const existing = this.getById(id);
    if (!existing) {
      return undefined;
    }

    const updated: TrainingContractRecord = {
      ...existing,
      ...payload,
      id
    };

    this.trainingNameService.ensureName(updated.name);
    this.contracts = this.contracts.map((contract) => (contract.id === id ? updated : contract));

    return updated;
  }

  remove(id: string): boolean {
    const previousLength = this.contracts.length;
    this.contracts = this.contracts.filter((contract) => contract.id !== id);

    return this.contracts.length < previousLength;
  }

  private generateId(): string {
    return `training_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
