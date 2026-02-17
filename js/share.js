/**
 * MisterMD Share Module
 * Handles sharing documents via Google Drive.
 *
 * Share flow (author):
 *   A. No cache       → filename prompt → folder picker → upload → show link
 *   B. Cache, no change → show cached link immediately (no upload)
 *   C. Cache, changed  → overwrite dialog
 *       ├─ "Update existing" → PATCH Drive file → show same link
 *       └─ "Save as new"    → filename prompt (name_1, _2…) → picker → upload
 *
 * View flow (viewer):
 *   Opens ?gdrive=<fileId> → fetch public file → render
 */

class ShareManager {
    constructor() {
        this.accessToken      = null;
        this.driveTokenClient = null;
        this._pendingTokenResolve = null;
        this._pendingTokenReject  = null;
        this.pendingMarkdown  = null;
        this.pendingFilename  = null;
        this.pickerApiLoaded  = false;
        this._CACHE_KEY       = 'mistermd_share_cache';
    }

    initialize() {
        this._setupEventListeners();
        this._checkSharedContent();
    }

    // ─── Event Listeners ────────────────────────────────────────────────────────

    _setupEventListeners() {
        // Share button
        document.getElementById('share-btn')
            ?.addEventListener('click', () => this.onShareClick());

        // Shared banner close
        document.getElementById('shared-banner-close')
            ?.addEventListener('click', () => {
                document.getElementById('shared-banner').style.display = 'none';
            });

        // ── Share link modal ──────────────────────────────────────────────────
        document.getElementById('copy-share-link')
            ?.addEventListener('click', () => {
                const url = document.getElementById('share-link-url')?.value;
                if (url) this._copyToClipboard(url, document.getElementById('copy-share-link'));
            });
        document.getElementById('share-link-close')
            ?.addEventListener('click', () => this._closeModal('share-link-modal'));
        document.getElementById('share-link-modal')
            ?.addEventListener('click', (e) => {
                if (e.target.id === 'share-link-modal') this._closeModal('share-link-modal');
            });

        // ── Filename prompt modal ─────────────────────────────────────────────
        document.getElementById('share-filename-confirm')
            ?.addEventListener('click', () => this._onFilenameConfirm());
        document.getElementById('share-filename-cancel')
            ?.addEventListener('click', () => this._closeModal('share-filename-modal'));
        document.getElementById('share-filename-modal')
            ?.addEventListener('click', (e) => {
                if (e.target.id === 'share-filename-modal') this._closeModal('share-filename-modal');
            });
        document.getElementById('share-doc-name')
            ?.addEventListener('keydown', (e) => { if (e.key === 'Enter') this._onFilenameConfirm(); });

        // ── Overwrite dialog ──────────────────────────────────────────────────
        document.getElementById('share-overwrite-update')
            ?.addEventListener('click', () => this._handleOverwrite());
        document.getElementById('share-overwrite-new')
            ?.addEventListener('click', () => this._handleCreateNew());
        document.getElementById('share-overwrite-modal')
            ?.addEventListener('click', (e) => {
                if (e.target.id === 'share-overwrite-modal') this._closeModal('share-overwrite-modal');
            });
    }

    // ─── Viewer: load shared content from URL ────────────────────────────────

    _checkSharedContent() {
        const params = new URLSearchParams(window.location.search);
        if (params.has('gdrive')) this._fetchDriveFile(params.get('gdrive'));
    }

    async _fetchDriveFile(fileId) {
        const banner  = document.getElementById('shared-banner');
        const statusEl = banner?.querySelector('.shared-status-text');

        if (banner)    banner.style.display = 'flex';
        if (statusEl)  statusEl.textContent  = 'Loading shared document…';

        try {
            const apiKey = this._getApiKey();
            if (!apiKey) throw new Error('Google API key not configured. Add google.apiKey to js/config.js.');

            const res = await fetch(
                `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${encodeURIComponent(apiKey)}`
            );

            if (res.status === 403) throw new Error('Access denied. The file may not be publicly shared.');
            if (res.status === 404) throw new Error('File not found. The link may be invalid or deleted.');
            if (!res.ok)            throw new Error(`Could not load document (HTTP ${res.status}).`);

            const markdown = await res.text();

            if (statusEl) statusEl.textContent = 'Shared document';

            const input = document.getElementById('markdown-input');
            if (input) input.value = markdown;

            const tryRender = (n = 0) => {
                if (typeof window.renderMarkdown === 'function') window.renderMarkdown();
                else if (n < 30) setTimeout(() => tryRender(n + 1), 200);
            };
            setTimeout(() => tryRender(), 400);

        } catch (err) {
            if (statusEl) statusEl.textContent = 'Could not load shared document';
            this._showToast(err.message, 'error', 8000);
        }
    }

    // ─── Author: entry point ─────────────────────────────────────────────────

