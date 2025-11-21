import { Student } from '../types.ts';
import { db } from '../firebaseConfig.ts';
// FIX: Use * as import for Firebase Firestore functions to resolve "Module has no exported member" errors.
import * as FirebaseFirestore from 'firebase/firestore';

const studentsCollection = FirebaseFirestore.collection(db, 'students');

export const studentService = {
  getAllStudents: async (): Promise<Student[]> => {
    // FIX: Call getDocs from FirebaseFirestore namespace.
    const querySnapshot = await FirebaseFirestore.getDocs(studentsCollection);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
  },

  getStudentById: async (id: string): Promise<Student | undefined> => {
    // FIX: Call doc from FirebaseFirestore namespace.
    const docRef = FirebaseFirestore.doc(db, 'students', id);
    // FIX: Call getDoc from FirebaseFirestore namespace.
    const docSnap = await FirebaseFirestore.getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Student;
    }
    return undefined;
  },

  addStudent: async (newStudent: Omit<Student, 'id'>): Promise<Student> => {
    // Check for duplicate student name and class (case-insensitive)
    // FIX: Call query and where from FirebaseFirestore namespace.
    const q = FirebaseFirestore.query(
      studentsCollection,
      FirebaseFirestore.where('name', '==', newStudent.name),
      FirebaseFirestore.where('className', '==', newStudent.className)
    );
    // FIX: Call getDocs from FirebaseFirestore namespace.
    const querySnapshot = await FirebaseFirestore.getDocs(q);
    if (!querySnapshot.empty) {
      throw new Error(`Siswa dengan nama "${newStudent.name}" di kelas "${newStudent.className}" sudah ada.`);
    }

    // FIX: Call addDoc from FirebaseFirestore namespace.
    const docRef = await FirebaseFirestore.addDoc(studentsCollection, newStudent);
    return { id: docRef.id, ...newStudent };
  },

  updateStudent: async (updatedStudent: Student): Promise<Student | null> => {
    // Check for duplicate name and class, excluding the current student being updated
    // FIX: Call query and where from FirebaseFirestore namespace.
    const q = FirebaseFirestore.query(
      studentsCollection,
      FirebaseFirestore.where('name', '==', updatedStudent.name),
      FirebaseFirestore.where('className', '==', updatedStudent.className)
    );
    // FIX: Call getDocs from FirebaseFirestore namespace.
    const querySnapshot = await FirebaseFirestore.getDocs(q);
    const existingStudentWithSameNameClass = querySnapshot.docs.find(doc => doc.id !== updatedStudent.id);

    if (existingStudentWithSameNameClass) {
      throw new Error(`Siswa dengan nama "${updatedStudent.name}" di kelas "${updatedStudent.className}" sudah ada.`);
    }

    // FIX: Call doc from FirebaseFirestore namespace.
    const docRef = FirebaseFirestore.doc(db, 'students', updatedStudent.id);
    // FIX: Call updateDoc from FirebaseFirestore namespace.
    await FirebaseFirestore.updateDoc(docRef, updatedStudent); // Firestore automatically merges
    return updatedStudent;
  },

  deleteStudent: async (id: string): Promise<boolean> => {
    // FIX: Call doc from FirebaseFirestore namespace.
    const docRef = FirebaseFirestore.doc(db, 'students', id);
    // FIX: Call deleteDoc from FirebaseFirestore namespace.
    await FirebaseFirestore.deleteDoc(docRef);
    return true; // Assuming delete is always successful if no error is thrown
  },

  addStudentsFromExcel: async (newStudents: Omit<Student, 'id'>[]): Promise<Student[]> => {
    const addedStudents: Student[] = [];
    // FIX: Call getDocs from FirebaseFirestore namespace.
    const existingStudentsQuery = await FirebaseFirestore.getDocs(studentsCollection);
    const existingStudents = existingStudentsQuery.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));

    for (const newStudent of newStudents) {
      const exists = existingStudents.some(
        (s) => s.name.toLowerCase() === newStudent.name.toLowerCase() && s.className.toLowerCase() === newStudent.className.toLowerCase(),
      );
      if (!exists) {
        // FIX: Call addDoc from FirebaseFirestore namespace.
        const docRef = await FirebaseFirestore.addDoc(studentsCollection, newStudent);
        addedStudents.push({ id: docRef.id, ...newStudent });
      }
    }
    return addedStudents;
  },
};