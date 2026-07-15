import { DatabaseMapping, DEFAULT_MAPPING } from '../interfaces/mapping';

let customMapping: DatabaseMapping | null = null;

export function loadMapping(): DatabaseMapping {
  if (customMapping) {
    return customMapping;
  }
  return { ...DEFAULT_MAPPING };
}

export function setMapping(mapping: Partial<DatabaseMapping>): void {
  customMapping = { ...DEFAULT_MAPPING, ...mapping };
}

export function resetMapping(): void {
  customMapping = null;
}

export function getMapping(): DatabaseMapping {
  return loadMapping();
}
