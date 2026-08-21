// Firebase Web SDK configuration
const firebaseConfig = {
  apiKey: "AIzaSyCEPyRBv__htO6aLh_Z_W68WoQTm-b4ILg",
  authDomain: "sportgym-support.firebaseapp.com",
  projectId: "sportgym-support",
  storageBucket: "sportgym-support.firebasestorage.app",
  messagingSenderId: "499251791435",
  appId: "1:499251791435:web:3ff316c48582d86a0a2fce"
};

// Mock functions for now - we'll implement proper Firebase integration
export const app = { config: firebaseConfig };
export const authInstance = {
  currentUser: null,
  onAuthStateChanged: (callback: any) => {
    // Mock implementation
    callback(null);
    return () => {};
  },
  signInWithEmailAndPassword: async (email: string, password: string) => {
    // Mock implementation - will be replaced with real Firebase
    console.log('Mock login:', email, password);
    return { user: { email, uid: 'mock-uid' } };
  },
  createUserWithEmailAndPassword: async (email: string, password: string) => {
    // Mock implementation - will be replaced with real Firebase
    console.log('Mock register:', email, password);
    return { user: { email, uid: 'mock-uid' } };
  },
  signOut: async () => {
    console.log('Mock logout');
    return Promise.resolve();
  }
};

export const onAuthStateChanged = (callback: any) => authInstance.onAuthStateChanged(callback);
export const signInWithEmailAndPassword = (email: string, password: string) => authInstance.signInWithEmailAndPassword(email, password);
export const createUserWithEmailAndPassword = (email: string, password: string) => authInstance.createUserWithEmailAndPassword(email, password);
export const signOut = () => authInstance.signOut();

