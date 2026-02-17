/**
 * MisterMD Share Module
 * Handles sharing documents via Google Drive.
 *
 * Flow (author):
 *   1. Click "Share" → request Drive OAuth token (drive.file scope)
 *   2. Google Picker opens → user selects a folder
 *   3. File uploaded to chosen folder, permissions set to public reader
 *   4. Modal shows the share URL → user copies to clipboard
 *
 * Flow (viewer):
 *   1. Opens URL with ?gdrive=<fileId>
 *   2. App fetches file from Drive API (requires google.apiKey in config)
 *   3. Markdown is loaded into editor and rendered
 *   4. "Shared document" banner is displayed
 *
 * Prerequisites:
 *   - Google OAuth Client ID (already configured in config.js)
 *   - Google API Key with Drive API enabled (add to config.js as google.apiKey)
 *     See: https://console.cloud.google.com → APIs & Services → Credentials
 */

class ShareManager {
    constructor() {
        this.accessToken = null;
        this.driveTokenClient = null;
        this.pendingMarkdown = null;
        this.pickerApiLoaded = false;
    }

    initialize() {
        this._setupEventListeners();
        this._checkSharedContent();
    }

    // ─── Event Listeners ────────────────────────────────────────────────────────

    _setupEventListeners() {
        const shareBtn = document.getElementById('share-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => this.onShareClick());
        }

        const closeBannerBtn = document.getElementById('shared-banner-close');
        if (closeBannerBtn) {
            closeBannerBtn.addEventListener('click', () => {
                document.getElementById('shared-banner').style.display = 'none';
            });
        }

        const copyLinkBtn = document.getElementById('copy-share-link');
        if (copyLinkBtn) {
            copyLinkBtn.addEventListener('click', () => {
                const url = document.getElementById('share-link-url')?.value;
                if (url) this._copyToClipboard(url, copyLinkBtn);
            });
        }

        const closeModal = document.getElementById('share-link-close');
        if (closeModal) {
            closeModal.addEventListener('click', () => this._hideModal());
        }

        const modal = document.getElementById('share-link-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this._hideModal();
            });
        }
    }

    // ─── Viewer: Load shared content from URL ────────────────────────────────────

    _checkSharedContent() {
        const params = new URLSearchParams(window.location.search);
        if (params.has('gdrive')) {
            this._fetchDriveFile(params.get('gdrive'));
        }
    }

    async _fetchDriveFile(fileId) {
        const banner = document.getElementById('shared-banner');
        if (banner) {
            banner.style.display = 'flex';
            const statusEl = banner.querySelector('.shared-status-text');
            if (statusEl) statusEl.textContent = 'Loading shared document…';
        }

        try {
            const apiKey = this._getApiKey();
            if (!apiKey) {
                throw new Error(
                    'Google API key not configured. ' +
                    'To view shared documents, add your API key to js/config.js (google.apiKey).'
                );
            }

            const res = await fetch(
                `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${encodeURIComponent(apiKey)}`
            );

            if (res.status === 403) throw new Error('Access denied. The file may not be publicly shared.');
            if (res.status === 404) throw new Error('File not found. The link may be invalid or the file was deleted.');
            if (!res.ok) throw new Error(`Could not load document (HTTP ${res.status}).`);

            const markdown = await res.text();

            if (banner) {
                const statusEl = banner.querySelector('.shared-status-text');
                if (statusEl) statusEl.textContent = 'Shared document';
            }

            const input = document.getElementById('markdown-input');
            if (input) input.value = markdown;

            // Render once the renderer is ready
            const tryRender = (attempts = 0) => {
                if (typeof window.renderMarkdown === 'function') {
                    window.renderMarkdown();
                } else if (attempts < 30) {
                    setTimeout(() => tryRender(attempts + 1), 200);
                }
            };
            setTimeout(() => tryRender(), 400);

        } catch (err) {
            if (banner) {
                const statusEl = banner.querySelector('.shared-status-text');
                if (statusEl) statusEl.textContent = 'Could not load shared document';
            }
            this._showToast(err.message, 'error', 8000);
        }
    }

    // ─── Author: Share flow ──────────────────────────────────────────────────────

    onShareClick() {
        const markdown = document.getElementById('markdown-input')?.value?.trim();
        if (!markdown) {
            this._showToast('Please enter some markdown content first.', 'warning');
            return;
        }

        const preview = document.getElementById('preview');
        const hasPlaceholder = preview?.querySelector('p[style*="italic"]');
        if (hasPlaceholder) {
            this._showToast('Please render your document before sharing.', 'warning');
            return;
        }

        if (!window.authManager?.isAuthenticated()) {
            this._showToast('Please sign in with Google to share via Drive.', 'warning');
            window.authManager?.signIn();
            return;
        }

        this.pendingMarkdown = markdown;
        this._requestDriveToken();
    }

    _requestDriveToken() {
        const waitForGoogle = (attempts = 0) => {
            if (typeof google === 'undefined' || !google.accounts?.oauth2) {
                if (attempts < 25) {
                    setTimeout(() => waitForGoogle(attempts + 1), 200);
                } else {
                    this._showToast('Google services not available. Please refresh the page.', 'error');
                }
                return;
            }

            if (!this.driveTokenClient) {
                this.driveTokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: this._getClientId(),
                    scope: 'https://www.googleapis.com/auth/drive.file',
                    callback: (tokenResponse) => {
                        if (tokenResponse.error) {
                            this._showToast('Drive authorization failed: ' + tokenResponse.error, 'error');
                            this._resetShareBtn();
                            return;
                        }
                        this.accessToken = tokenResponse.access_token;
                        this._loadPickerApi();
                    }
                });
            }

            this._setShareBtnLoading('Connecting to Drive…');
            // Empty prompt = reuse existing token if available; shows consent only if needed
            this.driveTokenClient.requestAccessToken({ prompt: '' });
        };

        waitForGoogle();
    }

    _loadPickerApi() {
        this._setShareBtnLoading('Loading folder picker…');

        const onPickerLoaded = () => {
            this.pickerApiLoaded = true;
            this._showFolderPicker();
        };

        if (!window.gapi) {
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = () => gapi.load('picker', onPickerLoaded);
            script.onerror = () => {
                this._showToast('Failed to load Google Picker. Check your connection.', 'error');
                this._resetShareBtn();
            };
            document.head.appendChild(script);
        } else if (!this.pickerApiLoaded) {
            gapi.load('picker', onPickerLoaded);
        } else {
            this._showFolderPicker();
        }
    }

    _showFolderPicker() {
        this._resetShareBtn();

        const apiKey = this._getApiKey();

        try {
            const foldersView = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
                .setIncludeFolders(true)
                .setSelectFolderEnabled(true)
                .setMimeTypes('application/vnd.google-apps.folder');

            const builder = new google.picker.PickerBuilder()
                .setTitle('Choose a folder to save your document')
                .addView(foldersView)
                .setOAuthToken(this.accessToken)
                .setCallback((data) => this._handlePickerCallback(data));

            if (apiKey) builder.setDeveloperKey(apiKey);

            builder.build().setVisible(true);
        } catch (err) {
            // Picker failed to load — fall back to uploading to Drive root
            if (confirm('Folder picker could not open.\nUpload to the root of My Drive instead?')) {
                this._uploadToDrive(this.pendingMarkdown, null);
            }
        }
    }

    _handlePickerCallback(data) {
        const action = data[google.picker.Response.ACTION];
        if (action === google.picker.Action.PICKED) {
            const folder = data[google.picker.Response.DOCUMENTS][0];
            const folderId = folder[google.picker.Document.ID];
            this._uploadToDrive(this.pendingMarkdown, folderId);
        }
        // ACTION.CANCEL → do nothing
    }

    // ─── Drive Upload ────────────────────────────────────────────────────────────

    async _uploadToDrive(markdown, folderId) {
        this._setShareBtnLoading('Uploading…');

        try {
            const date = new Date().toISOString().slice(0, 10);
            const filename = `mistermd-${date}.md`;

            const metadata = { name: filename, mimeType: 'text/markdown' };
            if (folderId) metadata.parents = [folderId];

            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', new Blob([markdown], { type: 'text/markdown' }));

            const uploadRes = await fetch(
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',
                {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${this.accessToken}` },
                    body: form
                }
            );

            if (!uploadRes.ok) {
                const errData = await uploadRes.json().catch(() => ({}));
                throw new Error(errData.error?.message || `Upload failed (${uploadRes.status})`);
            }

            const file = await uploadRes.json();

            // Grant public read access so viewers can open the link
            const permRes = await fetch(
                `https://www.googleapis.com/drive/v3/files/${file.id}/permissions`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ role: 'reader', type: 'anyone' })
                }
            );

            if (!permRes.ok) throw new Error('File uploaded but could not set public permissions.');

            const shareUrl =
                `${window.location.origin}${window.location.pathname}?gdrive=${file.id}`;

            this._resetShareBtn();
            this._showShareModal(shareUrl, file.name);

        } catch (err) {
            this._resetShareBtn();
            this._showToast('Upload failed: ' + err.message, 'error');
        }
    }

    // ─── Share Link Modal ─────────────────────────────────────────────────────────

    _showShareModal(url, filename) {
        const modal = document.getElementById('share-link-modal');
        const urlInput = document.getElementById('share-link-url');
        const filenameEl = document.getElementById('share-link-filename');

        if (!modal || !urlInput) return;

        urlInput.value = url;
        if (filenameEl) filenameEl.textContent = filename;
        modal.style.display = 'flex';
    }

    _hideModal() {
        const modal = document.getElementById('share-link-modal');
        if (modal) modal.style.display = 'none';
    }

    // ─── UI Helpers ───────────────────────────────────────────────────────────────

    _setShareBtnLoading(text) {
        const btn = document.getElementById('share-btn');
        if (!btn) return;
        btn.disabled = true;
        const label = btn.querySelector('.share-btn-text');
        if (label) label.textContent = text;
    }

    _resetShareBtn() {
        const btn = document.getElementById('share-btn');
        if (!btn) return;
        btn.disabled = false;
        const label = btn.querySelector('.share-btn-text');
        if (label) label.textContent = 'Share';
    }

    _copyToClipboard(text, triggerBtn) {
        const doSuccess = () => {
            this._showToast('Link copied to clipboard!', 'success');
            if (triggerBtn) {
                const orig = triggerBtn.textContent;
                triggerBtn.textContent = 'Copied!';
                setTimeout(() => { triggerBtn.textContent = orig; }, 2000);
            }
        };

        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(doSuccess).catch(() => this._fallbackCopy(text, doSuccess));
        } else {
            this._fallbackCopy(text, doSuccess);
        }
    }

    _fallbackCopy(text, onSuccess) {
        const el = document.createElement('textarea');
        el.value = text;
        el.style.cssText = 'position:absolute;left:-9999px;top:0';
        document.body.appendChild(el);
        el.select();
        try { document.execCommand('copy'); onSuccess?.(); } catch (_) {}
        document.body.removeChild(el);
    }

    _showToast(message, type = 'info', duration = 4000) {
        // Remove any existing toast
        document.querySelector('.share-toast')?.remove();

        const toast = document.createElement('div');
        toast.className = `share-toast share-toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => toast.classList.add('share-toast-visible'));
        });

        setTimeout(() => {
            toast.classList.remove('share-toast-visible');
            setTimeout(() => toast.remove(), 350);
        }, duration);
    }

    // ─── Config Helpers ───────────────────────────────────────────────────────────

    _getClientId() {
        try { return window.appConfig.get('google.clientId'); } catch (_) {}
        return window.appConfig?.config?.google?.clientId || '';
    }

    _getApiKey() {
        try { return window.appConfig.get('google.apiKey'); } catch (_) {}
        return window.appConfig?.config?.google?.apiKey || '';
    }
}

// Initialize
window.shareManager = new ShareManager();
document.addEventListener('DOMContentLoaded', () => {
    window.shareManager.initialize();
});
