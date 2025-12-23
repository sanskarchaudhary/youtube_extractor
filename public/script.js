function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');

    toastMessage.textContent = message;
    toast.className = `toast ${type} show`;
    
    if (type === 'error') {
        toastIcon.className = 'fas fa-exclamation-circle';
        toastIcon.style.color = '#ef4444';
    } else {
        toastIcon.className = 'fas fa-check-circle';
        toastIcon.style.color = '#10b981';
    }

    setTimeout(() => {
        toast.className = toast.className.replace('show', '');
    }, 3000);
}

let videoData = null;
let channelData = null;

async function fetchData(url, type) {
    if (!url) {
        showToast('Please enter a valid URL', 'error');
        return;
    }

    // Reset description check state
    const desc = document.getElementById('videoDescription');
    if (desc) {
        desc.classList.remove('expanded');
        const toggleBtn = document.getElementById('toggleDescBtn');
        if (toggleBtn) toggleBtn.innerText = 'Show More';
    }

    const btn = document.getElementById(`${type}Btn`);
    const spinner = document.getElementById(`${type}Spinner`);
    const btnText = document.getElementById(`${type}BtnText`);
    const resultDiv = document.getElementById(`${type}Result`);
    const downloadBtn = document.getElementById(`${type}Download`);

    // Loading State
    btn.disabled = true;
    spinner.style.display = 'block';
    btnText.textContent = 'Extracting...';
    resultDiv.style.display = 'none';
    downloadBtn.style.display = 'none';

    try {
        const endpoint = type === 'video' ? '/api/video' : '/api/channel';
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        
        if (!res.ok) throw new Error('Extraction failed');

        const data = await res.json();
        
        if (type === 'video') {
            videoData = data;
            console.log('Video Data Received:', data); // DEBUG
            console.log('Channel Data within Video:', data.channel); // DEBUG
            resultDiv.innerHTML = renderVideoResult(data);
        } else {
            channelData = data;
            resultDiv.innerHTML = renderChannelResult(data);
        }

        // Display Result
        resultDiv.style.display = 'block';
        downloadBtn.style.display = 'flex';
        showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} data extracted successfully!`, 'success');

    } catch (err) {
        console.error(err);
        showToast(`Failed to extract ${type} data`, 'error');
    } finally {
        // Reset State
        btn.disabled = false;
        spinner.style.display = 'none';
        btnText.textContent = 'Extract Info';
    }
}

function renderVideoResult(data) {
    const tags = data.hiddenTags ? data.hiddenTags.split(',').filter(t => t.trim()) : [];
    const channel = data.channel || {};

    return `
        <div class="result-card">
            ${data.thumbnail ? `<img src="${data.thumbnail}" alt="${data.title}" class="video-thumbnail">` : ''}
            <div class="result-content">
                <div class="header-actions" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                    <div class="result-title" style="margin-bottom: 0;">${data.title || 'No Title'}</div>
                    <a href="${data.videoUrl}" target="_blank" class="action-btn icon-only" title="Open Video">
                        <i class="fas fa-external-link-alt"></i>
                    </a>
                </div>
                <div class="result-description" id="videoDescription">
                    ${data.description}
                </div>
                ${data.description && data.description.length > 150 ? `
                <button onclick="toggleDescription()" class="toggle-desc-btn" id="toggleDescBtn">
                    Show More
                </button>` : ''}
                
                <div class="result-meta-grid">
                    <div class="meta-item">
                        <div class="meta-label"><i class="fas fa-filter"></i> Category</div>
                        <div class="meta-value">${data.category}</div>
                    </div>
                    <div class="meta-item">
                        <div class="meta-label"><i class="far fa-clock"></i> Uploaded (BS)</div>
                        <div class="meta-value">${data.uploadedNepaliTime}</div>
                    </div>
                </div>

                ${tags.length > 0 ? `
                <div class="tags-section">
                    <div class="tags-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <div class="meta-label"><i class="fas fa-tags"></i> Hidden Tags</div>
                        <button onclick="copyToClipboard('${tags.join(', ')}')" class="action-btn small">
                            <i class="fas fa-copy"></i> Copy Tags
                        </button>
                    </div>
                    <div class="tags-container">
                        ${tags.map(tag => `<span class="tag">${tag.trim()}</span>`).join('')}
                    </div>
                </div>
                ` : ''}

                ${channel.channelName ? `
                <div class="channel-section" style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--glass-border);">
                     <div class="header-actions" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3 style="font-size: 1.1rem; color: var(--text-primary);"><i class="fas fa-user-circle"></i> Channel Details</h3>
                        ${channel.url ? `
                        <a href="${channel.url}" target="_blank" class="action-btn small">
                            Visit Channel <i class="fas fa-arrow-right"></i>
                        </a>
                        <button onclick="analyzeChannel('${channel.url}')" class="action-btn small" style="margin-left: 0.5rem;">
                            <i class="fas fa-search"></i> Analyze Channel
                        </button>` : ''}
                    </div>
                    
                    <div class="result-meta-grid">
                        <div class="meta-item">
                            <div class="meta-label">Name</div>
                            <div class="meta-value">${channel.channelName}</div>
                        </div>
                        <div class="meta-item">
                            <div class="meta-label">Subscribers</div>
                            <div class="meta-value">${channel.subscriberCount}</div>
                        </div>
                        <div class="meta-item">
                            <div class="meta-label">Total Videos</div>
                            <div class="meta-value">${channel.totalVideos}</div>
                        </div>
                        <div class="meta-item">
                            <div class="meta-label">Category</div>
                            <div class="meta-value">${channel.category || 'N/A'}</div>
                        </div>
                    </div>
                    
                    ${channel.hiddenTags ? `
                    <div class="tags-section" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed var(--glass-border);">
                         <div class="tags-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <div class="meta-label"><i class="fas fa-tags"></i> Channel Tags</div>
                            <button onclick="copyToClipboard('${channel.hiddenTags.replace(/'/g, "\\'")}')" class="action-btn small">
                                <i class="fas fa-copy"></i> Copy
                            </button>
                        </div>
                        <div class="tags-container">
                            ${channel.hiddenTags.split(',').map(tag => `<span class="tag" style="background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.2);">${tag.trim()}</span>`).join('')}
                        </div>
                    </div>
                    ` : ''}

                </div>
                ` : ''}
            </div>
        </div>
    `;
}

function renderChannelResult(data) {
    const tags = data.hiddenTags ? data.hiddenTags.split(',').filter(t => t.trim()) : [];

    return `
        <div class="result-card">
            <div class="result-content">
                <div class="result-title">${data.channelName || 'No Name'}</div>
                
                <div class="result-meta-grid">
                    <div class="meta-item">
                        <div class="meta-label"><i class="fas fa-users"></i> Subscribers</div>
                        <div class="meta-value">${data.subscriberCount}</div>
                    </div>
                    <div class="meta-item">
                        <div class="meta-label"><i class="fas fa-video"></i> Total Videos</div>
                        <div class="meta-value">${data.totalVideos}</div>
                    </div>
                    <div class="meta-item">
                        <div class="meta-label"><i class="fas fa-filter"></i> Category</div>
                        <div class="meta-value">${data.category || 'N/A'}</div>
                    </div>
                     <div class="meta-item">
                        <div class="meta-label"><i class="far fa-clock"></i> Created (BS)</div>
                        <div class="meta-value">${data.creationDate}</div>
                    </div>
                     <div class="meta-item">
                        <div class="meta-label"><i class="fas fa-chart-line"></i> Engagement (Week)</div>
                        <div class="meta-value">${data.lastWeekEngagement}</div>
                    </div>
                </div>

                ${tags.length > 0 ? `
                <div class="tags-section">
                     <div class="tags-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <div class="meta-label"><i class="fas fa-tags"></i> Hidden Tags</div>
                        <button onclick="copyToClipboard('${tags.join(', ')}')" class="action-btn small">
                            <i class="fas fa-copy"></i> Copy Tags
                        </button>
                    </div>
                    <div class="tags-container">
                        ${tags.map(tag => `<span class="tag">${tag.trim()}</span>`).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
    `;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Tags copied to clipboard!', 'success');
    }).catch(err => {
        showToast('Failed to copy tags', 'error');
    });
}

