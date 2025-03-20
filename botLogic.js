(function() {
    'use strict';

    /***********************************************************************
     * 0) SHEET SYNC: DETECTING ALREADY-REACHED-OUT PROFILES
     ***********************************************************************/
    const SHEET_ID = '1PzjzlloKznylCZwM9Xq4KYb4ZPydSM9hwA0v0Q952Rk';
    const GET_URL = 'https://script.google.com/macros/s/AKfycbw3tOYe7gdZIaO-5MXBKVHyuL0TVLoV1GTRxo7-hjuSZq8il2jhtmdNAUFteydR_vNc/exec?sheetID=' + SHEET_ID;
    const POST_URL = 'https://script.google.com/macros/s/AKfycby-J4JZ8eLJAsNFsP5BxpAm5nP_-Ccft0trbRuogNPVcF795IktbJ80Fmi2mZ0QGPiw4w/exec';
    let allProfilesList = [];

    function fetchAllProfiles() {
        console.log('[SNBot/Sheet] Fetching existing profiles from sheet (GET)...');
        GM_xmlhttpRequest({
            method: 'GET',
            url: GET_URL,
            onload: function(response) {
                try {
                    console.log('[SNBot/Sheet] GET status:', response.status);
                    const data = JSON.parse(response.responseText);
                    if (data && data.data) {
                        allProfilesList = data.data.map(item => (item.NAME || '').trim().toLowerCase());
                        console.log('[SNBot/Sheet] allProfilesList:', allProfilesList);
                    }
                } catch (e) {
                    console.error('[SNBot/Sheet] Failed to parse GET response:', e);
                }
            },
            onerror: function(err) {
                console.error('[SNBot/Sheet] Error fetching profiles (GET):', err);
            }
        });
    }
    fetchAllProfiles();

    function addNameToSheet(name) {
        console.log(`[SNBot/Sheet] Adding "${name}" to sheet (POST)...`);
        GM_xmlhttpRequest({
            method: 'POST',
            url: POST_URL,
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify({
                "SheetID": SHEET_ID,
                "Field": { "NAME": name }
            }),
            onload: function(res) {
                console.log(`[SNBot/Sheet] POST success for "${name}". Status: ${res.status}`);
            },
            onerror: function(err) {
                console.error(`[SNBot/Sheet] POST failed for "${name}".`, err);
            }
        });
    }

    function processDetectedName(name) {
        if (!name) return false;
        const lower = name.toLowerCase().trim();
        if (allProfilesList.includes(lower)) {
            console.log(`[SNBot/Sheet] "${name}" is already in sheet => skipping`);
            return true;
        } else {
            console.log(`[SNBot/Sheet] "${name}" is new => adding`);
            addNameToSheet(name);
            allProfilesList.push(lower);
            return false;
        }
    }

    /***********************************************************************
     * A) UI: START/STOP + STATUS + Counters
     ***********************************************************************/
    const container = document.createElement('div');
    container.style.zIndex = '2147483647';
    container.style.position = 'fixed';
    container.style.top = '10px';
    container.style.right = '10px';
    container.style.fontFamily = 'Arial,sans-serif';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'flex-end';
    container.style.width = '280px';
    container.style.backgroundColor = '#ffffff';
    container.style.border = '1px solid #ccc';
    container.style.borderRadius = '6px';
    container.style.padding = '8px';

    function waitForBody() {
        if (document.body) {
            document.body.appendChild(container);
        } else {
            setTimeout(waitForBody, 100);
        }
    }
    waitForBody();

    const toggleBtn = document.createElement('button');
    toggleBtn.innerText = 'Start Bot';
    toggleBtn.style.backgroundColor = '#0077b5';
    toggleBtn.style.color = '#fff';
    toggleBtn.style.border = 'none';
    toggleBtn.style.borderRadius = '4px';
    toggleBtn.style.cursor = 'pointer';
    toggleBtn.style.fontSize = '14px';
    toggleBtn.style.padding = '8px 12px';
    toggleBtn.style.marginBottom = '8px';

    const statusLabel = document.createElement('div');
    statusLabel.textContent = 'Status: Idle';
    statusLabel.style.backgroundColor = '#f0f0f0';
    statusLabel.style.border = '1px solid #ccc';
    statusLabel.style.borderRadius = '4px';
    statusLabel.style.color = '#333';
    statusLabel.style.fontSize = '12px';
    statusLabel.style.padding = '6px 8px';
    statusLabel.style.minWidth = '240px';

    const countersDiv = document.createElement('div');
    countersDiv.style.marginTop = '6px';
    countersDiv.style.fontSize = '12px';
    countersDiv.style.color = '#333';
    countersDiv.innerHTML = `
      <div>Connections Sent: <span id="connectionsSentCount">0</span></div>
      <div>InMails Sent: <span id="inMailsSentCount">0</span></div>
    `;

    container.appendChild(toggleBtn);
    container.appendChild(statusLabel);
    container.appendChild(countersDiv);

    const connectionsSentSpan = countersDiv.querySelector('#connectionsSentCount');
    const inMailsSentSpan = countersDiv.querySelector('#inMailsSentCount');

    function setStatus(msg) {
        console.log('[SNBot] ' + msg);
        statusLabel.textContent = 'Status: ' + msg;
    }

    GM_addStyle("#salesnav-popup { z-index: 2147483647 !important; }");

    let isRunning = false;
    let stopRequested = false;
    let profileIndex = 0;
    let profileElements = [];
    let connectionsSent = 0;
    let inMailsSent = 0;
    let processedThisPageCount = 0;

    /***********************************************************************
     * B) HIGHLIGHT + CLICK UTILITY
     ***********************************************************************/
    let highlightDiv = null;
    function highlightAndClick(elem) {
        if (!elem) {
            console.warn('[SNBot] highlightAndClick: elem is null');
            return;
        }
        // Remove previous highlight if any
        if (highlightDiv && highlightDiv.parentNode) {
            highlightDiv.parentNode.removeChild(highlightDiv);
        }
        const rect = elem.getBoundingClientRect();
        highlightDiv = document.createElement('div');
        highlightDiv.style.position = 'fixed';
        highlightDiv.style.left = rect.left + 'px';
        highlightDiv.style.top = rect.top + 'px';
        highlightDiv.style.width = rect.width + 'px';
        highlightDiv.style.height = rect.height + 'px';
        highlightDiv.style.border = '3px solid red';
        highlightDiv.style.backgroundColor = 'rgba(255,0,0,0.15)';
        highlightDiv.style.zIndex = '999999999';
        highlightDiv.style.pointerEvents = 'none';
        document.body.appendChild(highlightDiv);
        setTimeout(() => elem.click(), 1000);
    }

    /***********************************************************************
     * C) RANDOM DELAY UTILS
     ***********************************************************************/
    function randomDelaySec(minSec, maxSec) {
        return (Math.random() * (maxSec - minSec) + minSec) * 1000;
    }

    function waitMs(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /***********************************************************************
     * D) MESSAGES & TYPING
     ***********************************************************************/
    // Tweaked typed-text speed to a consistent range (60-100ms) for smoother effect
    async function typeTextSlowly(el, fullText, minSpeed = 60, maxSpeed = 100) {
        el.value = '';
        for (let i = 0; i < fullText.length; i++) {
            el.value += fullText[i];
            // dispatch events so LinkedIn sees the typed changes
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            const delay = Math.floor(Math.random() * (maxSpeed - minSpeed)) + minSpeed;
            await waitMs(delay);
        }
    }

    const openProfileMsg = `Hey FIRST_NAME, It’s Ishita! I know it’s random…lol. But I saw your LinkedIn profile here & thought I’d reach out to you. I can bring you over 10,000 conversions for COMPANYNAME every month by creating a converting app that will showcase your brand value. Are you available to meet sometime this week?`;
    const connectNoteMsg = `Hey NAME, it’s Ishita! Saw your LinkedIn and had to Reach Out. I can help COMPANYNAME get 10,000+ conversions monthly with a high-converting app. Up for a quick meet this week?`;

    /***********************************************************************
     * E) TOGGLE: START / STOP
     ***********************************************************************/
    let maxInMails = 0;
    let maxConnections = 0;

    toggleBtn.addEventListener('click', () => {
        if (!isRunning) {
            // Ask for limits before starting
            maxInMails = parseInt(prompt("Enter the maximum number of InMails to send in this session:", "5"), 10);
            maxConnections = parseInt(prompt("Enter the maximum number of Connection Requests to send in this session:", "10"), 10);

            // If invalid values, reset and stop
            if (isNaN(maxInMails) || isNaN(maxConnections) || maxInMails < 0 || maxConnections < 0) {
                alert("Invalid input. Please enter valid numbers.");
                return;
            }

            isRunning = true;
            stopRequested = false;
            toggleBtn.innerText = 'Stop Bot';
            setStatus('Collecting profile items...');
            collectProfilesOnPage();

            if (profileElements.length === 0) {
                setStatus('No profiles found. Stopped.');
                toggleBtn.innerText = 'Start Bot';
                isRunning = false;
            } else {
                // Ask for the profile number to start from
                let startProfileIndex = parseInt(prompt(`Enter the profile number to start from (1-${profileElements.length}):`, "1"), 10) - 1;

                // Validate input
                if (isNaN(startProfileIndex) || startProfileIndex < 0 || startProfileIndex >= profileElements.length) {
                    alert(`Invalid input. Please enter a number between 1 and ${profileElements.length}.`);
                    isRunning = false;
                    return;
                }

                profileIndex = startProfileIndex; // Set the starting profile index
                processedThisPageCount = 0;
                setTimeout(() => processNextProfile(), 1500);
            }
        } else {
            // Stop requested
            isRunning = false;
            stopRequested = true;
            toggleBtn.innerText = 'Start Bot';
            setStatus('Stop requested, halting...');
        }
    });

    function collectProfilesOnPage() {
        profileElements = Array.from(
            document.querySelectorAll(
                'li.artdeco-list__item.pl3.pv3, li[data-anonymize="search-result"], li[data-x-search-result="LEAD"]'
            )
        );
        console.log('[SNBot] Found profiles:', profileElements.length);
    }

    /***********************************************************************
     * F) MAIN LOOP: PROCESS NEXT PROFILE
     ***********************************************************************/
    async function processNextProfile() {
        if (stopRequested) {
            setStatus('Stopped by user');
            return;
        }

        // Check if the limits have been reached
        if (inMailsSent >= maxInMails && connectionsSent >= maxConnections) {
            setStatus(`Reached session limits (InMails: ${maxInMails}, Connections: ${maxConnections})`);
            toggleBtn.innerText = 'Start Bot';
            isRunning = false;
            return;
        }

        if (profileIndex >= profileElements.length) {
            setStatus('All profiles on this page processed');
            await goToNextPageIfAvailable();
            return;
        }

        if (processedThisPageCount >= 25) {
            setStatus('Reached 25 profiles => Next page...');
            await goToNextPageIfAvailable();
            return;
        }

        // Scroll to this profile
        const li = profileElements[profileIndex];
        setStatus(`Scrolling to profile #${profileIndex+1}/${profileElements.length}...`);
        li.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await waitMs(randomDelaySec(2,6));

        // Find name link
        const nameLink = li.querySelector(
            'a[data-control-name*="view_lead_panel_via_search_lead_name"], ' +
            'a[data-anonymize="person-name"], ' +
            'a[data-anonymize="profile-name"]'
        );

        if (!nameLink) {
            console.warn('[SNBot] No name link => skipping...');
            profileIndex++;
            processedThisPageCount++;
            // Wait a bit, then move on to next
            await waitMs(randomDelaySec(1,3));
            if (!stopRequested) await processNextProfile();
            return;
        }

        // Click on the name link to open the side panel
        highlightAndClick(nameLink);
        await waitMs(3000);

        // Now handle the profile detail (InMail or Connect)
        await handleProfileDetail();
        // After done with this profile, move to next
        profileIndex++;
        processedThisPageCount++;

        // Small wait before next profile
        await waitMs(randomDelaySec(5,10));
        if (!stopRequested) await processNextProfile();
    }

    /***********************************************************************
     * G) PARSE DETAILS, CHECK SHEET, THEN MESSAGE
     ***********************************************************************/
    async function handleProfileDetail() {
        if (stopRequested) return;

        const panel = document.querySelector(
            '.lead-sidesheet, ._lead-details-sidesheet_1igybl, #profile-card-section,' +
            ' ._inline-sidesheet_4y6x1f, .lead-sidesheet-content'
        );
        if (!panel) {
            console.warn('[SNBot] No detail panel => skip...');
            return;
        }

        // Grab full name
        let nameEl = panel.querySelector(
            '[data-anonymize="person-name"] a, [data-anonymize="person-name"], ' +
            '.lead-sidesheet h1 a[data-anonymize="person-name"], ' +
            'a._lead-page-link_14ppj7[data-anonymize="person-name"], ' +
            'a._lead-page-link_sqh8tm[data-anonymize="person-name"]'
        );
        if (!nameEl) {
            nameEl = panel.querySelector('span._name_1sdjqx a, span._name_1sdjqx');
        }
        let fullName = nameEl ? nameEl.textContent.trim() : 'UnknownName';

        // Check in your Google Sheet
        if (processDetectedName(fullName)) {
            setStatus('Already interacted => skipping');
            return;
        }

        // Attempt to detect relevant company
        let detectedCompany = extractSpecialCompany(panel);
        let companyName = detectedCompany ? detectedCompany : 'your startup'; // fallback

        setStatus(`Got name="${fullName}", company="${companyName}". Checking for "Message" button...`);
        await waitMs(randomDelaySec(2,5));

        // Check if there's a direct "Message"/"InMail" button
        let msgBtn = panel.querySelector(
            'button[data-anchor-send-message], button[aria-label^="Message"], ' +
            'button._message-cta_1xow7n, button[data-anchor-send-inmail], ' +
            'button[aria-label^="Message "], button[aria-label="Message"]'
        );
        if (!msgBtn) {
            // If no message button, try connect flow
            console.warn('[SNBot] No "Message" => connect flow...');
            await doConnectFlow(fullName, companyName, panel);
            return;
        }

        // If we do have a "Message" button
        await waitMs(randomDelaySec(1,3));
        highlightAndClick(msgBtn);
        await waitMs(3000);
        await handleMessagePopup(fullName, companyName);
    }

    function extractSpecialCompany(panel) {
        // First, try to get the company name from the selected profile in the list
        let companyName = getSelectedProfileCompanyName();
        if (companyName) {
            console.log(`[SNBot] Extracted Company from Profile List: "${companyName}"`);
            return companyName;
        }

        // If not found in the list, fallback to extracting from the panel
        let positions = panel.querySelectorAll('li._position-item_q5pnp1');
        if (!positions || positions.length === 0) return '';

        const validTitles = ["CEO", "Founder", "Chief", "founder"];
        let detectedCompany = '';

        for (let pos of positions) {
            let jtEl = pos.querySelector('span[data-anonymize="job-title"]');
            if (!jtEl) jtEl = pos.querySelector('span._bodyText_1e5nen');
            if (!jtEl) continue;

            let jobTitle = jtEl.textContent.trim().toLowerCase();
            if (validTitles.some(title => jobTitle.includes(title.toLowerCase()))) {
                let companyEl = pos.querySelector('a[data-anonymize="company-name"]');
                if (companyEl) {
                    detectedCompany = companyEl.textContent.trim();
                    console.log(`[SNBot] Matched Role: "${jobTitle}" -> Extracted Company: "${detectedCompany}"`);
                    return detectedCompany;
                }
            }
        }
        return detectedCompany;
    }

    // Attempt to get the selected profile's company from the list
    function getSelectedProfileCompanyName() {
        let selectedProfile = document.querySelector("li.selected-sidesheet-entity");
        if (selectedProfile) {
            let companyElement = selectedProfile.querySelector('a[data-view-name="search-results-lead-company-name"]');
            if (companyElement) {
                let companyName = companyElement.textContent.trim();
                console.log(`[SNBot] Found Company in List: "${companyName}"`);
                return companyName;
            }
            console.log("[SNBot] Company name not found in the selected profile list.");
        } else {
            console.log("[SNBot] No selected profile found.");
        }
        return null;
    }

    /***********************************************************************
     * H) MESSAGE POPUP (INMAIL / OPEN PROFILE)
     ***********************************************************************/
    async function handleMessagePopup(fullName, companyName) {
        if (stopRequested) return;

        const popup = document.querySelector(
            'section._overlay-container_1m6rrr[role="dialog"], .msg-overlay, .msg-overlay-container'
        );

        if (!popup) {
            console.warn('[SNBot] No message popup => connect flow...');
            await doConnectFlow(fullName, companyName);
            return;
        }

        // If we've hit InMail limit, skip to Connect
        if (inMailsSent >= maxInMails) {
            console.log("[SNBot] InMail limit reached, skipping to Connect...");
            closeMessagePopup();
            await doConnectFlow(fullName, companyName);
            return;
        }

        // Check for "Free to Open Profile"
        let labelEl = popup.querySelector('span.ml1.t-12.truncate');
        let labelTxt = labelEl ? labelEl.textContent.trim() : '';
        let isOpenProfile = labelTxt.includes('Free to Open Profile') || labelTxt.includes('Open Profile');

        await waitMs(randomDelaySec(1,2));
        if (isOpenProfile) {
            setStatus('Open profile => fill InMail...');
            await fillOpenProfileInMail(popup, fullName, companyName);
        } else {
            setStatus('Not open => close & connect...');
            closeMessagePopup();
            await waitMs(randomDelaySec(2,5));
            await doConnectFlow(fullName, companyName);
        }
    }

    async function fillOpenProfileInMail(popup, fullName, companyName) {
        await waitMs(randomDelaySec(2, 4));

        let subjectEl = popup.querySelector(
            'input[id^="compose-form-subject-ember"], input._subject-field_jrrmou'
        );
        let msgEl = popup.querySelector(
            'textarea[id^="compose-form-text-ember"], textarea._message-field_jrrmou'
        );

        let firstName = fullName.split(' ')[0];
        let replaced = openProfileMsg
            .replace(/\bFIRST_NAME\b/g, firstName)
            .replace(/\bCOMPANYNAME\b/g, companyName && companyName.trim() && companyName !== firstName
                ? companyName
                : 'your company');

        // Type subject
        if (subjectEl) {
            highlightAndClick(subjectEl);
            await waitMs(1200);
            await typeTextSlowly(subjectEl, firstName);
        }

        await waitMs(randomDelaySec(3, 6));
        // Type the main body
        if (msgEl) {
            highlightAndClick(msgEl);
            await waitMs(1200);
            await typeTextSlowly(msgEl, replaced);
        }

        await waitMs(randomDelaySec(2, 5));

        // Find and click the Send button
        let sendBtn = popup.querySelector(
            'button[data-control-name^="send"], button.artdeco-button--primary, button[type="submit"], button[id^="ember"][class*="primary"]'
        );
        if (sendBtn) {
            setStatus('Clicking "Send InMail"');
            highlightAndClick(sendBtn);

            // Count the InMail
            if (inMailsSent < maxInMails) {
                inMailsSent++;
                inMailsSentSpan.textContent = inMailsSent;
            }

            // Wait a bit for the message to send
            await waitMs(randomDelaySec(3, 5));

            // Close the popup
            closeMessagePopup();
        }
    }

    function closeMessagePopup() {
        let closeBtn = document.querySelector(
            'button[aria-label^="Close conversation"], button[data-control-name="overlay.close_overlay"]'
        );

        if (closeBtn) {
            console.log("[SNBot] Closing message popup...");
            highlightAndClick(closeBtn);
        } else {
            console.log("[SNBot] No close button found for message popup.");
        }
    }

    /***********************************************************************
     * I) CONNECT FLOW
     ***********************************************************************/
    async function doConnectFlow(fullName, companyName, panel) {
        setStatus('Connect Flow...');

        if (connectionsSent >= maxConnections) {
            console.log("[SNBot] Connection limit reached, skipping to next profile...");
            return;
        }

        if (!panel) {
            panel = document.querySelector(
                '.lead-sidesheet, ._lead-details-sidesheet_1igybl, #profile-card-section,' +
                ' ._inline-sidesheet_4y6x1f, .lead-sidesheet-content'
            );
        }
        if (!panel) {
            console.warn('[SNBot] no panel => skip...');
            return;
        }

        // Attempt the 3-dot menu
        let moreBtn = panel.querySelector(
            'button[id^="hue-menu-trigger-ember"][data-x--lead-actions-bar-overflow-menu],' +
            'button[aria-label="Open actions overflow menu"]'
        );

        if (!moreBtn) {
            // fallback: direct connect button
            console.warn('[SNBot] No 3-dot => direct connect fallback...');
            await clickDirectConnect(fullName, companyName);
            return;
        }

        await waitMs(randomDelaySec(2,5));
        highlightAndClick(moreBtn);
        await waitMs(randomDelaySec(1,2));

        // Wait for the dropdown to appear
        let dd = null;
        for (let i = 0; i < 5; i++) {
            dd = document.querySelector(
                `div[id="${moreBtn.getAttribute('aria-controls')}"]` +
                '.artdeco-dropdown__content--is-open,' +
                'div._container_x5gf48._visible_x5gf48[aria-hidden="false"]'
            );
            if (dd) break;
            await waitMs(500);
        }

        if (!dd) {
            console.warn('[SNBot] No dropdown => direct connect fallback...');
            await clickDirectConnect(fullName, companyName);
            return;
        }

        // Find "Connect" item in the overflow menu
        let connectItem = null;
        for (let i = 0; i < 5; i++) {
            const menuItems = Array.from(dd.querySelectorAll('button._item_1xnv7i, a._item_1xnv7i'));
            connectItem = menuItems.find(el => el.textContent.trim().toLowerCase() === 'connect');
            if (connectItem) break;
            await waitMs(500);
        }

        if (!connectItem) {
            console.warn('[SNBot] No "Connect" => maybe pending => skip...');
            return;
        }

        await waitMs(randomDelaySec(1,4));
        highlightAndClick(connectItem);
        await waitMs(randomDelaySec(3,4));
        await fillConnectPopup(fullName, companyName);
    }

    async function clickDirectConnect(fullName, companyName) {
        setStatus('Try direct connect...');
        let btn = document.querySelector(
            'button[data-control-name="connect"], button.connect-cta-form__launch, a[data-control-name="connect"],' +
            'button[aria-label^="Connect with"], button._connect-cta'
        );
        if (!btn) {
            console.warn('[SNBot] No direct connect => skip...');
            return;
        }
        await waitMs(randomDelaySec(2,5));
        highlightAndClick(btn);
        await waitMs(randomDelaySec(3,4));
        await fillConnectPopup(fullName, companyName);
    }

    async function fillConnectPopup(fullName, companyName) {
        let connectModal = document.querySelector(
            'div.artdeco-modal.artdeco-modal--layer-default, .connect-cta-form__content-container,' +
            ' div.send-invite, div.generic-activity-modal'
        );
        if (!connectModal) {
            console.warn('[SNBot] No connect modal => skip...');
            return;
        }

        if (connectModal.innerText.toLowerCase().includes('pending')) {
            console.warn('[SNBot] Already pending => skip...');
            return;
        }

        let noteArea = connectModal.querySelector(
            '#connect-cta-form__invitation, textarea, textarea[name="message"]'
        );
        if (!noteArea) {
            console.warn('[SNBot] No note area => skip...');
            return;
        }

        await waitMs(randomDelaySec(2,5));
        let firstName = fullName.split(' ')[0];
        let replaced = connectNoteMsg
            .replace(/\bNAME\b/g, firstName)
            .replace(/\bCOMPANYNAME\b/g, companyName && companyName.trim() && companyName !== firstName
                ? companyName
                : 'your company');

        highlightAndClick(noteArea);
        await waitMs(1200);
        await typeTextSlowly(noteArea, replaced);

        await waitMs(randomDelaySec(3,6));
        let sendBtn = connectModal.querySelector(
            'button.connect-cta-form__send, button.button-primary-medium,' +
            ' button[data-control-name="invite"], button[aria-label^="Send now"], ' +
            'button[type="submit"].button-primary-medium'
        );
        if (sendBtn) {
            setStatus('Click "Send Invitation"');
            highlightAndClick(sendBtn);

            // Increment connection count
            if (connectionsSent < maxConnections) {
                connectionsSent++;
                connectionsSentSpan.textContent = connectionsSent;
            }

            // Wait a moment after sending
            await waitMs(randomDelaySec(2, 5));
        } else {
            console.warn('[SNBot] No "Send Invitation" button => skip');
        }
    }

    /***********************************************************************
     * J) NEXT PAGE LOGIC
     ***********************************************************************/
    async function goToNextPageIfAvailable() {
        setStatus('Looking for next page...');
        const pagination = document.querySelector('div.artdeco-pagination[data-search-pagination-type="overflow"]');
        if (!pagination) {
            setStatus('No pagination => done all pages');
            toggleBtn.innerText = 'Start Bot';
            isRunning = false;
            return;
        }

        let activeLi = pagination.querySelector(
            'li.artdeco-pagination__indicator.active, li.artdeco-pagination__indicator.selected'
        );
        if (!activeLi) {
            console.warn('[SNBot] No active page => try "Next" button');
            let nextBtn = pagination.querySelector('button.artdeco-pagination__button--next');
            if (!nextBtn) {
                console.warn('[SNBot] No next button => done');
                setStatus('No next page found. Stopping!');
                toggleBtn.innerText = 'Start Bot';
                isRunning = false;
                return;
            }
            highlightAndClick(nextBtn);
            await waitMs(4000);
            await waitForPageLoad();
            await waitMs(2000);
            resetAndCollectNewPage();
            return;
        }

        let nextLi = activeLi.nextElementSibling;
        if (!nextLi) {
            console.warn('[SNBot] No next li => done');
            toggleBtn.innerText = 'Start Bot';
            isRunning = false;
            return;
        }

        let nextBtn = nextLi.querySelector('button');
        if (!nextBtn) {
            console.warn('[SNBot] No next button => done');
            toggleBtn.innerText = 'Start Bot';
            isRunning = false;
            return;
        }

        highlightAndClick(nextBtn);
        await waitMs(4000);
        await waitForPageLoad();
        await waitMs(2000);
        resetAndCollectNewPage();
    }

    // Just a helper to ensure the page has loaded
    async function waitForPageLoad() {
        return new Promise(resolve => {
            let checkCount = 0;
            function checkDone() {
                checkCount++;
                if (document.readyState === 'complete' || checkCount > 20) {
                    resolve();
                } else {
                    setTimeout(checkDone, 500);
                }
            }
            checkDone();
        });
    }

    function resetAndCollectNewPage() {
        setStatus('Collecting new page...');
        profileIndex = 0;
        processedThisPageCount = 0;
        collectProfilesOnPage();
        if (profileElements.length === 0) {
            toggleBtn.innerText = 'Start Bot';
            isRunning = false;
            return;
        }
        setTimeout(() => processNextProfile(), 1500);
    }

})();
