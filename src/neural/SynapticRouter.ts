export class SynapticRouter {
  private handlers: Record<string, Function> = {};
  register(name: string, fn: Function) { this.handlers[name] = fn; }
  route(name: string, msg: any) { if (this.handlers[name]) this.handlers[name](msg); }
} 