function analyzeChannel(url) {
    const channelInput = document.getElementById('channelUrl');
    const channelBtn = document.getElementById('channelBtn');
    
    // Set URL
    channelInput.value = url;
    
    // Scroll to channel section
    channelInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Highlight input briefly
    channelInput.style.borderColor = 'var(--primary-color)';
    setTimeout(() => {
        channelInput.style.borderColor = 'var(--glass-border)';
    }, 1000);

    // Trigger extraction
    setTimeout(() => {
        channelBtn.click();
    }, 500);
}

function toggleDescription() {
    const desc = document.getElementById('videoDescription');
    const btn = document.getElementById('toggleDescBtn');
    
    desc.classList.toggle('expanded');
    
    if (desc.classList.contains('expanded')) {
        btn.innerText = 'Show Less';
    } else {
        btn.innerText = 'Show More';
    }
}

async function downloadExcel(type) {
    const data = type === 'video' ? videoData : channelData;
    if (!data) return;

    try {
        const res = await fetch('/api/download-excel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, data })
        });
        
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_data.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast('Download started', 'success');
    } catch (err) {
        console.error(err);
        showToast('Error downloading Excel', 'error');
    }
}

// Event Listeners
document.getElementById('videoBtn').addEventListener('click', () => {
    const url = document.getElementById('videoUrl').value;
    fetchData(url, 'video');
});

document.getElementById('channelBtn').addEventListener('click', () => {
    const url = document.getElementById('channelUrl').value;
    fetchData(url, 'channel');
});

document.getElementById('videoDownload').addEventListener('click', () => downloadExcel('video'));
document.getElementById('channelDownload').addEventListener('click', () => downloadExcel('channel'));
