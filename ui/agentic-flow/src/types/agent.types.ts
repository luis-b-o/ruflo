export enum AgentType {
  COORDINATOR = 'coordinator',
  EXECUTOR = 'executor',
  RESEARCHER = 'researcher',
  ANALYST = 'analyst',
  ARCHITECT = 'architect',
  CODER = 'coder',
  TESTER = 'tester',
  DOCUMENTER = 'documenter',
  REVIEWER = 'reviewer',
  MONITOR = 'monitor',
  OPTIMIZER = 'optimizer',
  SPECIALIST = 'specialist',
}

export interface AgentCapability {
  name: string;
  description: string;
  category: 'analysis' | 'implementation' | 'coordination' | 'quality' | 'monitoring';
}