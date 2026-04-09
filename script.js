let fileData = {};
let currentView = 'grid';
let baseUrl = window.location.origin;
let selectedCategories = new Set(['images', 'gifs', 'videos', 'audio']);
let searchQuery = '';

const categoryConfig = {
    images: { title: 'Images', icon: 'fa-image', color: 'green', extensions: ['png', 'jpg', 'jpeg', 'webp'] },
    gifs: { title: 'GIFs', icon: 'fa-film', color: 'purple', extensions: ['gif'] },
    videos: { title: 'Videos', icon: 'fa-video', color: 'red', extensions: ['mp4', 'webm', 'mov', 'avi'] },
    audio: { title: 'Audio', icon: 'fa-music', color: 'yellow', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac'] }
};

async function loadFilesFromServer() {
    try {
        const response = await fetch(`${baseUrl}/assets/`);
        const html = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const links = doc.querySelectorAll('a');
        
        const files = Array.from(links)
            .map(link => link.href)
            .filter(href => !href.endsWith('/') && !href.includes('..'))
            .map(href => {
                const name = decodeURIComponent(href.split('/').pop());
                return { name, size: 0 };
            });
        
        if (files.length > 0) {
            organizeFilesByCategory(files);
            renderCategories();
            updateStats();
        }
    } catch (error) {
        console.error('Error loading files:', error);
    }
}

function organizeFilesByCategory(files) {
    fileData = {
        images: { ...categoryConfig.images, files: [] },
        gifs: { ...categoryConfig.gifs, files: [] },
        videos: { ...categoryConfig.videos, files: [] },
        audio: { ...categoryConfig.audio, files: [] }
    };

    files.forEach(file => {
        const ext = file.name.split('.').pop().toLowerCase();
        let category = null;

        Object.keys(categoryConfig).forEach(key => {
            if (categoryConfig[key].extensions.includes(ext)) {
                category = key;
            }
        });

        if (category && fileData[category]) {
            fileData[category].files.push({
                name: file.name,
                size: formatFileSize(file.size),
                category: ext
            });
        }
    });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function init() {
    loadFilesFromServer();
    setupSearch();
    setupCategoryFilters();
}

function setupCategoryFilters() {
    const filterCards = document.querySelectorAll('.filter-card');
    
    filterCards.forEach((card, index) => {
        const categoryKey = card.getAttribute('data-category');
        
        if (categoryKey && categoryKey !== 'total') {
            updateCategoryBoxVisual(card, selectedCategories.has(categoryKey));
            
            card.addEventListener('click', () => toggleCategory(categoryKey, card));
        }
    });
}

function toggleCategory(categoryKey, boxElement) {
    if (selectedCategories.has(categoryKey)) {
        selectedCategories.delete(categoryKey);
    } else {
        selectedCategories.add(categoryKey);
    }
    
    updateCategoryBoxVisual(boxElement, selectedCategories.has(categoryKey));
    filterFiles();
}

function updateCategoryBoxVisual(cardElement, isSelected) {
    if (isSelected) {
        cardElement.classList.add('selected');
    } else {
        cardElement.classList.remove('selected');
    }
}

function renderCategories() {
    const container = document.getElementById('categoriesContainer');
    container.innerHTML = '';

    Object.keys(fileData).forEach(categoryKey => {
        if (selectedCategories.has(categoryKey)) {
            const category = fileData[categoryKey];
            const filteredFiles = filterFilesInCategory(category.files);
            
            if (filteredFiles.length > 0) {
                const categorySection = document.createElement('div');
                categorySection.className = 'category-section';
                categorySection.innerHTML = `
                    <div class="mb-6">
                        <h2 class="text-2xl font-bold mb-2 text-gray-200">
                            ${category.title} (${filteredFiles.length})
                        </h2>
                        <div class="border-b border-gray-700/30 mb-4"></div>
                    </div>
                    <div id="${categoryKey}-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        ${filteredFiles.map(file => createFileCard(file, categoryKey)).join('')}
                    </div>
                `;
                container.appendChild(categorySection);
            }
        }
    });
}

function createCategorySection(categoryKey, category) {
    const section = document.createElement('div');
    section.className = 'category-section mb-8';
    section.innerHTML = `
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-2xl font-bold flex items-center space-x-2">
                <i class="fas ${category.icon} text-gray-400"></i>
                <span>${category.title}</span>
                <span class="text-sm text-gray-500">(${category.files.length} files)</span>
            </h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" id="${categoryKey}-grid">
            ${category.files.map(file => createFileCard(file, categoryKey)).join('')}
        </div>
    `;
    return section;
}

function getFileUrl(filename) {
    return `//media.playfairs.cc/assets/${encodeURIComponent(filename)}`;
}

function getCopyUrl(filename) {
    if (baseUrl.includes('localhost')) {
        return `${baseUrl}/assets/${encodeURIComponent(filename)}`;
    }
    return `https://media.playfairs.cc/assets/${encodeURIComponent(filename)}`;
}

function createFileCard(file, categoryKey) {
    const fileUrl = getFileUrl(file.name);

    return `
        <div class="file-card bg-gray-800 rounded-lg border border-gray-700 overflow-hidden hover:bg-gray-750">
            <div class="p-4">
                <h3 class="font-semibold text-sm mb-3 truncate" title="${file.name}">${file.name}</h3>
                <div class="flex gap-2">
                    <button class="previewBtn flex-1 px-3 py-2 bg-blue-700 hover:bg-blue-600 rounded text-xs transition" data-url="${fileUrl}" data-category="${categoryKey}" data-filename="${file.name}">
                        <i class="fas fa-eye mr-1"></i> Preview
                    </button>
                    <button onclick="copyDynamicUrl('${file.name.replace(/'/g, "\\'")}')" class="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs transition">
                        <i class="fas fa-copy mr-1"></i> Copy
                    </button>
                    <button onclick="downloadDynamicFile('${file.name.replace(/'/g, "\\'")}')" class="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs transition">
                        <i class="fas fa-download mr-1"></i> Download
                    </button>
                </div>
            </div>
        </div>
    `;
}

function updateStats() {
    let totalFiles = 0;
    let imageCount = 0;
    let videoCount = 0;
    let audioCount = 0;
    
    Object.keys(fileData).forEach(categoryKey => {
        const category = fileData[categoryKey];
        const filteredFiles = filterFilesInCategory(category.files);
        
        if (selectedCategories.has(categoryKey)) {
            totalFiles += filteredFiles.length;
        }
        
        if (categoryKey === 'images') imageCount = filteredFiles.length;
        else if (categoryKey === 'videos') videoCount = filteredFiles.length;
        else if (categoryKey === 'audio') audioCount = filteredFiles.length;
    });

    document.getElementById('totalFiles').textContent = totalFiles;
    document.getElementById('imageCount').textContent = imageCount;
    document.getElementById('videoCount').textContent = videoCount;
    document.getElementById('audioCount').textContent = audioCount;
}

function filterFilesInCategory(files) {
    if (!searchQuery) return files;
    
    return files.filter(file => 
        file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
}

function copyUrl(url) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(() => {
            showToast('URL copied to clipboard!');
        }).catch(err => {
            fallbackCopyToClipboard(url);
        });
    } else {
        fallbackCopyToClipboard(url);
    }
}

function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showToast('URL copied to clipboard!');
    } catch (err) {
        showToast('Failed to copy URL');
    }
    
    document.body.removeChild(textArea);
}

