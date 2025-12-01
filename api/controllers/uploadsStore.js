// uploadsStore.js
// Simple in-memory store for uploaded recording file info.
// In production you will replace with Redis or database.

const sidMap = new Map();         // sid -> [files]
const resourceMap = new Map();    // resourceId -> [files]

function addFiles({ sid, resourceId, files }) {
    if (sid) sidMap.set(sid, files);
    if (resourceId) resourceMap.set(resourceId, files);
}

function getFilesBySid(sid) {
    return sidMap.get(sid) || null;
}

function getFilesByResource(resourceId) {
    return resourceMap.get(resourceId) || null;
}

function removeBySid(sid) {
    sidMap.delete(sid);
}

module.exports = {
    addFiles,
    getFilesBySid,
    getFilesByResource,
    removeBySid
};
