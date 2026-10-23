import { describe, expect, it } from 'vitest';
import { loadRecentModels, MAX_RECENT_MODELS, RECENT_MODELS_KEY, saveRecentModel, type StorageLike } from './recentModels';

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

describe('loadRecentModels', () => {
  it('returns an empty list without storage or data', () => {
    expect(loadRecentModels(undefined)).toEqual([]);
    expect(loadRecentModels(memoryStorage())).toEqual([]);
  });

  it('ignores corrupt or non-array JSON', () => {
    expect(loadRecentModels(memoryStorage({ [RECENT_MODELS_KEY]: '{not json' }))).toEqual([]);
    expect(loadRecentModels(memoryStorage({ [RECENT_MODELS_KEY]: '{"a":1}' }))).toEqual([]);
  });

  it('drops non-string entries and trims to the maximum', () => {
    const list = ['a', 1, 'b', null, 'c', 'd', 'e', 'f', 'g'];
    const result = loadRecentModels(memoryStorage({ [RECENT_MODELS_KEY]: JSON.stringify(list) }));
    expect(result).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(result.length).toBe(MAX_RECENT_MODELS);
  });

  it('swallows a storage that throws', () => {
    const throwing: StorageLike = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadRecentModels(throwing)).toEqual([]);
    expect(saveRecentModel(throwing, 'x')).toEqual(['x']);
  });
});

describe('saveRecentModel', () => {
  it('prepends, dedupes and persists', () => {
    const storage = memoryStorage();
    saveRecentModel(storage, 'a');
    saveRecentModel(storage, 'b');
    const result = saveRecentModel(storage, 'a');
    expect(result).toEqual(['a', 'b']);
    expect(JSON.parse(storage.data[RECENT_MODELS_KEY])).toEqual(['a', 'b']);
  });

  it('caps the list at the maximum', () => {
    const storage = memoryStorage();
    for (const u of ['1', '2', '3', '4', '5', '6']) saveRecentModel(storage, u);
    expect(loadRecentModels(storage)).toEqual(['6', '5', '4', '3', '2']);
  });

  it('works without storage', () => {
    expect(saveRecentModel(undefined, 'a')).toEqual(['a']);
  });
});