function downloadFile(url, filename) {
    fetch(url)
        .then(response => response.blob())
        .then(blob => {
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);
            showToast('Download started!');
        })
        .catch(error => {
            console.error('Download failed:', error);
            showToast('Download failed');
        });
}

function copyDynamicUrl(filename) {
    const url = getCopyUrl(filename);
    copyUrl(url);
}

function downloadDynamicFile(filename) {
    const url = getFileUrl(filename);
    downloadFile(url, filename);
}

function openPreview(fileUrl, categoryKey, filename) {
    console.log('Opening preview:', { fileUrl, categoryKey, filename });
    
    const modal = document.createElement('div');
    modal.id = 'previewModal';
    modal.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4';
    modal.onclick = (e) => e.target === modal && closePreview();
    
    let content = '';
    if (categoryKey === 'images' || categoryKey === 'gifs') {
        content = `<img src="${fileUrl}" alt="${filename}" class="max-w-full max-h-[80vh] object-contain rounded-lg">`;
    } else if (categoryKey === 'videos') {
        content = `<video src="${fileUrl}" controls class="max-w-full max-h-[80vh] rounded-lg"></video>`;
    } else if (categoryKey === 'audio') {
        content = `<div class="bg-gray-900 rounded-lg p-8"><audio src="${fileUrl}" controls class="w-full"></audio></div>`;
    }
    
    modal.innerHTML = `
        <div class="relative max-w-4xl w-full">
            <button onclick="closePreview()" class="absolute -top-10 right-0 text-white text-2xl hover:text-gray-300">
                <i class="fas fa-times"></i>
            </button>
            ${content}
        </div>
    `;
    
    document.body.appendChild(modal);
    console.log('Modal appended to DOM');
}

function closePreview() {
    const modal = document.getElementById('previewModal');
    if (modal) modal.remove();
}

function checkFileExists(url) {
    fetch(url, { method: 'HEAD' })
        .then(response => {
            if (!response.ok) {
                console.warn(`File not accessible: ${url} (${response.status})`);
            }
        })
        .catch(error => {
            console.warn(`Error checking file: ${url}`, error);
        });
}

function debugFiles() {
    Object.keys(fileData).forEach(categoryKey => {
        fileData[categoryKey].files.forEach(file => {
            const url = `${baseUrl}/assets/${encodeURIComponent(file.name)}`;
            checkFileExists(url);
        });
    });
}

function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    toastMessage.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            filterFiles();
        });
    }
    
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.previewBtn');
        if (btn) {
            console.log('Preview button clicked:', btn.dataset);
            openPreview(btn.dataset.url, btn.dataset.category, btn.dataset.filename);
        }
    });
}

function filterFiles() {
    renderCategories();
    updateStats();
}

function toggleView() {
    currentView = 'grid';
    const icon = document.getElementById('viewIcon');
    if (icon) icon.className = 'fas fa-th';
    renderCategories();
}

document.addEventListener('DOMContentLoaded', () => {
    init();
});
