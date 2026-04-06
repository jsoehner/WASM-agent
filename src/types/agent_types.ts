"// Agent core types for WASM bindings

export interface AgentState {
  context: string;
  history: Message[];
  tools: ToolRegistry;
  subAgents: SubAgent[];
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
}

export interface ToolRegistry {
  search: (query: string) => Promise<SearchResult[]>;
  fetch: (url: string) => Promise<Response>;
  calculate: (expression: string) => Promise<number>;
  format: (text: string, options: FormatOptions) => string;
  filter: (data: any[], criteria: any) => any[];
  [key: string]: any;
}

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  domain: string;
}

export interface SubAgent {
  id: string;
  type: 'search' | 'analysis' | 'research' | 'custom';
  config: AgentConfig;
  state: AgentState;
  status: 'idle' | 'active' | 'completed' | 'failed';
  parent?: SubAgent;
}

export interface AgentConfig {
  name: string;
  description: string;
  capabilities: string[];
  contextWindow: number;
}

export interface FormatOptions {
  markdown?: boolean;
  json?: boolean;
  xml?: boolean;
}
"