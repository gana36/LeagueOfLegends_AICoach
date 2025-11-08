import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const DataCacheContext = createContext();
const API_BASE_URL = 'http://localhost:8000';

// Cache TTL: 24 hours for static data
const CACHE_TTL = 24 * 60 * 60 * 1000;

// Helper to check if cache is expired
const isCacheExpired = (timestamp) => {
  if (!timestamp) return true;
  return Date.now() - timestamp > CACHE_TTL;
};

// Load cache from localStorage
const loadFromLocalStorage = (key) => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    if (isCacheExpired(timestamp)) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return null;
  }
};

// Save cache to localStorage
const saveToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

export const DataCacheProvider = ({ children }) => {
  const [itemCache, setItemCache] = useState(() => loadFromLocalStorage('itemCache') || {});
  const [runeCache, setRuneCache] = useState(() => loadFromLocalStorage('runeCache') || {});
  const [pendingRequests, setPendingRequests] = useState({});

  // Save to localStorage when cache updates
  useEffect(() => {
    saveToLocalStorage('itemCache', itemCache);
  }, [itemCache]);

  useEffect(() => {
    saveToLocalStorage('runeCache', runeCache);
  }, [runeCache]);

  // Get item info with caching and deduplication
  const getItemInfo = useCallback(async (itemId) => {
    if (!itemId) return null;

    // Check cache first
    if (itemCache[itemId]) {
      return itemCache[itemId];
    }

    // Check if request is already pending
    const requestKey = `item-${itemId}`;
    if (pendingRequests[requestKey]) {
      return pendingRequests[requestKey];
    }

    // Make new request
    const requestPromise = fetch(`${API_BASE_URL}/api/analytics/items/${itemId}`)
      .then(res => res.json())
      .then(data => {
        setItemCache(prev => ({ ...prev, [itemId]: data }));
        setPendingRequests(prev => {
          const updated = { ...prev };
          delete updated[requestKey];
          return updated;
        });
        return data;
      })
      .catch(error => {
        console.error(`Error fetching item ${itemId}:`, error);
        setPendingRequests(prev => {
          const updated = { ...prev };
          delete updated[requestKey];
          return updated;
        });
        return { name: `Item ${itemId}`, itemId };
      });

    setPendingRequests(prev => ({ ...prev, [requestKey]: requestPromise }));
    return requestPromise;
  }, [itemCache, pendingRequests]);

  // Get rune info with caching and deduplication
  const getRuneInfo = useCallback(async (runeId) => {
    if (!runeId) return null;

    // Check cache first
    if (runeCache[runeId]) {
      return runeCache[runeId];
    }

    // Check if request is already pending
    const requestKey = `rune-${runeId}`;
    if (pendingRequests[requestKey]) {
      return pendingRequests[requestKey];
    }

    // Make new request
    const requestPromise = fetch(`${API_BASE_URL}/api/analytics/runes/${runeId}`)
      .then(res => res.json())
      .then(data => {
        setRuneCache(prev => ({ ...prev, [runeId]: data }));
        setPendingRequests(prev => {
          const updated = { ...prev };
          delete updated[requestKey];
          return updated;
        });
        return data;
      })
      .catch(error => {
        console.error(`Error fetching rune ${runeId}:`, error);
        setPendingRequests(prev => {
          const updated = { ...prev };
          delete updated[requestKey];
          return updated;
        });
        return { name: `Rune ${runeId}`, runeId };
      });

    setPendingRequests(prev => ({ ...prev, [requestKey]: requestPromise }));
    return requestPromise;
  }, [runeCache, pendingRequests]);

  // Batch fetch items
  const getItemsInfo = useCallback(async (itemIds) => {
    if (!itemIds || itemIds.length === 0) return [];

    // Split into cached and uncached
    const cached = [];
    const uncached = [];

    itemIds.forEach(id => {
      if (itemCache[id]) {
        cached.push(itemCache[id]);
      } else {
        uncached.push(id);
      }
    });

    // Fetch uncached items in parallel
    if (uncached.length > 0) {
      const results = await Promise.all(uncached.map(id => getItemInfo(id)));
      return [...cached, ...results];
    }

    return cached;
  }, [itemCache, getItemInfo]);

  // Batch fetch runes
  const getRunesInfo = useCallback(async (runeIds) => {
    if (!runeIds || runeIds.length === 0) return [];

    // Split into cached and uncached
    const cached = [];
    const uncached = [];

    runeIds.forEach(id => {
      if (runeCache[id]) {
        cached.push(runeCache[id]);
      } else {
        uncached.push(id);
      }
    });

    // Fetch uncached runes in parallel
    if (uncached.length > 0) {
      const results = await Promise.all(uncached.map(id => getRuneInfo(id)));
      return [...cached, ...results];
    }

    return cached;
  }, [runeCache, getRuneInfo]);

  const value = {
    getItemInfo,
    getRuneInfo,
    getItemsInfo,
    getRunesInfo,
    itemCache,
    runeCache
  };

  return (
    <DataCacheContext.Provider value={value}>
      {children}
    </DataCacheContext.Provider>
  );
};

export const useDataCache = () => {
  const context = useContext(DataCacheContext);
  if (!context) {
    throw new Error('useDataCache must be used within a DataCacheProvider');
  }
  return context;
};
