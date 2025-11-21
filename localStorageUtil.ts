export const localStorageUtil = {
  load: <T,>(key: string, defaultValue: T): T => {
    try {
      const serializedState = localStorage.getItem(key);
      if (serializedState === null) {
        return defaultValue;
      }
      return JSON.parse(serializedState) as T;
    } catch (error) {
      console.error(`Error loading state from ${key}:`, error);
      return defaultValue;
    }
  },

  save: <T,>(key: string, state: T): void => {
    try {
      const serializedState = JSON.stringify(state);
      localStorage.setItem(key, serializedState);
    } catch (error) {
      console.error(`Error saving state to ${key}:`, error);
    }
  },

  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing state from ${key}:`, error);
    }
  },
};