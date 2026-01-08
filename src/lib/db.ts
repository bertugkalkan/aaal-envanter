import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

const DATA_DIR = join(process.cwd(), 'data');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

export type DbFile = 'users' | 'inventory' | 'requests' | 'logs';

export function getFilePath(filename: DbFile): string {
  return join(DATA_DIR, `${filename}.json`);
}

export function readDB<T>(filename: DbFile): T[] {
  const filePath = getFilePath(filename);

  if (!existsSync(filePath)) {
    writeFileSync(filePath, JSON.stringify([], null, 2));
    return [];
  }

  try {
    const data = readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function writeDB<T>(filename: DbFile, data: T[]): void {
  const filePath = getFilePath(filename);
  writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function generateId(): string {
  return randomUUID();
}

// Generic CRUD operations
export function create<T extends { id: string }>(filename: DbFile, item: Omit<T, 'id'>): T {
  const items = readDB<T>(filename);
  const newItem = { ...item, id: generateId() } as T;
  items.push(newItem);
  writeDB(filename, items);
  return newItem;
}

export function findAll<T>(filename: DbFile): T[] {
  return readDB<T>(filename);
}

export function findById<T extends { id: string }>(filename: DbFile, id: string): T | undefined {
  const items = readDB<T>(filename);
  return items.find(item => item.id === id);
}

export function findOne<T>(filename: DbFile, predicate: (item: T) => boolean): T | undefined {
  const items = readDB<T>(filename);
  return items.find(predicate);
}

export function findMany<T>(filename: DbFile, predicate: (item: T) => boolean): T[] {
  const items = readDB<T>(filename);
  return items.filter(predicate);
}

export function update<T extends { id: string }>(
  filename: DbFile,
  id: string,
  updates: Partial<T>
): T | undefined {
  const items = readDB<T>(filename);
  const index = items.findIndex(item => item.id === id);

  if (index === -1) return undefined;

  items[index] = { ...items[index], ...updates };
  writeDB(filename, items);
  return items[index];
}

export function remove<T extends { id: string }>(filename: DbFile, id: string): boolean {
  const items = readDB<T>(filename);
  const index = items.findIndex(item => item.id === id);

  if (index === -1) return false;

  items.splice(index, 1);
  writeDB(filename, items);
  return true;
}
