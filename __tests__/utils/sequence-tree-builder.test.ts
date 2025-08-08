import { Sequence } from "../../src/models/sequence-definitions";
import { buildTreeFromSequence } from "../../src/utils/sequence-tree-builder";

describe('buildGraphFromSequence', () => {
  it('converts a flat sequence into a flat graph', () => {
    const sequence: Sequence = {
      name: 'FlatTest',
      steps: [
        { id: 'fetch1', type: 'fetchList', endpoint: '/api/users', extract: { as: 'users', field: 'data' } },
        { id: 'action1', type: 'action', method: 'POST', endpoint: '/api/do-something' }
      ]
    };

    const graph = buildTreeFromSequence(sequence);
    expect(graph).toHaveLength(2);
    expect(graph[0].id).toBe('fetch1');
    expect(graph[1].id).toBe('action1');
    expect(graph[0].children).toEqual([]);
  });

  it('converts nested loops into nested graph nodes', () => {
    const sequence: Sequence = {
      name: 'NestedTest',
      steps: [
        {
          id: 'loop1',
          type: 'loop',
          over: 'users',
          itemName: 'user',
          steps: [
            {
              id: 'action-in-loop',
              type: 'action',
              method: 'POST',
              endpoint: '/api/do-something'
            }
          ]
        }
      ]
    };

    const graph = buildTreeFromSequence(sequence);
    expect(graph).toHaveLength(1);
    expect(graph[0].id).toBe('loop1');
    expect(graph[0].children).toHaveLength(1);
    expect(graph[0].children[0].id).toBe('action-in-loop');
  });
  it('handles an empty sequence', () => {
    const sequence: Sequence = { name: 'Empty', steps: [] };
    const graph = buildTreeFromSequence(sequence);
    expect(graph).toEqual([]);
  });

  it('handles loop containing both fetchList and action steps', () => {
    const sequence: Sequence = {
      name: 'LoopWithSteps',
      steps: [
        {
          id: 'loopX',
          type: 'loop',
          over: 'items',
          itemName: 'item',
          steps: [
            { id: 'fetch-inside', type: 'fetchList', endpoint: '/api/x', extract: { as: 'x', field: 'val' } },
            { id: 'act-inside', type: 'action', method: 'POST', endpoint: '/api/y' }
          ]
        }
      ]
    };
    const graph = buildTreeFromSequence(sequence);
    expect(graph).toHaveLength(1);
    expect(graph[0].id).toBe('loopX');
    expect(graph[0].children.map(n => n.id)).toEqual(['fetch-inside', 'act-inside']);
  });

  it('handles multiple levels of nested loops', () => {
    const sequence: Sequence = {
      name: 'DeepLoop',
      steps: [
        {
          id: 'outerLoop',
          type: 'loop',
          over: 'users',
          itemName: 'user',
          steps: [
            {
              id: 'innerLoop',
              type: 'loop',
              over: 'badges',
              itemName: 'badge',
              steps: [
                { id: 'award', type: 'action', method: 'POST', endpoint: '/api/award' }
              ]
            }
          ]
        }
      ]
    };
    const graph = buildTreeFromSequence(sequence);
    expect(graph).toHaveLength(1);
    expect(graph[0].id).toBe('outerLoop');
    expect(graph[0].children[0].id).toBe('innerLoop');
    expect(graph[0].children[0].children[0].id).toBe('award');
  });
});