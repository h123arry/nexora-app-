// Safe LocalStorage and SessionStorage polyfill for sandboxed iframe environments
// Runs before any other code to prevent fatal SecurityError crashes at import-time

function createMemoryStorage(): Storage {
  const memoryStore: Record<string, string> = {};
  return {
    length: 0,
    clear() {
      for (const k in memoryStore) {
        delete memoryStore[k];
      }
      this.length = 0;
    },
    getItem(key: string) {
      return key in memoryStore ? memoryStore[key] : null;
    },
    setItem(key: string, value: string) {
      memoryStore[key] = String(value);
      this.length = Object.keys(memoryStore).length;
    },
    removeItem(key: string) {
      delete memoryStore[key];
      this.length = Object.keys(memoryStore).length;
    },
    key(index: number) {
      return Object.keys(memoryStore)[index] || null;
    }
  };
}

// Resilient verification of localStorage functionality
try {
  const testKey = '__nx_storage_test__';
  window.localStorage.setItem(testKey, testKey);
  window.localStorage.removeItem(testKey);
} catch (e) {
  console.warn("⚠️ LocalStorage is restricted/blocked in this environment. Instantiating in-memory polyfill.");
  try {
    Object.defineProperty(window, 'localStorage', {
      value: createMemoryStorage(),
      writable: true,
      configurable: true
    });
  } catch (err) {
    // If defineProperty is locked on window, fallback to replacing accessors where possible
    (window as any)._localStorage = createMemoryStorage();
  }
}

// Resilient verification of sessionStorage functionality
try {
  const testKey = '__nx_session_test__';
  window.sessionStorage.setItem(testKey, testKey);
  window.sessionStorage.removeItem(testKey);
} catch (e) {
  console.warn("⚠️ SessionStorage is restricted/blocked in this environment. Instantiating in-memory polyfill.");
  try {
    Object.defineProperty(window, 'sessionStorage', {
      value: createMemoryStorage(),
      writable: true,
      configurable: true
    });
  } catch (err) {
    (window as any)._sessionStorage = createMemoryStorage();
  }
}

// Setup highly robust global error handling to capture any blank screen exceptions
const showGlobalError = (error: Error | string, errorInfo?: string) => {
  console.error("🔥 Global Runtime Exception Caught:", error, errorInfo);
  let errorMsg = typeof error === 'string' ? error : error.message;
  let errorStack = typeof error === 'object' && error.stack ? error.stack : '';
  
  // Find or create fallback UI container
  let fallbackContainer = document.getElementById('global-error-fallback');
  if (!fallbackContainer) {
    fallbackContainer = document.createElement('div');
    fallbackContainer.id = 'global-error-fallback';
    fallbackContainer.style.position = 'fixed';
    fallbackContainer.style.inset = '0';
    fallbackContainer.style.zIndex = '999999';
    fallbackContainer.style.background = '#070514';
    fallbackContainer.style.color = '#ffffff';
    fallbackContainer.style.display = 'flex';
    fallbackContainer.style.flexDirection = 'column';
    fallbackContainer.style.alignItems = 'center';
    fallbackContainer.style.justifyContent = 'center';
    fallbackContainer.style.padding = '24px';
    fallbackContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    
    fallbackContainer.innerHTML = `
      <div style="width: 100%; max-width: 640px; background: rgba(30, 30, 40, 0.9); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 16px; padding: 24px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); display: flex; flex-direction: column; gap: 16px;">
        <h2 style="font-size: 20px; font-weight: 700; color: #f87171; margin: 0; display: flex; align-items: center; gap: 8px;">
          ⚠️ Nexora Boot Diagnostic Crash
        </h2>
        <p style="color: #a1a1aa; font-size: 14px; margin: 0; line-height: 1.5;">
          The application crashed during initialization or initial render. See execution diagnostic logs below:
        </p>
        <div style="background: rgba(0, 0, 0, 0.5); padding: 12px; border-radius: 8px; font-family: monospace; font-size: 12px; color: #f4f4f5; overflow-x: auto; border: 1px solid rgba(255, 255, 255, 0.05);">
          <span style="color: #f87171; font-weight: bold;">Exception:</span> ${errorMsg}
        </div>
        ${errorStack ? `
        <pre style="background: rgba(0, 0, 0, 0.7); padding: 12px; border-radius: 8px; font-family: monospace; font-size: 10px; color: #71717a; overflow: auto; max-height: 200px; border: 1px solid rgba(255, 255, 255, 0.05); margin: 0; white-space: pre-wrap; word-break: break-all;">${errorStack}</pre>
        ` : ''}
        <button id="global-reset-btn" style="padding: 10px 16px; background: #7c3aed; color: #ffffff; border: none; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; transition: background 0.2s; align-self: flex-start;">
          Clear Cache & Hard Reset Application
        </button>
      </div>
    `;
    
    document.body.appendChild(fallbackContainer);
    
    const resetBtn = fallbackContainer.querySelector('#global-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
      });
    }
  }
};

window.onerror = (message, source, lineno, colno, error) => {
  const errorObj = error || new Error(String(message));
  showGlobalError(errorObj, `Source: ${source}:${lineno}:${colno}`);
  return false;
};

window.onunhandledrejection = (event) => {
  const reason = event.reason;
  const errorObj = reason instanceof Error ? reason : new Error(String(reason));
  showGlobalError(errorObj, 'Unhandled Promise Rejection');
};
