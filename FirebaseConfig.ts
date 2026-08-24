// Mock simple implementation for UI development
const mockAuth = {
  currentUser: null,
  onAuthStateChanged: (callback: any) => {
    callback(null);
    return () => {};
  },
  signInWithEmailAndPassword: async (email: string, password: string) => {
    console.log('Mock login:', email);
    return { user: { email, uid: 'mock-' + Date.now() } };
  },
  createUserWithEmailAndPassword: async (email: string, password: string) => {
    console.log('Mock register:', email);
    return { user: { email, uid: 'mock-' + Date.now() } };
  },
  signOut: async () => {
    console.log('Mock logout');
    return Promise.resolve();
  }
};

export const auth = mockAuth;
export const onAuthStateChanged = (callback: any) => mockAuth.onAuthStateChanged(callback);
export const signInWithEmailAndPassword = (email: string, password: string) => mockAuth.signInWithEmailAndPassword(email, password);
export const createUserWithEmailAndPassword = (email: string, password: string) => mockAuth.createUserWithEmailAndPassword(email, password);
export const signOut = () => mockAuth.signOut();
