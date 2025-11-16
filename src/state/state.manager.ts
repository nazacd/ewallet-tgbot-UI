import { BotState, StateData } from '../types';

type StateHandler = (ctx: any, data: StateData) => Promise<void>;

class StateManager {
  private userStates = new Map<number, BotState>();
  private userData = new Map<number, StateData>();
  private handlers = new Map<BotState, StateHandler>();

  setState(userId: number, state: BotState, data: StateData = {}): void {
    this.userStates.set(userId, state);
    this.userData.set(userId, data);
  }

  getState(userId: number): BotState | undefined {
    return this.userStates.get(userId);
  }

  getData(userId: number): StateData {
    return this.userData.get(userId) || {};
  }

  updateData(userId: number, data: Partial<StateData>): void {
    const currentData = this.getData(userId);
    this.userData.set(userId, { ...currentData, ...data });
  }

  clearState(userId: number): void {
    this.userStates.delete(userId);
    this.userData.delete(userId);
  }

  register(state: BotState, handler: StateHandler): void {
    this.handlers.set(state, handler);
  }

  async handleState(userId: number, ctx: any): Promise<boolean> {
    const state = this.getState(userId);
    if (!state) return false;

    const handler = this.handlers.get(state);
    if (!handler) return false;

    const data = this.getData(userId);
    await handler(ctx, data);
    return true;
  }
}

export const stateManager = new StateManager();
