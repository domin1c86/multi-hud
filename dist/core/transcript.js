export function parseTranscript(lines) {
    const tools = new Map();
    const agents = new Map();
    const todos = new Map();
    for (const line of lines) {
        try {
            const event = JSON.parse(line);
            switch (event.type) {
                case 'tool_start':
                    tools.set(event.tool + JSON.stringify(event.args), { name: event.tool, status: 'active', args: event.args });
                    break;
                case 'tool_done': {
                    const key = event.tool + JSON.stringify(event.args);
                    const existing = tools.get(key);
                    if (existing)
                        existing.status = 'done';
                    else
                        tools.set(key, { name: event.tool, status: 'done', args: event.args });
                    break;
                }
                case 'agent_start':
                    agents.set(event.agent, {
                        name: event.agent,
                        model: event.model,
                        description: event.description,
                        status: 'running',
                    });
                    break;
                case 'agent_done': {
                    const a = agents.get(event.agent);
                    if (a)
                        a.status = 'done';
                    break;
                }
                case 'todo_add':
                    todos.set(event.id, { id: event.id, text: event.text, done: false });
                    break;
                case 'todo_done': {
                    const t = todos.get(event.id);
                    if (t)
                        t.done = true;
                    break;
                }
            }
        }
        catch {
            // ignore invalid JSON lines
        }
    }
    return {
        tools: Array.from(tools.values()),
        agents: Array.from(agents.values()).filter((a) => a.status === 'running'),
        todos: Array.from(todos.values()),
    };
}
