type SynapticHandler = (...args: any[]) => any;

export class SynapticRouter {
  private handlers: Record<string, SynapticHandler> = {};
  register(name: string, fn: SynapticHandler) { this.handlers[name] = fn; }
  route(name: string, msg: any) { if (this.handlers[name]) this.handlers[name](msg); }
} 