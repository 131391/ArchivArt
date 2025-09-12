/**
 * Example client implementation for persistent login
 * This shows how to implement the persistent login system in your mobile/web app
 */

// Example API client with persistent login
class PersistentLoginClient {
    constructor(baseURL) {
        this.baseURL = baseURL;
        this.accessToken = null;
        this.refreshToken = null;
    }

    // Store tokens (implement based on your platform)
    async storeTokens(accessToken, refreshToken) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        
        // For mobile apps, use secure storage:
        // await AsyncStorage.setItem('accessToken', accessToken);
        // await AsyncStorage.setItem('refreshToken', refreshToken);
        
        // For web apps, use HTTP-only cookies (server-side) or secure storage
        console.log('Tokens stored securely');
    }

    // Retrieve tokens (implement based on your platform)
    async getTokens() {
        // For mobile apps:
        // this.accessToken = await AsyncStorage.getItem('accessToken');
        // this.refreshToken = await AsyncStorage.getItem('refreshToken');
        
        return {
            accessToken: this.accessToken,
            refreshToken: this.refreshToken
        };
    }

    // Clear tokens on logout
    async clearTokens() {
        this.accessToken = null;
        this.refreshToken = null;
        
        // For mobile apps:
        // await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
        
        console.log('Tokens cleared');
    }

    // Make authenticated API request
    async makeRequest(endpoint, options = {}) {
        const { accessToken, refreshToken } = await this.getTokens();
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (accessToken) {
            headers.Authorization = `Bearer ${accessToken}`;
        }

        if (refreshToken) {
            headers['X-Refresh-Token'] = refreshToken;
        }

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                ...options,
                headers
            });

            // Check for new access token in response headers
            const newAccessToken = response.headers.get('X-New-Access-Token');
            if (newAccessToken) {
                await this.storeTokens(newAccessToken, refreshToken);
                console.log('Access token refreshed automatically');
            }

            if (response.status === 401) {
                const errorData = await response.json();
                if (errorData.code === 'TOKEN_EXPIRED') {
                    // Try to refresh token
                    if (refreshToken) {
                        const refreshed = await this.refreshAccessToken();
                        if (refreshed) {
                            // Retry the original request
                            return this.makeRequest(endpoint, options);
                        }
                    }
                    // Refresh failed, redirect to login
                    await this.clearTokens();
                    throw new Error('Session expired. Please login again.');
                }
            }

            return response;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Refresh access token
    async refreshAccessToken() {
        const { refreshToken } = await this.getTokens();
        
        if (!refreshToken) {
            return false;
        }

        try {
            const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken })
            });

            if (response.ok) {
                const data = await response.json();
                await this.storeTokens(data.accessToken, refreshToken);
                console.log('Access token refreshed successfully');
                return true;
            } else {
                console.log('Token refresh failed');
                return false;
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            return false;
        }
    }

    // Login user
    async login(email, password) {
        try {
            const response = await fetch(`${this.baseURL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                const data = await response.json();
                await this.storeTokens(data.accessToken, data.refreshToken);
                console.log('Login successful');
                return data.user;
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    // Register user
    async register(userData) {
        try {
            const response = await fetch(`${this.baseURL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            if (response.ok) {
                const data = await response.json();
                await this.storeTokens(data.accessToken, data.refreshToken);
                console.log('Registration successful');
                return data.user;
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }

    // Google login
    async googleLogin(googleData) {
        try {
            const response = await fetch(`${this.baseURL}/api/auth/social-login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    provider: 'google',
                    ...googleData
                })
            });

            if (response.ok) {
                const data = await response.json();
                await this.storeTokens(data.accessToken, data.refreshToken);
                console.log('Google login successful');
                return data.user;
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Google login failed');
            }
        } catch (error) {
            console.error('Google login error:', error);
            throw error;
        }
    }

    // Logout user
    async logout() {
        try {
            const { refreshToken } = await this.getTokens();
            
            if (refreshToken) {
                await fetch(`${this.baseURL}/api/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ refreshToken })
                });
            }

            await this.clearTokens();
            console.log('Logout successful');
        } catch (error) {
            console.error('Logout error:', error);
            // Clear tokens even if logout request fails
            await this.clearTokens();
        }
    }

    // Get user profile
    async getProfile() {
        const response = await this.makeRequest('/api/auth/profile');
        return response.json();
    }

    // Update user profile
    async updateProfile(profileData) {
        const response = await this.makeRequest('/api/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
        return response.json();
    }

    // Check if user is logged in
    async isLoggedIn() {
        const { accessToken, refreshToken } = await this.getTokens();
        return !!(accessToken && refreshToken);
    }
}

// Usage example
async function example() {
    const client = new PersistentLoginClient('https://your-api.com');

    try {
        // Check if user is already logged in
        const isLoggedIn = await client.isLoggedIn();
        
        if (!isLoggedIn) {
            // Login user
            const user = await client.login('user@example.com', 'password123');
            console.log('Logged in as:', user.name);
        }

        // Make authenticated requests
        const profile = await client.getProfile();
        console.log('User profile:', profile);

        // Update profile
        await client.updateProfile({
            name: 'Updated Name',
            mobile: '+1234567890'
        });

        // User stays logged in for 30 days
        // Access tokens refresh automatically every 15 minutes
        // No need to login again until manual logout or app uninstall

    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Export for use in your app
module.exports = PersistentLoginClient;

// Example usage in React Native
/*
import PersistentLoginClient from './PersistentLoginClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

class MobilePersistentLoginClient extends PersistentLoginClient {
    async storeTokens(accessToken, refreshToken) {
        await AsyncStorage.setItem('accessToken', accessToken);
        await AsyncStorage.setItem('refreshToken', refreshToken);
    }

    async getTokens() {
        const accessToken = await AsyncStorage.getItem('accessToken');
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        return { accessToken, refreshToken };
    }

    async clearTokens() {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
    }
}

const client = new MobilePersistentLoginClient('https://your-api.com');
*/
