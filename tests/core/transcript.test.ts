import { describe, it, expect } from 'vitest';
import { parseTranscript, ToolCall, AgentStatus, TodoItem } from '../../src/core/transcript.js';

describe('parseTranscript', () => {
  it('parses tool calls', () => {
    const lines = [
      JSON.stringify({ type: 'tool_start', tool: 'Read', args: { file: 'a.ts' } }),
      JSON.stringify({ type: 'tool_done', tool: 'Read', args: { file: 'a.ts' } }),
      JSON.stringify({ type: 'tool_start', tool: 'Grep', args: { pattern: 'foo' } }),
    ];
    const result = parseTranscript(lines);
    expect(result.tools.length).toBe(2);
    expect(result.tools[0].name).toBe('Read');
    expect(result.tools[0].status).toBe('done');
    expect(result.tools[1].status).toBe('active');
  });

  it('parses agent status', () => {
    const lines = [
      JSON.stringify({ type: 'agent_start', agent: 'explore', model: 'haiku', description: 'Finding auth' }),
    ];
    const result = parseTranscript(lines);
    expect(result.agents.length).toBe(1);
    expect(result.agents[0].name).toBe('explore');
    expect(result.agents[0].status).toBe('running');
  });

  it('parses todos', () => {
    const lines = [
      JSON.stringify({ type: 'todo_add', id: '1', text: 'Fix bug' }),
      JSON.stringify({ type: 'todo_done', id: '1' }),
      JSON.stringify({ type: 'todo_add', id: '2', text: 'Write tests' }),
    ];
    const result = parseTranscript(lines);
    expect(result.todos.length).toBe(2);
    expect(result.todos[0].done).toBe(true);
    expect(result.todos[1].done).toBe(false);
  });
});
