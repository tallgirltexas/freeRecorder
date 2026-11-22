/**
 * Generates a signature for a file based on size and last modification time
 */
export const getFileSignature = (file) => {
    return `${file.size}_${file.lastModified}`;
};

/**
 * Removes characters that Windows, macOS, or Linux reject in file names.
 * Returns an empty string if nothing usable is left.
 */
export const sanitizeFileName = (name) => {
    return String(name || '')
        // eslint-disable-next-line no-control-regex
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
        .replace(/^[\s.]+/, '')      // no leading dots (hidden files) or spaces
        .replace(/[\s.]+$/, '')      // Windows rejects trailing dots and spaces
        .slice(0, 200)
        .trim();
};

/**
 * Finds an entry in a directory by name, ignoring upper/lower case.
 * Mac and Windows treat "Demo.webm" and "demo.webm" as the same file,
 * so every existence check has to work this way.
 */
export const findEntryByName = async (dirHandle, name) => {
    const target = name.toLowerCase();
    for await (const entry of dirHandle.values()) {
        if (entry.name.toLowerCase() === target) return entry;
    }
    return null;
};

/**
 * Returns a name that doesn't exist in the folder yet.
 * "demo.webm" becomes "demo (2).webm", "demo (3).webm", and so on.
 */
export const getUniqueFileName = async (dirHandle, name) => {
    if (!(await findEntryByName(dirHandle, name))) return name;
    const dot = name.lastIndexOf('.');
    const base = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : '';
    for (let i = 2; i < 1000; i++) {
        const candidate = `${base} (${i})${ext}`;
        if (!(await findEntryByName(dirHandle, candidate))) return candidate;
    }
    return `${base}-${Date.now()}${ext}`;
};

/**
 * Copies a file to a new name, confirms the copy is complete, then removes the original.
 * Never overwrites: the caller must make sure the target name is free first.
 */
const copyThenRemove = async (dirHandle, fileHandle, newName) => {
    const source = await fileHandle.getFile();
    const newHandle = await dirHandle.getFileHandle(newName, { create: true });
    const writable = await newHandle.createWritable();
    await writable.write(source);
    await writable.close();

    const copy = await newHandle.getFile();
    if (copy.size !== source.size) {
        throw new Error('Copy did not complete. The original file was kept.');
    }
    await dirHandle.removeEntry(fileHandle.name);
    return newHandle;
};

const moveOnce = async (dirHandle, fileHandle, newName) => {
    if (typeof fileHandle.move === 'function') {
        try {
            await fileHandle.move(newName);
            return fileHandle;
        } catch (err) {
            console.warn('Native move() failed, using copy fallback:', err);
        }
    }
    return copyThenRemove(dirHandle, fileHandle, newName);
};

/**
 * Renames a file without ever overwriting another file or deleting the original by mistake.
 * Throws an error with code 'EXISTS' if another file already has the new name.
 */
export const safeRename = async (dirHandle, fileHandle, newName) => {
    const oldName = fileHandle.name;
    if (newName === oldName) return fileHandle;

    const caseOnlyChange = newName.toLowerCase() === oldName.toLowerCase();

    if (!caseOnlyChange) {
        const existing = await findEntryByName(dirHandle, newName);
        if (existing) {
            const err = new Error(`A file named "${existing.name}" already exists.`);
            err.code = 'EXISTS';
            throw err;
        }
        return moveOnce(dirHandle, fileHandle, newName);
    }

    // Case-only change ("demo" -> "Demo"). On Mac and Windows the old and new
    // names point at the same file, so go through a temporary name in two steps.
    const tempName = await getUniqueFileName(dirHandle, `.rename-${Date.now()}-${oldName}`);
    const tempHandle = await moveOnce(dirHandle, fileHandle, tempName);
    return moveOnce(dirHandle, tempHandle, newName);
};

/**
 * Starts a browser download for a blob. The temporary link is released
 * a minute later so the browser has time to start the download.
 */
export const downloadBlob = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sanitizeFileName(fileName) || 'recording.webm';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
};
