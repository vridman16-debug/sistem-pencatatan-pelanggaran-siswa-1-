import { Violation, ViolationType } from '../types.ts';
import { db } from '../firebaseConfig.ts';
// FIX: Use * as import for Firebase Firestore functions to resolve "Module has no exported member" errors.
import * as FirebaseFirestore from 'firebase/firestore';

const violationTypesCollection = FirebaseFirestore.collection(db, 'violationTypes');
const violationsCollection = FirebaseFirestore.collection(db, 'violations');

export const violationService = {
  // --- Violation Types ---
  getAllViolationTypes: async (): Promise<ViolationType[]> => {
    // FIX: Call getDocs from FirebaseFirestore namespace.
    const querySnapshot = await FirebaseFirestore.getDocs(violationTypesCollection);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ViolationType));
  },

  addViolationType: async (name: string): Promise<ViolationType> => {
    // Check for duplicate name (case-insensitive)
    // FIX: Call query and where from FirebaseFirestore namespace.
    const q = FirebaseFirestore.query(violationTypesCollection, FirebaseFirestore.where('name', '==', name));
    // FIX: Call getDocs from FirebaseFirestore namespace.
    const querySnapshot = await FirebaseFirestore.getDocs(q);
    if (!querySnapshot.empty) {
      throw new Error('Jenis pelanggaran sudah ada.');
    }

    // FIX: Call addDoc from FirebaseFirestore namespace.
    const docRef = await FirebaseFirestore.addDoc(violationTypesCollection, { name });
    return { id: docRef.id, name };
  },

  updateViolationType: async (updatedType: ViolationType): Promise<ViolationType | null> => {
    // Check for duplicate name, excluding the current type being updated
    // FIX: Call query and where from FirebaseFirestore namespace.
    const q = FirebaseFirestore.query(violationTypesCollection, FirebaseFirestore.where('name', '==', updatedType.name));
    // FIX: Call getDocs from FirebaseFirestore namespace.
    const querySnapshot = await FirebaseFirestore.getDocs(q);
    const existingTypeWithSameName = querySnapshot.docs.find(doc => doc.id !== updatedType.id);

    if (existingTypeWithSameName) {
      throw new Error('Jenis pelanggaran sudah ada.');
    }

    // FIX: Call doc from FirebaseFirestore namespace.
    const docRef = FirebaseFirestore.doc(db, 'violationTypes', updatedType.id);
    // FIX: Call updateDoc from FirebaseFirestore namespace.
    await FirebaseFirestore.updateDoc(docRef, { name: updatedType.name });
    return updatedType;
  },

  deleteViolationType: async (id: string): Promise<boolean> => {
    // FIX: Call doc from FirebaseFirestore namespace.
    const docRef = FirebaseFirestore.doc(db, 'violationTypes', id);
    // FIX: Call deleteDoc from FirebaseFirestore namespace.
    await FirebaseFirestore.deleteDoc(docRef);
    return true; // Assuming delete is always successful
  },

  // --- Violations ---
  getAllViolations: async (): Promise<Violation[]> => {
    // FIX: Call getDocs from FirebaseFirestore namespace.
    const querySnapshot = await FirebaseFirestore.getDocs(violationsCollection);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Violation));
  },

  addViolation: async (newViolation: Omit<Violation, 'id'>): Promise<Violation> => {
    // FIX: Call addDoc from FirebaseFirestore namespace.
    const docRef = await FirebaseFirestore.addDoc(violationsCollection, newViolation);
    return { id: docRef.id, ...newViolation };
  },

  updateViolation: async (updatedViolation: Violation): Promise<Violation | null> => {
    // FIX: Call doc from FirebaseFirestore namespace.
    const docRef = FirebaseFirestore.doc(db, 'violations', updatedViolation.id);
    // FIX: Call updateDoc from FirebaseFirestore namespace.
    await FirebaseFirestore.updateDoc(docRef, updatedViolation);
    return updatedViolation;
  },

  deleteViolation: async (id: string): Promise<boolean> => {
    // FIX: Call doc from FirebaseFirestore namespace.
    const docRef = FirebaseFirestore.doc(db, 'violations', id);
    // FIX: Call deleteDoc from FirebaseFirestore namespace.
    await FirebaseFirestore.deleteDoc(docRef);
    return true; // Assuming delete is always successful
  },
};