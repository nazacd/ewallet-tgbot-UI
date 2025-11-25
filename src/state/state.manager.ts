import { BotState, StateData } from '../types';
import { redisClient } from '../config/redis';

type StateHandler = (ctx: any, data: StateData) => Promise<void>;

class StateManager {
  private handlers = new Map<BotState, StateHandler>();
  private readonly STATE_PREFIX = 'state:current:';
  private readonly DATA_PREFIX = 'state:data:';
  private readonly STATE_TTL = 60 * 60 * 24; // 24 hours

  async setState(userId: number, state: BotState, data: StateData = {}): Promise<void> {
    await Promise.all([
      redisClient.setEx(this.STATE_PREFIX + userId, this.STATE_TTL, state),
      redisClient.setEx(this.DATA_PREFIX + userId, this.STATE_TTL, JSON.stringify(data))
    ]);
  }

  async getState(userId: number): Promise<BotState | undefined> {
    const state = await redisClient.get(this.STATE_PREFIX + userId);
    return state as BotState | undefined;
  }

  async getData(userId: number): Promise<StateData> {
    const data = await redisClient.get(this.DATA_PREFIX + userId);
    return data ? JSON.parse(data) : {};
  }

  async updateData(userId: number, data: Partial<StateData>): Promise<void> {
    const currentData = await this.getData(userId);
    const newData = { ...currentData, ...data };
    await redisClient.setEx(this.DATA_PREFIX + userId, this.STATE_TTL, JSON.stringify(newData));
  }

  async clearState(userId: number): Promise<void> {
    await Promise.all([
      redisClient.del(this.STATE_PREFIX + userId),
      redisClient.del(this.DATA_PREFIX + userId)
    ]);
  }

  register(state: BotState, handler: StateHandler): void {
    this.handlers.set(state, handler);
  }

  async handleState(userId: number, ctx: any): Promise<boolean> {
    const state = await this.getState(userId);
    if (!state) return false;

    const handler = this.handlers.get(state);
    if (!handler) return false;

    const data = await this.getData(userId);
    await handler(ctx, data);
    return true;
  }
}

export const stateManager = new StateManager();