    onShareClick() {
        const markdown = document.getElementById('markdown-input')?.value?.trim();
        if (!markdown) {
            this._showToast('Please enter some markdown content first.', 'warning');
            return;
        }

        const preview        = document.getElementById('preview');
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

        // ── Step 1: cache check ───────────────────────────────────────────────
        const cache = this._getCache();

        if (!cache) {
            // First time — prompt for filename
            this._showFilenamePrompt(this._defaultFilename());
            return;
        }

        if (cache.markdown === markdown) {
            // Nothing changed — show cached link immediately
            this._showShareModal(cache.url, cache.filename + '.md');
            return;
        }

        // Content changed — ask the user
        this._showOverwriteDialog(cache.filename);
    }

    // ─── Step 2A: Overwrite dialog ───────────────────────────────────────────

    _showOverwriteDialog(existingFilename) {
        const nameEl = document.getElementById('share-overwrite-filename');
        if (nameEl) nameEl.textContent = existingFilename + '.md';
        document.getElementById('share-overwrite-modal').style.display = 'flex';
    }

    async _handleOverwrite() {
        this._closeModal('share-overwrite-modal');
        const cache = this._getCache();
        if (!cache) return;

        this._setShareBtnLoading('Connecting to Drive…');
        try {
            await this._ensureDriveToken();
            await this._overwriteDriveFile(this.pendingMarkdown, cache.fileId, cache.filename);
        } catch (err) {
            this._resetShareBtn();
            this._showToast('Update failed: ' + err.message, 'error');
        }
    }

    _handleCreateNew() {
        this._closeModal('share-overwrite-modal');
        const cache = this._getCache();
        const suffix  = cache?.nextSuffix ?? 1;
        const base    = cache?.baseName   ?? this._defaultFilename();
        this._showFilenamePrompt(`${base}_${suffix}`);
    }

    // ─── Step 2B: Filename prompt ────────────────────────────────────────────

    _showFilenamePrompt(defaultName) {
        const input = document.getElementById('share-doc-name');
        if (input) {
            input.value = defaultName;
            setTimeout(() => { input.focus(); input.select(); }, 150);
        }
        document.getElementById('share-filename-modal').style.display = 'flex';
    }

    _onFilenameConfirm() {
        const input = document.getElementById('share-doc-name');
        const name  = input?.value?.trim();
        if (!name) { input?.focus(); return; }

        this.pendingFilename = name;
        this._closeModal('share-filename-modal');
        this._startUploadFlow();
    }

    // ─── Drive token + picker + upload ───────────────────────────────────────

    async _startUploadFlow() {
        this._setShareBtnLoading('Connecting to Drive…');
        try {
            await this._ensureDriveToken();
            await this._loadPickerApiIfNeeded();
            this._setShareBtnLoading('Opening folder picker…');
            this._showFolderPicker();
        } catch (err) {
            this._resetShareBtn();
            this._showToast('Drive connection failed: ' + err.message, 'error');
        }
    }

    _ensureDriveToken() {
        return new Promise((resolve, reject) => {
            const doRequest = () => {
                this._pendingTokenResolve = resolve;
                this._pendingTokenReject  = reject;
                this.driveTokenClient.requestAccessToken({ prompt: '' });
            };

            if (!this.driveTokenClient) {
                const waitForGoogle = (n = 0) => {
                    if (typeof google === 'undefined' || !google.accounts?.oauth2) {
                        if (n < 25) setTimeout(() => waitForGoogle(n + 1), 200);
                        else reject(new Error('Google services not available. Please refresh the page.'));
                        return;
                    }
                    this.driveTokenClient = google.accounts.oauth2.initTokenClient({
                        client_id: this._getClientId(),
                        scope: 'https://www.googleapis.com/auth/drive.file',
                        callback: (resp) => this._onTokenResponse(resp)
                    });
                    doRequest();
                };
                waitForGoogle();
            } else {
                doRequest();
            }
        });
    }

    _onTokenResponse(resp) {
        if (resp.error) {
            this._pendingTokenReject?.(new Error(resp.error));
        } else {
            this.accessToken = resp.access_token;
            this._pendingTokenResolve?.();
        }
        this._pendingTokenResolve = null;
        this._pendingTokenReject  = null;
    }

