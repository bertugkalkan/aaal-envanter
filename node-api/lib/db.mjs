import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

const DATA_DIR = join(process.cwd(), 'data');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
}

export function getFilePath(filename) {
    return join(DATA_DIR, `${filename}.json`);
}

export function readDB(filename) {
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

export function writeDB(filename, data) {
    const filePath = getFilePath(filename);
    writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function generateId() {
    return randomUUID();
}

// Generic CRUD operations
export function create(filename, item) {
    const items = readDB(filename);
    const newItem = { ...item, id: generateId() };
    items.push(newItem);
    writeDB(filename, items);
    return newItem;
}

export function findAll(filename) {
    return readDB(filename);
}

export function findById(filename, id) {
    const items = readDB(filename);
    return items.find(item => item.id === id);
}

export function findOne(filename, predicate) {
    const items = readDB(filename);
    return items.find(predicate);
}

export function findMany(filename, predicate) {
    const items = readDB(filename);
    return items.filter(predicate);
}

export function update(filename, id, updates) {
    const items = readDB(filename);
    const index = items.findIndex(item => item.id === id);

    if (index === -1) return undefined;

    items[index] = { ...items[index], ...updates };
    writeDB(filename, items);
    return items[index];
}

export function remove(filename, id) {
    const items = readDB(filename);
    const index = items.findIndex(item => item.id === id);

    if (index === -1) return false;

    items.splice(index, 1);
    writeDB(filename, items);
    return true;
}
