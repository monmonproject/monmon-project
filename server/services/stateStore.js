const store = new Map()
function set(key, value, ttlSecond, now) {
    const expiresAt = now.getTime() + ttlSecond * 1000;
    store.set(key, { value, expiresAt })
}
function get(key, now) {
    const entry = store.get(key);
    if (!entry) return null
    if (now.getTime() >= entry.expiresAt) {
        store.delete(key)
        return null
    }
    return entry.value;
}
function del(key) {
    store.delete(key)
}
module.exports = { set, get, del }
