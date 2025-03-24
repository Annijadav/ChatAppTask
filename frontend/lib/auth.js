import { 
  loginWithEmail, 
  loginWithGoogle as firebaseGoogleLogin,
  getFirebaseIdToken,
  signupWithEmail, 
  logout as firebaseLogout 
} from "./firebaseauth"
import { authenticateWithGoogle } from "./api"

export async function login(email, password) {
  try {
    const result = await loginWithEmail(email, password)
    const token = await getFirebaseIdToken()
    
    if (!token) {
      throw new Error("Failed to get authentication token")
    }
    
    // Store token first
    localStorage.setItem('jwt_token', token)
    // Wait a moment to ensure storage is complete
    await new Promise(resolve => setTimeout(resolve, 100))
    
    return { success: true, user: result.user }
  } catch (error) {
    throw new Error(error.message || "Failed to login")
  }
}

export async function signup(userData) {
  try {
    const result = await signupWithEmail(userData.email, userData.password, userData.name)
    return result
  } catch (error) {
    throw new Error(error.message || "Failed to sign up")
  }
}

export async function loginWithGoogle() {
  try {
    const firebaseResult = await firebaseGoogleLogin();
    if (!firebaseResult.success) {
      return firebaseResult;
    }

    const firebaseToken = await getFirebaseIdToken();
    if (!firebaseToken) {
      throw new Error('Failed to get Firebase token');
    }

    const backendResult = await authenticateWithGoogle(firebaseToken);
    
    if (!backendResult.token || !backendResult.user) {
      throw new Error('Invalid response from server');
    }

    // Store auth data with proper error handling
    try {
      // Store token in both cookie and localStorage
      document.cookie = `jwt_token=${backendResult.token}; path=/; max-age=2592000`; // 30 days
      localStorage.setItem('jwt_token', backendResult.token);
      localStorage.setItem('user', JSON.stringify({
        ...backendResult.user,
        id: backendResult.user._id || backendResult.user.id // Ensure ID is stored
      }));

      return { 
        success: true, 
        user: backendResult.user,
        token: backendResult.token
      };
    } catch (error) {
      console.error('Error storing auth data:', error);
      throw new Error('Failed to store authentication data');
    }
  } catch (error) {
    console.error('Google login error:', error);
    return { 
      success: false, 
      error: error.message || 'Authentication failed' 
    };
  }
}

export const logout = async () => {
  try {
    await firebaseLogout()
    // Clear storage
    localStorage.clear()
    sessionStorage.clear()
    document.cookie = 'jwt_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
    
    // No need for timeout anymore
    return { success: true }
  } catch (error) {
    console.error('Logout error:', error)
    return { success: false, error: error.message }
  }
}

export const isAuthenticated = () => {
  return !!localStorage.getItem('jwt_token');
};

