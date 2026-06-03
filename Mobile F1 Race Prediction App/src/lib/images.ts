// lib/images.ts

const API_BASE = 'https://isreal-falconiform-seasonedly.ngrok-free.dev';

// 🎯 ALL POSSIBLE IMAGE PATHS (in order of priority)
export const getDriverImageUrls = (driverId: string): string[] => {
  return [
    // 1. Try RELATIVE path (what PredictionResultsScreen uses)
    `/drivers/${driverId}.png`,
    
    // 2. Try FULL URL with /drivers/ (might be proxied)
    `${API_BASE}/drivers/${driverId}.png`,
    
    // 3. Try /driver-faces/ with .png
    `${API_BASE}/driver-faces/${driverId}.png`,
    
    // 4. Try /driver-faces/ with .jpg
    `${API_BASE}/driver-faces/${driverId}.jpg`,
    
    // 5. Try numbered versions
    `${API_BASE}/driver-faces/${driverId}1.jpg`,
    `${API_BASE}/driver-faces/${driverId}2.jpg`,
    `${API_BASE}/driver-faces/${driverId}3.jpg`,
    `${API_BASE}/driver-faces/${driverId}1.png`,
    `${API_BASE}/driver-faces/${driverId}2.png`,
    `${API_BASE}/driver-faces/${driverId}3.png`,
  ];
};

// 🎯 Get the best image URL
export const getDriverImage = (driverId: string): string => {
  const urls = getDriverImageUrls(driverId);
  return urls[0]; // Start with first option
};

// 🎯 Check what actually works (for debugging)
export const checkImagePaths = async (driverId: string) => {
  const urls = getDriverImageUrls(driverId);
  const results: Array<{url: string, exists: boolean}> = [];
  
  for (const url of urls) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      results.push({ url, exists: response.ok });
    } catch {
      results.push({ url, exists: false });
    }
  }
  
  return results;
};