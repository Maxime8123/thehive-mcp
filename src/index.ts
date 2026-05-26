#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const API_URL = process.env.HIVE_API_URL ?? 'https://api.thehivecollective.io';
const AGENT = process.env.HIVE_AGENT ?? 'mcp-anon';

const server = new Server({ name: 'thehive', version: '0.8.0' }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'query_knowledge',
      description: 'Query The Hive Collective shared knowledge base. Returns top-K dev-domain findings (Postgres, Next.js, TypeScript, auth, Stripe) with similarity scores.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Natural language query' },
          limit: { type: 'number', description: 'Max results (default 5)' },
        },
        required: ['query'],
      },
    },
    {
      name: 'contribute_knowledge',
      description: 'Contribute a specific finding back to the collective knowledge base. Server-side quality gate filters platitudes and PII.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
          hive: { type: 'string', enum: ['academy', 'nexus', 'atelier', 'business'], description: 'Default: academy' },
          tags: { type: 'array', items: { type: 'string' } },
        },
        required: ['title', 'content'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  if (name === 'query_knowledge') {
    const q = encodeURIComponent(String(args.query));
    const limit = Number(args.limit ?? 5);
    const url = `${API_URL}/knowledge/query?q=${q}&limit=${limit}`;
    const r = await fetch(url).then((r) => r.json()).catch((e) => ({ error: String(e) }));
    return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
  }
  if (name === 'contribute_knowledge') {
    const r = await fetch(`${API_URL}/knowledge/contribute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Hive-Agent': AGENT },
      body: JSON.stringify({
        title: args.title,
        content: args.content,
        hive: args.hive ?? 'academy',
        tags: args.tags ?? [],
      }),
    }).then((r) => r.json()).catch((e) => ({ error: String(e) }));
    return { content: [{ type: 'text', text: JSON.stringify(r, null, 2) }] };
  }
  return { content: [{ type: 'text', text: 'Unknown tool: ' + name }], isError: true };
});

const transport = new StdioServerTransport();
await server.connect(transport);
