// src/bot/state/state.manager.ts

export type State = string;
export type UserId = number;

export type StateHandler = (ctx: any) => Promise<void>;

export class StateManager {
  private userStates = new Map<UserId, State>();
  private handlers = new Map<State, StateHandler>();

  setState(userId: UserId, state: State) {
    this.userStates.set(userId, state);
  }

  getState(userId: UserId): State | undefined {
    return this.userStates.get(userId);
  }

  clearState(userId: UserId) {
    this.userStates.delete(userId);
  }

  register(state: State, handler: StateHandler) {
    this.handlers.set(state, handler);
  }

  getHandler(state: State): StateHandler | undefined {
    return this.handlers.get(state);
  }
}

export const stateManager = new StateManager();
