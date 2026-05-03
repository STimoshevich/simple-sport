import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TrainingNameService {
  private readonly names = new Set<string>();

  ensureName(name: string): void {
    const normalized = this.normalize(name);
    if (!normalized) {
      return;
    }

    if (!this.names.has(normalized)) {
      this.names.add(normalized);
    }
  }

  hasName(name: string): boolean {
    return this.names.has(this.normalize(name));
  }

  getAllNames(): string[] {
    return Array.from(this.names.values());
  }

  private normalize(name: string): string {
    return name.trim();
  }
}
