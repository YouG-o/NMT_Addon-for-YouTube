/* 
 * Copyright (C) 2025-present YouGo (https://github.com/youg-o)
 * This program is licensed under the GNU Affero General Public License v3.0.
 * You may redistribute it and/or modify it under the terms of the license.
 * 
 * Attribution must be given to the original author.
 * This program is distributed without any warranty; see the license for details.
 */

/**
 * Handles YouTube's audio track selection to force original language
 * 
 * YouTube stores audio tracks in a specific format:
 * - Each track has an ID in the format: "251;BASE64_ENCODED_DATA"
 * - The BASE64_ENCODED_DATA contains track information including language code
 * - Track data is encoded as: "acont" (audio content) + "original"/"dubbed-auto" + "lang=XX-XX"
 * - Original track can be identified by "original" in its decoded data
 * 
 * Example of track ID:
 * "251;ChEKBWFjb250EghvcmlnaW5hbAoNCgRsYW5nEgVlbi1VUw"
 * When decoded: Contains "original" for original audio and "lang=en-US" for language
 */

let isScriptInjected = false;

async function handleAudioTranslation(isEnabled: boolean) {
    if (!isEnabled) return;
    
    if (isScriptInjected) {
        audioLog('Audio script already injected, skipping');
        return;
    }
    
    audioLog('Initializing audio translation prevention');
    
    const script = document.createElement('script');
    script.src = browser.runtime.getURL('dist/content/audioTranslation/audioScript.js');
    document.documentElement.appendChild(script);
    
    isScriptInjected = true;
}

let audioObserver: MutationObserver | null = null;

function setupAudioObserver() {
    // Disconnect existing observer if any
    if (audioObserver) {
        console.log('[NMT][Audio] Disconnecting existing observer');
        audioObserver.disconnect();
        audioObserver = null;
    }

    waitForElement('ytd-watch-flexy').then((watchFlexy) => {
        console.log('[NMT][Audio] Setting up new observer');
        audioObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'video-id') {
                    browser.storage.local.get('settings').then((data: Record<string, any>) => {
                        const settings = data.settings as ExtensionSettings;
                        if (settings?.audioTranslation) {
                            initializeAudioTranslation();
                        }
                    });
                }
            }
        });

        audioObserver.observe(watchFlexy, {
            attributes: true,
            attributeFilter: ['video-id']
        });
    });
}

// Clean up when the content script is unloaded
window.addEventListener('unload', () => {
    if (audioObserver) {
        console.log('[NMT][Audio] Cleaning up observer');
        audioObserver.disconnect();
        audioObserver = null;
    }
});
