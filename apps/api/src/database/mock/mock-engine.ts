import { v4 as uuidv4 } from 'uuid';
import { MODELS, MODEL_NAMES, ModelDef, RelationDef } from './mock-schema';
import { buildSeed, MockStores } from './mock-seed';

type Row = Record<string, any>;
type Args = Record<string, any>;

const isPlainObject = (v: any) =>
  v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date);

const isDateLike = (v: any) => v instanceof Date || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v));

function toTime(v: any): number {
  return v instanceof Date ? v.getTime() : new Date(v).getTime();
}

function eq(a: any, b: any): boolean {
  if (a === undefined) a = null;
  if (b === undefined) b = null;
  if (a === null || b === null) return a === b;
  if (a instanceof Date || b instanceof Date || (isDateLike(a) && isDateLike(b))) {
    if (isDateLike(a) && isDateLike(b)) return toTime(a) === toTime(b);
    return false;
  }
  if (typeof a === 'number' || typeof b === 'number') return Number(a) === Number(b);
  if (typeof a === 'object' || typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return a === b;
}

function compare(a: any, b: any): number {
  if (a === null || a === undefined) return b === null || b === undefined ? 0 : 1;
  if (b === null || b === undefined) return -1;
  if (a instanceof Date || b instanceof Date || (isDateLike(a) && isDateLike(b))) {
    return toTime(a) - toTime(b);
  }
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

function cloneValue(v: any): any {
  if (v instanceof Date) return new Date(v.getTime());
  if (Array.isArray(v)) return v.map(cloneValue);
  if (isPlainObject(v)) {
    const out: Row = {};
    for (const k of Object.keys(v)) out[k] = cloneValue(v[k]);
    return out;
  }
  return v;
}

function cloneRow(r: Row): Row {
  return cloneValue(r);
}

function coerceValue(key: string, value: any, def: ModelDef): any {
  if (value === undefined) return undefined;
  // Prisma.Decimal (decimal.js) → number
  if (value !== null && typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value) && typeof value.toNumber === 'function' && typeof value.toFixed === 'function') {
    return Number(value);
  }
  if (typeof value === 'string' && def.dates?.includes(key)) {
    const t = Date.parse(value);
    if (!Number.isNaN(t)) return new Date(t);
  }
  return value;
}

const OP_KEYS = new Set([
  'equals', 'not', 'in', 'notIn', 'contains', 'startsWith', 'endsWith',
  'mode', 'gt', 'gte', 'lt', 'lte',
]);

function matchScalar(value: any, filter: any): boolean {
  if (filter === null) return value === null || value === undefined;
  if (!isPlainObject(filter)) return eq(value, filter);

  const keys = Object.keys(filter);
  const isOps = keys.some((k) => OP_KEYS.has(k));
  if (!isOps) return eq(value, filter);

  for (const k of keys) {
    const f = filter[k];
    switch (k) {
      case 'equals':
        if (!eq(value, f)) return false;
        break;
      case 'not':
        if (matchScalar(value, f)) return false;
        break;
      case 'in':
        if (!f.some((x: any) => eq(value, x))) return false;
        break;
      case 'notIn':
        if (f.some((x: any) => eq(value, x))) return false;
        break;
      case 'contains': {
        if (value === null || value === undefined) return false;
        const a = String(value);
        const b = String(f);
        if (filter.mode === 'insensitive') {
          if (!a.toLowerCase().includes(b.toLowerCase())) return false;
        } else if (!a.includes(b)) return false;
        break;
      }
      case 'startsWith': {
        if (value === null || value === undefined) return false;
        const a = String(value);
        const b = String(f);
        if (filter.mode === 'insensitive') {
          if (!a.toLowerCase().startsWith(b.toLowerCase())) return false;
        } else if (!a.startsWith(b)) return false;
        break;
      }
      case 'endsWith': {
        if (value === null || value === undefined) return false;
        const a = String(value);
        const b = String(f);
        if (filter.mode === 'insensitive') {
          if (!a.toLowerCase().endsWith(b.toLowerCase())) return false;
        } else if (!a.endsWith(b)) return false;
        break;
      }
      case 'mode':
        break;
      case 'gt':
        if (value === null || value === undefined || !(compare(value, f) > 0)) return false;
        break;
      case 'gte':
        if (value === null || value === undefined || !(compare(value, f) >= 0)) return false;
        break;
      case 'lt':
        if (value === null || value === undefined || !(compare(value, f) < 0)) return false;
        break;
      case 'lte':
        if (value === null || value === undefined || !(compare(value, f) <= 0)) return false;
        break;
      default:
        throw new Error(`Mock DB: operador no soportado "${k}"`);
    }
  }
  return true;
}

export class MockDb {
  private stores: MockStores;

  constructor(seed?: MockStores) {
    this.stores = seed ?? buildSeed();
  }

  // ── Lookup helpers ──────────────────────────────────────────────────────────

  private store(model: string): Row[] {
    const s = this.stores[model];
    if (!s) throw new Error(`Mock DB: modelo desconocido "${model}"`);
    return s;
  }

  private relatedRows(model: string, rel: RelationDef, row: Row): Row[] {
    void model;
    if (rel.kind === 'one') {
      const fk = row[rel.foreignKey];
      if (fk === null || fk === undefined) return [];
      const found = this.store(rel.target).find((t) => eq(t.id, fk));
      return found ? [found] : [];
    }
    // many / reverseOne: FK vive en el modelo destino
    return this.store(rel.target).filter((t) => eq(t[rel.foreignKey], row.id));
  }

  private targetModelFor(_model: string, rel: RelationDef): string {
    return rel.target;
  }

  // ── Where matching ──────────────────────────────────────────────────────────

  private matchesWhere(model: string, row: Row, where?: Args | null): boolean {
    if (!where) return true;
    const def = MODELS[model];

    for (const [key, filter] of Object.entries(where)) {
      if (filter === undefined) continue;

      if (key === 'AND') {
        const list = Array.isArray(filter) ? filter : [filter];
        if (!list.every((w) => this.matchesWhere(model, row, w))) return false;
        continue;
      }
      if (key === 'OR') {
        const list = Array.isArray(filter) ? filter : [filter];
        if (!list.some((w) => this.matchesWhere(model, row, w))) return false;
        continue;
      }
      if (key === 'NOT') {
        const list = Array.isArray(filter) ? filter : [filter];
        if (list.some((w) => this.matchesWhere(model, row, w))) return false;
        continue;
      }

      const rel = def.relations[key];
      if (rel) {
        if (filter === null) {
          if (this.relatedRows(model, rel, row).length > 0) return false;
          continue;
        }
        if (rel.kind === 'one') {
          const related = this.relatedRows(model, rel, row);
          if (isPlainObject(filter) && ('is' in filter || 'isNot' in filter)) {
            if ('is' in filter) {
              const target = filter.is;
              if (target === null) {
                if (related.length > 0) return false;
              } else if (related.length === 0 || !this.matchesWhere(this.targetModelFor(model, rel), related[0], target)) {
                return false;
              }
            }
            if ('isNot' in filter) {
              const target = filter.isNot;
              if (target === null) {
                if (related.length > 0) return false;
              } else if (related.length > 0 && this.matchesWhere(this.targetModelFor(model, rel), related[0], target)) {
                return false;
              }
            }
          } else {
            // shorthand: { status: 'ACTIVE' } → related exists and matches
            if (related.length === 0) return false;
            const targetModel = this.targetModelFor(model, rel);
            if (!this.matchesWhere(targetModel, related[0], filter as Args)) return false;
          }
          continue;
        }
        // many
        const targetModel = this.targetModelFor(model, rel);
        const related = this.relatedRows(model, rel, row);
        if (isPlainObject(filter) && ('some' in filter || 'every' in filter || 'none' in filter)) {
          if ('some' in filter) {
            if (!related.some((r) => this.matchesWhere(targetModel, r, filter.some))) return false;
          }
          if ('every' in filter) {
            if (!related.every((r) => this.matchesWhere(targetModel, r, filter.every))) return false;
          }
          if ('none' in filter) {
            if (related.some((r) => this.matchesWhere(targetModel, r, filter.none))) return false;
          }
        } else {
          if (!related.some((r) => this.matchesWhere(targetModel, r, filter as Args))) return false;
        }
        continue;
      }

      // scalar
      if (!matchScalar(row[key], filter)) return false;
    }
    return true;
  }

  // ── Ordering ────────────────────────────────────────────────────────────────

  private applyOrder(model: string, rows: Row[], orderBy?: any): Row[] {
    if (!orderBy) return rows;
    const specs: Array<{ key: string; dir: 'asc' | 'desc'; agg?: boolean }> = [];
    const list = Array.isArray(orderBy) ? orderBy : [orderBy];
    for (const item of list) {
      for (const [key, val] of Object.entries(item)) {
        if (val === 'asc' || val === 'desc') {
          specs.push({ key, dir: val });
        } else if (isPlainObject(val)) {
          // e.g. { _sum: { quantity: 'desc' } } or { _sum: { quantity: 'desc' } }
          for (const [k2, v2] of Object.entries(val as Row)) {
            specs.push({ key: `${key}.${k2}`, dir: v2 as 'asc' | 'desc', agg: true });
          }
        }
      }
    }
    if (specs.length === 0) return rows;
    return [...rows].sort((a, b) => {
      for (const spec of specs) {
        let va: any;
        let vb: any;
        if (spec.agg) {
          const [prefix, field] = spec.key.split('.');
          const bucket = prefix === '_sum' ? a._sum : prefix === '_avg' ? a._avg : a._count;
          const bucketB = prefix === '_sum' ? b._sum : prefix === '_avg' ? b._avg : b._count;
          va = bucket?.[field];
          vb = bucketB?.[field];
        } else {
          va = a[spec.key];
          vb = b[spec.key];
        }
        const c = compare(va, vb);
        if (c !== 0) return spec.dir === 'asc' ? c : -c;
      }
      return 0;
    });
  }

  // ── Projection (select / include) ───────────────────────────────────────────

  private resolveRelation(model: string, row: Row, relName: string, args?: Args): any {
    const def = MODELS[model];
    const rel = def.relations[relName];
    if (!rel) throw new Error(`Mock DB: relación desconocida ${model}.${relName}`);
    const targetModel = this.targetModelFor(model, rel);
    let related = this.relatedRows(model, rel, row);

    if (args) {
      if (args.where) related = related.filter((r) => this.matchesWhere(targetModel, r, args.where));
      if (args.orderBy) related = this.applyOrder(targetModel, related, args.orderBy);
      if (typeof args.skip === 'number') related = related.slice(args.skip);
      if (typeof args.take === 'number') related = related.slice(0, args.take);
    }

    const childArgs = args ? { select: args.select, include: args.include } : undefined;

    if (rel.kind === 'reverseOne') {
      return related.length > 0 ? this.project(targetModel, related[0], childArgs) : null;
    }
    if (rel.kind === 'one') {
      return related.length > 0 ? this.project(targetModel, related[0], childArgs) : null;
    }
    return related.map((r) => this.project(targetModel, r, childArgs));
  }

  private project(model: string, row: Row, args?: Args): Row {
    if (!args || (!args.select && !args.include)) return cloneRow(row);

    const out: Row = {};

    if (args.select) {
      for (const [key, val] of Object.entries(args.select as Args)) {
        if (!val) continue;
        if (key === '_count') continue;
        const def = MODELS[model];
        if (def.relations[key]) {
          out[key] = this.resolveRelation(model, row, key, isPlainObject(val) ? val : undefined);
        } else {
          out[key] = cloneValue(row[key]);
        }
      }
    } else {
      Object.assign(out, cloneRow(row));
    }

    if (args.include) {
      for (const [key, val] of Object.entries(args.include as Args)) {
        if (!val) continue;
        if (key === '_count') {
          const selects = (val as Args).select || {};
          const counts: Row = {};
          for (const relName of Object.keys(selects)) {
            if (!selects[relName]) continue;
            counts[relName] = this.relatedRows(model, MODELS[model].relations[relName], row).length;
          }
          out._count = counts;
          continue;
        }
        out[key] = this.resolveRelation(model, row, key, isPlainObject(val) ? val : undefined);
      }
    }
    return out;
  }

  // ── Writes ──────────────────────────────────────────────────────────────────

  private checkUnique(model: string, data: Row, excludeId?: any) {
    const def = MODELS[model];
    for (const field of def.unique ?? []) {
      const val = data[field];
      if (val === null || val === undefined) continue;
      const clash = this.store(model).find(
        (r) => eq(r[field], val) && (excludeId === undefined || !eq(r.id, excludeId)),
      );
      if (clash) {
        throw new Error(`Unique constraint failed on the fields: (\`${field}\`)`);
      }
    }
  }

  private buildRow(model: string, data: Args): Row {
    const def = MODELS[model];
    const row: Row = {};

    // static defaults first
    for (const [k, v] of Object.entries(def.defaults ?? {})) row[k] = cloneValue(v);
    // nullable fields default to null
    for (const k of def.nullable ?? []) if (!(k in data)) row[k] = null;

    for (const [k, v] of Object.entries(data)) {
      if (v === undefined) continue;
      const coerced = coerceValue(k, v, def);
      if (coerced !== undefined) row[k] = coerced;
    }

    if (!('id' in row)) row.id = uuidv4();

    const now = new Date();
    if (def.dates?.includes('createdAt') && !(row.createdAt instanceof Date) && row.createdAt === undefined) {
      row.createdAt = now;
    }
    if (row.createdAt !== undefined && !(row.createdAt instanceof Date) && def.dates?.includes('createdAt')) {
      row.createdAt = coerceValue('createdAt', row.createdAt, def);
    }
    if (def.dates?.includes('updatedAt')) row.updatedAt = now;

    return row;
  }

  private handleNestedCreate(model: string, row: Row, data: Args) {
    const def = MODELS[model];
    for (const [key, val] of Object.entries(data)) {
      const rel = def.relations[key];
      if (!rel || !isPlainObject(val)) continue;
      const targetModel = this.targetModelFor(model, rel);
      if ('create' in val) {
        if (rel.kind === 'one') {
          const child = this.create(targetModel, { data: val.create as Args });
          row[rel.foreignKey] = child.id;
        } else {
          const creates = Array.isArray(val.create) ? val.create : [val.create];
          for (const child of creates) {
            this.create(targetModel, { data: { ...child, [rel.foreignKey]: row.id } });
          }
        }
      } else if ('connect' in val && rel.kind === 'one') {
        const found = this.store(targetModel).find((r) => eq(r.id, (val.connect as Args).id));
        if (found) row[rel.foreignKey] = found.id;
      }
    }
  }

  create(model: string, args: Args): Row {
    const def = MODELS[model];
    // separate nested writes
    const scalars: Args = {};
    const nested: Args = {};
    const dataArg: Args = args.data ?? {};
    for (const [k, v] of Object.entries(dataArg)) {
      if (def.relations[k] && isPlainObject(v) && ('create' in v || 'connect' in v)) {
        nested[k] = v;
      } else {
        scalars[k] = v;
      }
    }

    const row = this.buildRow(model, scalars);
    this.checkUnique(model, row);
    this.store(model).push(row);

    if (Object.keys(nested).length > 0) this.handleNestedCreate(model, row, nested);

    return this.project(model, row, args);
  }

  update(model: string, args: Args): Row {
    const def = MODELS[model];
    const row = this.store(model).find((r) => this.matchesWhere(model, r, args.where));
    if (!row) throw new Error(`Record to update not found in "${model}"`);

    const data: Args = {};
    const dataArg: Args = args.data ?? {};
    for (const [k, v] of Object.entries(dataArg)) {
      if (isPlainObject(v) && ('increment' in v || 'decrement' in v)) {
        data[k] = (Number(row[k]) || 0) + ('increment' in v ? Number(v.increment) : -Number(v.decrement));
      } else {
        data[k] = coerceValue(k, v, def);
      }
    }

    const check = { ...row, ...data };
    this.checkUnique(model, check, row.id);

    Object.assign(row, data);
    if (def.dates?.includes('updatedAt')) row.updatedAt = new Date();

    return this.project(model, row, args);
  }

  updateMany(model: string, args: Args): { count: number } {
    const def = MODELS[model];
    const rows = this.store(model).filter((r) => this.matchesWhere(model, r, args.where));
    const dataArg: Args = args.data ?? {};
    for (const row of rows) {
      for (const [k, v] of Object.entries(dataArg)) {
        if (isPlainObject(v) && ('increment' in v || 'decrement' in v)) {
          row[k] = (Number(row[k]) || 0) + ('increment' in v ? Number(v.increment) : -Number(v.decrement));
        } else {
          row[k] = coerceValue(k, v, def);
        }
      }
      if (def.dates?.includes('updatedAt')) row.updatedAt = new Date();
    }
    return { count: rows.length };
  }

  delete(model: string, args: Args): Row {
    const rows = this.store(model);
    const idx = rows.findIndex((r) => this.matchesWhere(model, r, args.where));
    if (idx === -1) throw new Error(`Record to delete not found in "${model}"`);
    const [row] = rows.splice(idx, 1);
    return cloneRow(row);
  }

  upsert(model: string, args: Args): Row {
    const found = this.store(model).find((r) => this.matchesWhere(model, r, args.where));
    if (found) return this.update(model, { where: args.where, data: args.update, select: args.select, include: args.include });
    return this.create(model, { data: args.create, select: args.select, include: args.include });
  }

  // ── Reads ───────────────────────────────────────────────────────────────────

  findMany(model: string, args: Args = {}): Row[] {
    let rows = this.store(model).filter((r) => this.matchesWhere(model, r, args.where));
    rows = this.applyOrder(model, rows, args.orderBy);
    if (typeof args.skip === 'number') rows = rows.slice(args.skip);
    if (typeof args.take === 'number') rows = rows.slice(0, args.take);
    return rows.map((r) => this.project(model, r, args));
  }

  findFirst(model: string, args: Args = {}): Row | null {
    const rows = this.findMany(model, { ...args, skip: undefined, take: 1 });
    return rows.length > 0 ? rows[0] : null;
  }

  findUnique(model: string, args: Args): Row | null {
    return this.findFirst(model, { where: args.where, select: args.select, include: args.include });
  }

  count(model: string, args: Args = {}): number {
    return this.store(model).filter((r) => this.matchesWhere(model, r, args.where)).length;
  }

  aggregate(model: string, args: Args): Row {
    const rows = this.store(model).filter((r) => this.matchesWhere(model, r, args.where));
    const out: Row = {};

    if (args._sum) {
      out._sum = {};
      for (const field of Object.keys(args._sum)) {
        if (!(args._sum as any)[field]) continue;
        let sum = 0;
        for (const r of rows) if (r[field] !== null && r[field] !== undefined) sum += Number(r[field]);
        out._sum[field] = sum;
      }
    }
    if (args._avg) {
      out._avg = {};
      for (const field of Object.keys(args._avg)) {
        if (!(args._avg as any)[field]) continue;
        const vals = rows.filter((r) => r[field] !== null && r[field] !== undefined).map((r) => Number(r[field]));
        out._avg[field] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      }
    }
    if (args._count) {
      if (args._count === true) {
        out._count = rows.length;
      } else {
        out._count = {};
        for (const [field, val] of Object.entries(args._count as Args)) {
          if (!val) continue;
          if (field === '_all') out._count._all = rows.length;
          else out._count[field] = rows.filter((r) => r[field] !== null && r[field] !== undefined).length;
        }
      }
    }
    return out;
  }

  groupBy(model: string, args: Args): Row[] {
    const by: string[] = Array.isArray(args.by) ? args.by : [args.by];
    const rows = this.store(model).filter((r) => this.matchesWhere(model, r, args.where));

    const groups = new Map<string, Row[]>();
    for (const r of rows) {
      const key = by.map((f) => (r[f] instanceof Date ? r[f].getTime() : String(r[f]))).join('\u0000');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }

    const results: Row[] = [];
    for (const groupRows of groups.values()) {
      const out: Row = {};
      for (const f of by) out[f] = cloneValue(groupRows[0][f]);

      if (args._sum) {
        out._sum = {};
        for (const field of Object.keys(args._sum)) {
          if (!(args._sum as any)[field]) continue;
          let sum = 0;
          for (const r of groupRows) if (r[field] !== null && r[field] !== undefined) sum += Number(r[field]);
          out._sum[field] = sum;
        }
      }
      if (args._avg) {
        out._avg = {};
        for (const field of Object.keys(args._avg)) {
          if (!(args._avg as any)[field]) continue;
          const vals = groupRows.filter((r) => r[field] !== null && r[field] !== undefined).map((r) => Number(r[field]));
          out._avg[field] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        }
      }
      if (args._count) {
        if (args._count === true) {
          out._count = groupRows.length;
        } else {
          out._count = {};
          for (const [field, val] of Object.entries(args._count as Args)) {
            if (!val) continue;
            if (field === '_all') out._count._all = groupRows.length;
            else out._count[field] = groupRows.filter((r) => r[field] !== null && r[field] !== undefined).length;
          }
        }
      }
      results.push(out);
    }

    let ordered = this.applyOrder(model, results, args.orderBy);
    if (typeof args.skip === 'number') ordered = ordered.slice(args.skip);
    if (typeof args.take === 'number') ordered = ordered.slice(0, args.take);
    return ordered;
  }

  // ── Transaction / raw ───────────────────────────────────────────────────────

  async $transaction<R>(fn: (tx: any) => Promise<R>): Promise<R> {
    const snapshot: MockStores = {} as MockStores;
    for (const name of MODEL_NAMES) snapshot[name] = this.stores[name].map(cloneRow);

    try {
      return await fn(this.txProxy());
    } catch (err) {
      for (const name of MODEL_NAMES) this.stores[name] = snapshot[name];
      throw err;
    }
  }

  private txProxy(): any {
    const proxy: Row = {};
    for (const name of MODEL_NAMES) {
      proxy[name] = this.delegate(name);
    }
    proxy.$queryRaw = this.$queryRaw.bind(this);
    proxy.$transaction = this.$transaction.bind(this);
    return proxy;
  }

  async $queryRaw(_strings: TemplateStringsArray | string, ..._values: any[]): Promise<any> {
    return [{ '?column?': 1 }];
  }

  async $connect(): Promise<void> {}
  async $disconnect(): Promise<void> {}

  // ── Delegate factory (mimics Prisma model delegate) ────────────────────────

  delegate(model: string): Row {
    return {
      findMany: (args: Args = {}) => Promise.resolve(this.findMany(model, args)),
      findFirst: (args: Args = {}) => Promise.resolve(this.findFirst(model, args)),
      findUnique: (args: Args) => Promise.resolve(this.findUnique(model, args)),
      create: (args: Args) => Promise.resolve(this.create(model, args)),
      update: (args: Args) => Promise.resolve(this.update(model, args)),
      updateMany: (args: Args) => Promise.resolve(this.updateMany(model, args)),
      delete: (args: Args) => Promise.resolve(this.delete(model, args)),
      upsert: (args: Args) => Promise.resolve(this.upsert(model, args)),
      count: (args: Args = {}) => Promise.resolve(this.count(model, args)),
      aggregate: (args: Args) => Promise.resolve(this.aggregate(model, args)),
      groupBy: (args: Args) => Promise.resolve(this.groupBy(model, args)),
      findFirstOrThrow: (args: Args = {}) => {
        const row = this.findFirst(model, args);
        if (!row) return Promise.reject(new Error(`No ${model} found`));
        return Promise.resolve(row);
      },
      findUniqueOrThrow: (args: Args) => {
        const row = this.findUnique(model, args);
        if (!row) return Promise.reject(new Error(`No ${model} found`));
        return Promise.resolve(row);
      },
    };
  }
}
