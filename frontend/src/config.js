// API Configuration
// Uses environment variable in production, localhost in development
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Example usage in components:
// import { API_URL } from './config';
// const response = await fetch(`${API_URL}/api/share/upload-image`, { ... });
