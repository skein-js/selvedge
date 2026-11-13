import { randomUUID } from 'node:crypto';

import {
  bundleSchema,
  repositorySchema,
  type Review,
  type ReviewBundle,
  type ReviewCommand,
  reviewCommandSchema,
  reviewSchema,
  reviewSkillSchema,
  skillSummarySchema,
} from '@selvedge/contracts';
import Database from 'better-sqlite3';
import { z } from 'zod';

import { defaultSkill } from './review-skill';

const rowSchema = z.object({
  payload: z.string(),
  command: z.string(),
  bundle: z.string().nullable(),
  run_id: z.string().nullable(),
});
const repoRowSchema = z.object({
  id: z.uuid(),
  label: z.string(),
  path: z.string(),
  organization: z.string().nullable(),
});

export function openReviewStore(path: string) {
  const db = new Database(path);
  try {
    const version = z.number().parse(db.pragma('user_version', { simple: true }));
    if (version > 2)
      throw new Error('Application database is newer than this version of Selvedge.');
    if (version === 0)
      db.transaction(() =>
        db.exec(`
      CREATE TABLE repositories (id TEXT PRIMARY KEY, label TEXT NOT NULL, path TEXT NOT NULL UNIQUE);
      CREATE TABLE reviews (id TEXT PRIMARY KEY, payload TEXT NOT NULL, command TEXT NOT NULL, bundle TEXT, run_id TEXT);
      PRAGMA user_version = 1;
    `),
      )();
    if (version < 2)
      db.transaction(() => {
        db.exec(`
          ALTER TABLE repositories ADD COLUMN organization TEXT;
          CREATE TABLE skills (id TEXT PRIMARY KEY, path TEXT UNIQUE, name TEXT NOT NULL, digest TEXT NOT NULL, instructions TEXT NOT NULL);
          PRAGMA user_version = 2;
        `);
        db.prepare('INSERT INTO skills(id, name, digest, instructions) VALUES (?, ?, ?, ?)').run(
          defaultSkill.id,
          defaultSkill.name,
          defaultSkill.digest,
          defaultSkill.instructions,
        );
      })();
    db.pragma('journal_mode = WAL');
  } catch (error) {
    db.close();
    throw error;
  }
  function get(id: string) {
    const raw: unknown = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id);
    if (!raw) return null;
    const row = rowSchema.parse(raw);
    return {
      review: reviewSchema.parse(JSON.parse(row.payload)),
      command: reviewCommandSchema.parse(JSON.parse(row.command)),
      bundle: row.bundle ? bundleSchema.parse(JSON.parse(row.bundle)) : null,
      runId: row.run_id,
    };
  }
  function list() {
    return z
      .array(z.object({ payload: z.string() }))
      .parse(db.prepare('SELECT payload FROM reviews ORDER BY rowid DESC LIMIT 50').all())
      .map((row) => reviewSchema.parse(JSON.parse(row.payload)));
  }
  return {
    get,
    list,
    repository(id: string) {
      return repoRowSchema.parse(db.prepare('SELECT * FROM repositories WHERE id = ?').get(id));
    },
    repositories() {
      return z
        .array(repoRowSchema)
        .parse(db.prepare('SELECT * FROM repositories ORDER BY label').all())
        .map((row) =>
          repositorySchema.parse({ id: row.id, label: row.label, organization: row.organization }),
        );
    },
    addRepository(path: string, label: string, organization: string | null) {
      db.prepare(
        'INSERT INTO repositories(id, label, path, organization) VALUES (?, ?, ?, ?) ON CONFLICT(path) DO UPDATE SET organization = excluded.organization',
      ).run(randomUUID(), label, path, organization);
      const row = repoRowSchema.parse(
        db.prepare('SELECT * FROM repositories WHERE path = ?').get(path),
      );
      return repositorySchema.parse({
        id: row.id,
        label: row.label,
        organization: row.organization,
      });
    },
    skill(id: string) {
      return reviewSkillSchema.parse(
        db.prepare('SELECT id, name, digest, instructions FROM skills WHERE id = ?').get(id),
      );
    },
    skills() {
      return z
        .array(reviewSkillSchema)
        .parse(db.prepare('SELECT id, name, digest, instructions FROM skills ORDER BY name').all())
        .map((skill) =>
          skillSummarySchema.parse({ id: skill.id, name: skill.name, digest: skill.digest }),
        );
    },
    importSkill(skill: { path: string; name: string; digest: string; instructions: string }) {
      const existing = db.prepare('SELECT id FROM skills WHERE path = ?').get(skill.path);
      const count = z
        .object({ count: z.number() })
        .parse(db.prepare('SELECT COUNT(*) AS count FROM skills').get());
      if (!existing && count.count >= 16)
        throw new Error('This preview supports up to 16 review skills.');
      db.prepare(
        'INSERT INTO skills(id, path, name, digest, instructions) VALUES (?, ?, ?, ?, ?) ON CONFLICT(path) DO UPDATE SET name = excluded.name, digest = excluded.digest, instructions = excluded.instructions',
      ).run(randomUUID(), skill.path, skill.name, skill.digest, skill.instructions);
      const saved = reviewSkillSchema.parse(
        db
          .prepare('SELECT id, name, digest, instructions FROM skills WHERE path = ?')
          .get(skill.path),
      );
      return skillSummarySchema.parse({ id: saved.id, name: saved.name, digest: saved.digest });
    },
    insert(command: ReviewCommand, review: Review) {
      if (list().length >= 50)
        throw new Error(
          'This preview retains up to 50 reviews. Use a separate application-data directory for further trials.',
        );
      db.prepare('INSERT INTO reviews(id, payload, command) VALUES (?, ?, ?)').run(
        review.id,
        JSON.stringify(review),
        JSON.stringify(command),
      );
    },
    update(id: string, patch: Partial<Review>, bundle?: ReviewBundle, runId?: string) {
      return db.transaction(() => {
        const saved = get(id);
        if (!saved) throw new Error('Review not found.');
        const next = reviewSchema.parse({ ...saved.review, ...patch });
        db.prepare('UPDATE reviews SET payload = ?, bundle = ?, run_id = ? WHERE id = ?').run(
          JSON.stringify(next),
          bundle ? JSON.stringify(bundle) : saved.bundle ? JSON.stringify(saved.bundle) : null,
          runId ?? saved.runId,
          id,
        );
        return next;
      })();
    },
    close() {
      if (db.open) db.close();
    },
  };
}
