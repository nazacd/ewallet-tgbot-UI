import { BotState, StateData } from '../types';
import { redisClient } from '../config/redis';

type StateHandler = (ctx: any, data: StateData) => Promise<void>;

class StateManager {
  private handlers = new Map<BotState, StateHandler>();
  private readonly STATE_PREFIX = 'state:current:';
  private readonly DATA_PREFIX = 'state:data:';
  private readonly STATE_TTL = 60 * 60 * 24; // 24 hours
  private readonly STATE_EXPIRATION = 5 * 60 * 1000; // 5 minutes in milliseconds

  async setState(userId: number, state: BotState, data: StateData = {}): Promise<void> {
    // Add timestamp to track when state was created
    const dataWithTimestamp = {
      ...data,
      createdAt: Date.now(),
    };

    await Promise.all([
      redisClient.setEx(this.STATE_PREFIX + userId, this.STATE_TTL, state),
      redisClient.setEx(this.DATA_PREFIX + userId, this.STATE_TTL, JSON.stringify(dataWithTimestamp))
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

  /**
   * Check and execute state handler
   */
  async handleState(userId: number, ctx: any): Promise<boolean> {
    const state = await this.getState(userId);
    if (!state) return false;

    // Check if state has expired
    const data = await this.getData(userId);
    if (this.isStateExpired(data)) {
      await this.clearState(userId);
      return false;
    }

    const handler = this.handlers.get(state);
    if (!handler) return false;

    await handler(ctx, data);
    return true;
  }

  /**
   * Check if state has expired (older than 5 minutes)
   */
  isStateExpired(data: StateData): boolean {
    if (!data.createdAt) return false;
    const now = Date.now();
    return (now - data.createdAt) > this.STATE_EXPIRATION;
  }

  /**
   * Get state with expiration check - useful for callbacks
   */
  async getStateWithCheck(userId: number): Promise<BotState | undefined> {
    const state = await this.getState(userId);
    if (!state) return undefined;

    const data = await this.getData(userId);
    if (this.isStateExpired(data)) {
      await this.clearState(userId);
      return undefined;
    }

    return state;
  }

  /**
   * Register a state handler
   */
  register(state: BotState, handler: StateHandler): void {
    this.handlers.set(state, handler);
  }

  /**
   * Clear all expired states (optional - can be run periodically)
   * Note: This is a simple implementation. For production with many users,
   * consider using Redis keyspace notifications or a scheduled job.
   */
  async clearExpiredStates(): Promise<void> {
    // This would require scanning all keys, which can be expensive
    // For now, we rely on TTL and individual checks
    console.log('Periodic state cleanup not yet implemented');
  }
}

export const stateManager = new StateManager();