    _loadPickerApiIfNeeded() {
        return new Promise((resolve, reject) => {
            if (this.pickerApiLoaded) { resolve(); return; }

            const onLoaded = () => { this.pickerApiLoaded = true; resolve(); };

            if (!window.gapi) {
                const script    = document.createElement('script');
                script.src      = 'https://apis.google.com/js/api.js';
                script.onload   = () => gapi.load('picker', onLoaded);
                script.onerror  = () => reject(new Error('Failed to load Google Picker.'));
                document.head.appendChild(script);
            } else {
                gapi.load('picker', onLoaded);
            }
        });
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
            if (confirm('Folder picker could not open.\nUpload to the root of My Drive instead?')) {
                this._uploadToDrive(this.pendingMarkdown, null, this.pendingFilename);
            }
        }
    }

    _handlePickerCallback(data) {
        if (data[google.picker.Response.ACTION] === google.picker.Action.PICKED) {
            const folder   = data[google.picker.Response.DOCUMENTS][0];
            const folderId = folder[google.picker.Document.ID];
            this._uploadToDrive(this.pendingMarkdown, folderId, this.pendingFilename);
        }
    }

    // ─── Drive: new file upload ──────────────────────────────────────────────

    async _uploadToDrive(markdown, folderId, baseName) {
        this._setShareBtnLoading('Uploading…');
        const filename = baseName + '.md';

        try {
            const metadata = { name: filename, mimeType: 'text/markdown' };
            if (folderId) metadata.parents = [folderId];

            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file',     new Blob([markdown],                { type: 'text/markdown'   }));

            const uploadRes = await fetch(
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',
                { method: 'POST', headers: { Authorization: `Bearer ${this.accessToken}` }, body: form }
            );

            if (!uploadRes.ok) {
                const e = await uploadRes.json().catch(() => ({}));
                throw new Error(e.error?.message || `Upload failed (${uploadRes.status})`);
            }

            const file = await uploadRes.json();

            const permRes = await fetch(
                `https://www.googleapis.com/drive/v3/files/${file.id}/permissions`,
                {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ role: 'reader', type: 'anyone' })
                }
            );
            if (!permRes.ok) throw new Error('File uploaded but could not set public permissions.');

            const shareUrl = `${window.location.origin}${window.location.pathname}?gdrive=${file.id}`;

            const existingCache = this._getCache();
            this._setCache({
                markdown,
                fileId:     file.id,
                url:        shareUrl,
                filename:   baseName,
                folderId:   folderId || null,
                baseName:   baseName,
                nextSuffix: (existingCache?.nextSuffix ?? 1) + 1
            });

            this._resetShareBtn();
            this._showShareModal(shareUrl, filename);

        } catch (err) {
            this._resetShareBtn();
            this._showToast('Upload failed: ' + err.message, 'error');
        }
    }

    // ─── Drive: overwrite existing file ─────────────────────────────────────

    async _overwriteDriveFile(markdown, fileId, baseName) {
        this._setShareBtnLoading('Updating file…');

        try {
            const updateRes = await fetch(
                `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
                {
                    method: 'PATCH',
                    headers: {
                        Authorization:  `Bearer ${this.accessToken}`,
                        'Content-Type': 'text/markdown'
                    },
                    body: markdown
                }
            );

            if (!updateRes.ok) {
                const e = await updateRes.json().catch(() => ({}));
                throw new Error(e.error?.message || `Update failed (${updateRes.status})`);
            }

            // Update only the markdown content in cache, keep everything else
            const cache = this._getCache();
            this._setCache({ ...cache, markdown });

            this._resetShareBtn();
            this._showShareModal(cache.url, baseName + '.md');
            this._showToast('File updated successfully!', 'success');

        } catch (err) {
            this._resetShareBtn();
            throw err;
        }
    }

    // ─── Cache ───────────────────────────────────────────────────────────────

    _getCache() {
        try { return JSON.parse(localStorage.getItem(this._CACHE_KEY)); } catch (_) { return null; }
    }

    _setCache(data) {
        try { localStorage.setItem(this._CACHE_KEY, JSON.stringify(data)); } catch (_) {}
    }

    // ─── Name helpers ────────────────────────────────────────────────────────

    _defaultFilename() {
        return `mistermd-${new Date().toISOString().slice(0, 10)}`;
    }

    // ─── Share link modal ────────────────────────────────────────────────────

    _showShareModal(url, filename) {
        const modal     = document.getElementById('share-link-modal');
        const urlInput  = document.getElementById('share-link-url');
        const nameEl    = document.getElementById('share-link-filename');

        if (!modal || !urlInput) return;
        urlInput.value = url;
        if (nameEl) nameEl.textContent = filename;
        modal.style.display = 'flex';
    }

    _closeModal(id) {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    }

    // ─── UI helpers ──────────────────────────────────────────────────────────

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
        const done = () => {
            this._showToast('Link copied to clipboard!', 'success');
            if (triggerBtn) {
                const orig = triggerBtn.textContent;
                triggerBtn.textContent = 'Copied!';
                setTimeout(() => { triggerBtn.textContent = orig; }, 2000);
            }
        };
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(done).catch(() => this._fallbackCopy(text, done));
        } else {
            this._fallbackCopy(text, done);
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
        document.querySelector('.share-toast')?.remove();
        const toast = document.createElement('div');
        toast.className = `share-toast share-toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('share-toast-visible')));
        setTimeout(() => {
            toast.classList.remove('share-toast-visible');
            setTimeout(() => toast.remove(), 350);
        }, duration);
    }

    _getClientId() {
        try { return window.appConfig.get('google.clientId'); } catch (_) {}
        return window.appConfig?.config?.google?.clientId || '';
    }

    _getApiKey() {
        try { return window.appConfig.get('google.apiKey'); } catch (_) {}
        return window.appConfig?.config?.google?.apiKey || '';
    }
}

window.shareManager = new ShareManager();
document.addEventListener('DOMContentLoaded', () => {
    window.shareManager.initialize();
});
