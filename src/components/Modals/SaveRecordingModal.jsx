import React, { useState } from 'react';

const getExtension = (mimeType = '') => {
    if (mimeType.includes('mp4')) return '.mp4';
    if (mimeType.includes('matroska') || mimeType.includes('mkv')) return '.mkv';
    return '.webm';
};

const defaultName = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `recording-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

const SaveRecordingModal = ({ blob, mimeType, onSave, onDiscard, recovered = false }) => {
    const [fileName, setFileName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const extension = getExtension(mimeType);

    // Fill in a fresh default name each time a new recording arrives
    const [lastBlob, setLastBlob] = useState(null);
    if (blob && blob !== lastBlob) {
        setLastBlob(blob);
        setFileName(recovered ? `recovered-${defaultName()}` : defaultName());
        setIsSaving(false);
    }

    if (!blob) return null;

    const handleConfirm = async () => {
        if (!fileName.trim() || isSaving) return;
        setIsSaving(true); // blocks double-clicks from saving twice
        const finalName = fileName.endsWith(extension) ? fileName : fileName + extension;
        try {
            await onSave(blob, finalName);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '450px', padding: '2.5rem' }}>
                <h2 style={{ marginBottom: '1rem', fontSize: '1.75rem', fontWeight: 800 }}>{recovered ? 'Unsaved recording found' : 'Save Recording? 🎥'}</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: '1.5' }}>
                    {recovered
                        ? 'Your last recording was not saved before the page closed. Save it now, or discard it.'
                        : 'Great recording! Give it a name before we save it to your workspace.'}
                </p>

                <div className="input-group" style={{ marginBottom: '2.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        File Name
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                            type="text"
                            value={fileName}
                            onChange={(e) => setFileName(e.target.value)}
                            placeholder="my-awesome-video"
                            autoFocus
                            style={{
                                width: '100%',
                                padding: '1rem 1.25rem',
                                background: 'var(--glass)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '14px',
                                color: 'var(--text-main)',
                                fontSize: '1rem',
                                outline: 'none',
                                transition: 'all 0.2s'
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                        />
                        <span style={{
                            position: 'absolute',
                            right: '1.25rem',
                            color: 'var(--primary)',
                            fontWeight: 700,
                            pointerEvents: 'none',
                            opacity: 0.8
                        }}>
                            {extension}
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                    <button
                        className="btn btn-outline"
                        onClick={onDiscard}
                        style={{ flex: 1, padding: '1rem', justifyContent: 'center' }}
                    >
                        Discard
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleConfirm}
                        disabled={!fileName.trim() || isSaving}
                        style={{ flex: 2, padding: '1rem', justifyContent: 'center' }}
                    >
                        {isSaving ? 'Saving…' : 'Save Recording'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SaveRecordingModal;
