export enum Role {
  ADMIN = 'admin',
  GURU_PIKET = 'guru_piket',
}

export interface User {
  id: string;
  username: string;
  password?: string; // Password might not be included when fetching, but required for creation
  role: Role;
}

export interface Student {
  id: string;
  name: string;
  className: string;
  gender: 'Laki-laki' | 'Perempuan';
}

export interface ViolationType {
  id: string;
  name: string;
}

export interface Violation {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  violationTypeIds: string[];
  notes?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export interface SignatureNames {
  guruPiket: string;
  kepalaSekolah: string;
}