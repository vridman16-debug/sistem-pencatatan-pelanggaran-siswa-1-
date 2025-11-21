import { User, Role } from '../types.ts';
import { auth, db, getCurrentFirebaseUserId } from '../firebaseConfig.ts'; // Import Firebase instances
// FIX: Use * as import for Firebase Auth functions to resolve "Module has no exported member" errors.
import * as FirebaseAuth from 'firebase/auth';
// FIX: Use * as import for Firebase Firestore functions to resolve "Module has no exported member" errors.
import * as FirebaseFirestore from 'firebase/firestore';

const usersCollection = FirebaseFirestore.collection(db, 'users');

export const authService = {
  // Firebase Auth handles email/password directly
  login: async (email: string, password: string): Promise<User | null> => {
    try {
      // FIX: Call signInWithEmailAndPassword from FirebaseAuth namespace.
      const userCredential = await FirebaseAuth.signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      if (firebaseUser) {
        // Fetch user's role and details from Firestore
        // FIX: Call doc from FirebaseFirestore namespace.
        const userDocRef = FirebaseFirestore.doc(db, 'users', firebaseUser.uid);
        // FIX: Call getDoc from FirebaseFirestore namespace.
        const userDocSnap = await FirebaseFirestore.getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data() as Omit<User, 'id'>;
          return { id: firebaseUser.uid, ...userData };
        } else {
          // If user exists in Auth but not in Firestore (e.g., initial login for default users)
          // For initial admin/guru, we create the user doc here.
          // In a real app, this should be handled during user creation.
          if (email === 'admin' && password === 'adminpassword') { // Default admin
            const newUser: User = { id: firebaseUser.uid, username: 'admin', role: Role.ADMIN };
            // FIX: Call setDoc from FirebaseFirestore namespace.
            await FirebaseFirestore.setDoc(userDocRef, { username: newUser.username, role: newUser.role });
            return newUser;
          } else if (email === 'guru' && password === 'gurupassword') { // Default guru
            const newUser: User = { id: firebaseUser.uid, username: 'guru', role: Role.GURU_PIKET };
            // FIX: Call setDoc from FirebaseFirestore namespace.
            await FirebaseFirestore.setDoc(userDocRef, { username: newUser.username, role: newUser.role });
            return newUser;
          }
          throw new Error("User data not found in Firestore.");
        }
      }
      return null;
    } catch (error: any) {
      console.error("Login failed:", error.message);
      // Map Firebase specific errors to more user-friendly messages
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        throw new Error('Username atau password salah.');
      }
      throw new Error(`Terjadi kesalahan saat login: ${error.message}`);
    }
  },

  logout: async (): Promise<void> => {
    try {
      // FIX: Call signOut from FirebaseAuth namespace.
      await FirebaseAuth.signOut(auth);
    } catch (error: any) {
      console.error("Logout failed:", error.message);
      throw new Error(`Terjadi kesalahan saat logout: ${error.message}`);
    }
  },

  // This will primarily listen to Firebase Auth state changes
  // and then fetch additional user data from Firestore
  getCurrentUser: (): Promise<User | null> => {
    return new Promise((resolve, reject) => {
      // FIX: Call onAuthStateChanged from FirebaseAuth namespace.
      const unsubscribe = FirebaseAuth.onAuthStateChanged(auth, async (firebaseUser) => {
        unsubscribe(); // Unsubscribe after the first call
        if (firebaseUser) {
          try {
            // FIX: Call doc from FirebaseFirestore namespace.
            const userDocRef = FirebaseFirestore.doc(db, 'users', firebaseUser.uid);
            // FIX: Call getDoc from FirebaseFirestore namespace.
            const userDocSnap = await FirebaseFirestore.getDoc(userDocRef);

            if (userDocSnap.exists()) {
              const userData = userDocSnap.data() as Omit<User, 'id'>;
              resolve({ id: firebaseUser.uid, ...userData });
            } else {
              // This can happen if user logs in but their Firestore profile is missing
              console.warn(`User profile for ${firebaseUser.uid} not found in Firestore. Logging out.`);
              // FIX: Call signOut from FirebaseAuth namespace.
              await FirebaseAuth.signOut(auth);
              resolve(null);
            }
          } catch (error) {
            console.error("Error fetching user data from Firestore:", error);
            reject(error);
          }
        } else {
          resolve(null);
        }
      });
    });
  },

  // --- Firestore User Management (for roles, etc.) ---
  getAllUsers: async (): Promise<User[]> => {
    // FIX: Call getDocs from FirebaseFirestore namespace.
    const querySnapshot = await FirebaseFirestore.getDocs(usersCollection);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  },

  addUser: async (newUser: Omit<User, 'id'> & { password: string }): Promise<User> => {
    try {
      // First, create user in Firebase Authentication
      // FIX: Call createUserWithEmailAndPassword from FirebaseAuth namespace.
      const userCredential = await FirebaseAuth.createUserWithEmailAndPassword(auth, newUser.username, newUser.password);
      const firebaseUser = userCredential.user;

      // Then, save additional user data (like role) to Firestore
      // FIX: Call doc from FirebaseFirestore namespace.
      const userDocRef = FirebaseFirestore.doc(db, 'users', firebaseUser.uid);
      // FIX: Call setDoc from FirebaseFirestore namespace.
      await FirebaseFirestore.setDoc(userDocRef, { username: newUser.username, role: newUser.role });

      return { id: firebaseUser.uid, username: newUser.username, role: newUser.role };
    } catch (error: any) {
      console.error("Error adding user:", error.message);
      // Map Firebase Auth specific errors
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Username (email) ini sudah digunakan.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Format username (email) tidak valid.');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password terlalu lemah (minimal 6 karakter).');
      }
      throw new Error(`Gagal menambahkan pengguna: ${error.message}`);
    }
  },

  updateUser: async (updatedUser: User & { password?: string }): Promise<User | null> => {
    // FIX: Call doc from FirebaseFirestore namespace.
    const userDocRef = FirebaseFirestore.doc(db, 'users', updatedUser.id);
    // FIX: Call getDoc from FirebaseFirestore namespace.
    const userDocSnap = await FirebaseFirestore.getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const currentAuthUser = auth.currentUser;
      if (currentAuthUser && currentAuthUser.uid === updatedUser.id) {
        // If updating own user, update email in Firebase Auth
        if (currentAuthUser.email !== updatedUser.username) {
          // This requires re-authentication, which is complex for a simple update form.
          // For simplicity in this app, we'll assume username (email) changes are not done via this method
          // or that it's a display name. If real email change is needed, full re-auth flow is required.
          console.warn("Changing own username (email) in this app is not fully supported via Firestore update. Please handle Firebase Auth email update separately if needed.");
        }
      }

      // Update password in Firebase Auth if provided
      if (updatedUser.password && updatedUser.password.trim() !== '') {
        const userToUpdateAuth = auth.currentUser;
        if (userToUpdateAuth && userToUpdateAuth.uid === updatedUser.id) {
          // You must re-authenticate the user before updating their password if their last sign-in was too long ago.
          // For simplicity here, we assume user is recently authenticated.
          // In a real app, you might prompt for current password.
          // await updatePassword(userToUpdateAuth, updatedUser.password); // Needs `import { updatePassword } from 'firebase/auth';`
          console.warn("Password update for Firebase Auth user not implemented via this generic updateUser call due to re-authentication requirements.");
        } else {
          // If updating another user's password, this method won't work directly via client-side SDK.
          // It would require an Admin SDK (Node.js backend).
          console.warn("Cannot update password for another user directly from client-side with Firebase SDK.");
        }
      }

      // Update role and username in Firestore
      // FIX: Call updateDoc from FirebaseFirestore namespace.
      await FirebaseFirestore.updateDoc(userDocRef, {
        username: updatedUser.username, // Display name/username in Firestore
        role: updatedUser.role,
      });

      return { id: updatedUser.id, username: updatedUser.username, role: updatedUser.role };
    }
    throw new Error('Pengguna tidak ditemukan.');
  },

  deleteUser: async (userId: string): Promise<boolean> => {
    try {
      // Deleting a user from Firebase Auth must be done via Firebase Admin SDK on a backend server
      // or by the user themselves through their own account management.
      // We can only delete their Firestore profile from here.
      // FIX: Call doc from FirebaseFirestore namespace.
      const userDocRef = FirebaseFirestore.doc(db, 'users', userId);
      // FIX: Call deleteDoc from FirebaseFirestore namespace.
      await FirebaseFirestore.deleteDoc(userDocRef);
      console.warn("User deleted from Firestore. Note: To delete the actual Firebase Auth user, a backend with Firebase Admin SDK is required.");
      return true;
    } catch (error: any) {
      console.error("Error deleting user:", error.message);
      throw new Error(`Gagal menghapus pengguna: ${error.message}`);
    }
  },
};