import { Role } from './types.ts';

export const LOCAL_STORAGE_KEYS = {
  // Only for user-specific preferences not managed by Firebase (like signatures).
  SIGNATURE_NAMES: 'spps_signature_names',
};

export const ROLES = {
  ADMIN: Role.ADMIN,
  GURU_PIKET: Role.GURU_PIKET,
};