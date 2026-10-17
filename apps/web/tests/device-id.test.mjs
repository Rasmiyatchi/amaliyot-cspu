import assert from "node:assert/strict";
import { test } from "node:test";

const KEY = "chdpu_device_id";
let moduleId = 0;

function browser({
  local = new Map(),
  cookies = new Map(),
  readBlocked = false,
  writeBlocked = false,
  cookiesBlocked = false,
} = {}) {
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem(key) {
        if (readBlocked) throw new Error("Storage read denied");
        return local.get(key) ?? null;
      },
      setItem(key, value) {
        if (writeBlocked) throw new Error("Storage write denied");
        local.set(key, value);
      },
    },
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      get cookie() {
        return cookiesBlocked ? "" : [...cookies].map(([k, v]) => `${k}=${v}`).join("; ");
      },
      set cookie(value) {
        if (cookiesBlocked) return; // Browsers can silently ignore cookie writes.
        const [pair] = value.split(";");
        const at = pair.indexOf("=");
        cookies.set(pair.slice(0, at), pair.slice(at + 1));
      },
    },
  });
  return {
    local,
    cookies,
    restore() {
      if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
      else delete globalThis.localStorage;
      if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
      else delete globalThis.document;
    },
  };
}

function reload() {
  return import(`../src/lib/device-id.ts?test=${moduleId++}`);
}

test("first login persists the same ID across page reloads", async () => {
  const env = browser();
  try {
    const first = (await reload()).getDeviceId();
    assert.equal(env.local.get(KEY), first);
    assert.equal(env.cookies.get(KEY), first);
    assert.equal((await reload()).getDeviceId(), first);
  } finally {
    env.restore();
  }
});

test("localStorage write denied: cookie persists ID on the first login and next visit", async () => {
  const env = browser({ writeBlocked: true });
  try {
    const first = (await reload()).getDeviceId();
    assert.equal(env.cookies.get(KEY), first);
    assert.equal((await reload()).getDeviceId(), first);
  } finally {
    env.restore();
  }
});

test("localStorage read denied: cookie still persists ID across visits", async () => {
  const env = browser({ readBlocked: true, writeBlocked: true });
  try {
    const first = (await reload()).getDeviceId();
    assert.equal(env.cookies.get(KEY), first);
    assert.equal((await reload()).getDeviceId(), first);
  } finally {
    env.restore();
  }
});

test("cookie survives localStorage eviction and restores it", async () => {
  const env = browser({ cookies: new Map([[KEY, "existing-cookie-device"]]) });
  try {
    assert.equal((await reload()).getDeviceId(), "existing-cookie-device");
    assert.equal(env.local.get(KEY), "existing-cookie-device");
  } finally {
    env.restore();
  }
});

test("cookie blocked: localStorage preserves ID", async () => {
  const env = browser({ cookiesBlocked: true });
  try {
    const first = (await reload()).getDeviceId();
    assert.equal((await reload()).getDeviceId(), first);
  } finally {
    env.restore();
  }
});

test("all storage blocked: rejects instead of binding an unrecoverable ephemeral ID", async () => {
  const env = browser({ writeBlocked: true, cookiesBlocked: true });
  try {
    const module = await reload();
    assert.throws(() => module.getDeviceId(), module.DeviceStorageError);
  } finally {
    env.restore();
  }
});

test("existing local ID takes precedence when cookie differs", async () => {
  const env = browser({
    local: new Map([[KEY, "bound-device"]]),
    cookies: new Map([[KEY, "stale-cookie"]]),
  });
  try {
    assert.equal((await reload()).getDeviceId(), "bound-device");
    assert.equal(env.cookies.get(KEY), "bound-device");
  } finally {
    env.restore();
  }
});
