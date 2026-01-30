import EventEmitter from 'events';
import { v4 as uuidv4 } from 'uuid';

const jobs = new Map();

export function createJob() {
  const id = uuidv4();
  const emitter = new EventEmitter();
  jobs.set(id, { emitter, status: 'running', createdAt: Date.now() });
  // avoid memory leak if no one listens
  emitter.setMaxListeners(100);
  return { id, emitter };
}

export function getJob(id) {
  return jobs.get(id) || null;
}

export function finishJob(id, result) {
  const j = jobs.get(id);
  if (!j) return;
  j.emitter.emit('done', result);
  j.status = 'done';
  // remove after a short timeout to allow clients to fetch final result
  setTimeout(() => jobs.delete(id), 10 * 60 * 1000);
}

export function emitProgress(id, payload) {
  const j = jobs.get(id);
  if (!j) return;
  j.emitter.emit('progress', payload);
}
