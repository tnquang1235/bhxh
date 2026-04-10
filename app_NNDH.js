/**
 * Hệ thống Tra cứu Danh mục Nghề NNDH - Core Logic
 * Tối ưu hiệu suất cho tập dữ liệu lớn
 */

let activeData = [];
let expiredData = [];
let filteredData = [];
let currentStatus = 'active'; // active, expired, all
let itemsToShow = 50;
let currentIndex = 0;
let isExpiredLoaded = false;

// DOM Elements
const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('searchInput');
const industryFilter = document.getElementById('industryFilter');
const rowCount = document.getElementById('rowCount');
const loadingSpinner = document.getElementById('loadingSpinner');
const currentViewLabel = document.getElementById('currentViewLabel');

/**
 * Khởi tạo ứng dựng
 */
async function init() {
    try {
        updateUIStatus("Đang tải dữ liệu hiệu lực...");
        const response = await fetch('data/active_NNDH.json');
        activeData = await response.json();

        // Khởi tạo danh sách ngành nghề từ dữ liệu hiệu lực
        populateIndustries(activeData);

        // Mặc định hiển thị dữ liệu đang hiệu lực
        setStatus('active');

        // Cài đặt Infinite Scroll
        setupInfiniteScroll();
    } catch (error) {
        console.error("Lỗi khởi tạo:", error);
        rowCount.textContent = "Lỗi tải dữ liệu. Hãy kiểm tra kết nối.";
    }
}

/**
 * Tải dữ liệu hết hiệu lực (chỉ khi cần)
 */
async function loadExpiredData() {
    if (isExpiredLoaded) return;

    loadingSpinner.classList.remove('hidden');
    updateUIStatus("Đang tải dữ liệu cũ...");

    try {
        const response = await fetch('data/expired_NNDH.json');
        expiredData = await response.json();
        isExpiredLoaded = true;

        // Cập nhật lại danh sách ngành nghề (bao gồm cả dữ liệu cũ)
        populateIndustries([...activeData, ...expiredData]);
    } catch (error) {
        console.error("Lỗi tải dữ liệu cũ:", error);
    } finally {
        loadingSpinner.classList.add('hidden');
    }
}

/**
 * Thiết lập trạng thái hiển thị
 */
async function setStatus(status) {
    currentStatus = status;

    // Cập nhật UI Buttons
    document.querySelectorAll('[id^="btn-"]').forEach(btn => {
        btn.classList.remove('bg-white', 'text-blue-600', 'shadow-sm');
        btn.classList.add('text-slate-600');
    });
    const activeBtn = document.getElementById(`btn-${status}`);
    activeBtn.classList.add('bg-white', 'text-blue-600', 'shadow-sm');
    activeBtn.classList.remove('text-slate-600');

    if (status === 'active') {
        currentViewLabel.textContent = "CHẾ ĐỘ: ĐANG HIỆU LỰC";
    } else if (status === 'expired') {
        currentViewLabel.textContent = "CHẾ ĐỘ: HẾT HIỆU LỰC";
        await loadExpiredData();
    } else {
        currentViewLabel.textContent = "CHẾ ĐỘ: TẤT CẢ";
        await loadExpiredData();
    }

    applyFilters();
}

/**
 * Lớp lọc dữ liệu chính
 */
function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedIndustry = industryFilter.value;

    let baseData = [];
    if (currentStatus === 'active') baseData = activeData;
    else if (currentStatus === 'expired') baseData = expiredData;
    else baseData = [...activeData, ...expiredData];

    filteredData = baseData.filter(item => {
        const matchesSearch = !searchTerm ||
            (item.name && item.name.toLowerCase().includes(searchTerm)) ||
            (item.desc && item.desc.toLowerCase().includes(searchTerm));

        const matchesIndustry = !selectedIndustry || item.industry === selectedIndustry;

        return matchesSearch && matchesIndustry;
    });

    // Reset view
    currentIndex = 0;
    tableBody.innerHTML = '';
    renderMore();

    rowCount.textContent = `Hiển thị ${filteredData.length} kết quả`;
}

/**
 * Render dữ liệu theo lô (Batch Rendering)
 */
function renderMore() {
    const fragment = document.createDocumentFragment();
    const nextBatch = filteredData.slice(currentIndex, currentIndex + itemsToShow);

    nextBatch.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 transition-colors";

        const typeClass = item.type === "Loại IV" ? "tag-loai-iv" :
            (item.type === "Loại V" ? "tag-loai-v" : "tag-loai-vi");

        const isExpired = (item.source || '').toLowerCase().includes('hết hiệu lực') ||
            (item.source || '').toLowerCase().includes('hết hạn');

        tr.innerHTML = `
            <td class="px-4 py-4 text-center font-mono text-slate-400 border-r border-slate-50">${currentIndex + index + 1}</td>
            <td class="px-6 py-4">
                <div class="font-semibold text-slate-800">${item.name || ''}</div>
                <div class="text-[10px] mt-1 text-slate-400 uppercase tracking-tight">${item.industry || ''}</div>
            </td>
            <td class="px-6 py-4 text-xs text-slate-600 leading-relaxed">${item.desc || ''}</td>
            <td class="px-4 py-4 text-center">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${typeClass}">
                    ${item.type || 'N/A'}
                </span>
            </td>
            <td class="px-4 py-4">
                <div class="text-[11px] font-medium ${isExpired ? 'text-red-400' : 'text-blue-500'}">
                    ${item.source || ''}
                </div>
                ${item.note ? `<div class="text-[10px] text-slate-400 italic mt-1">${item.note}</div>` : ''}
            </td>
        `;
        fragment.appendChild(tr);
    });

    tableBody.appendChild(fragment);
    currentIndex += itemsToShow;
}

/**
 * Tự động đổ dữ liệu vào Filter ngành nghề
 */
function populateIndustries(data) {
    const industries = [...new Set(data.filter(i => i.industry).map(i => i.industry))].sort();
    const currentVal = industryFilter.value;

    industryFilter.innerHTML = '<option value="">Tất cả ngành nghề</option>';
    industries.forEach(ind => {
        const opt = document.createElement('option');
        opt.value = ind;
        opt.textContent = ind;
        industryFilter.appendChild(opt);
    });

    industryFilter.value = currentVal;
}

/**
 * Infinite Scroll logic
 */
function setupInfiniteScroll() {
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && currentIndex < filteredData.length) {
            renderMore();
        }
    }, { threshold: 0.1 });

    observer.observe(document.getElementById('loadMoreTarget'));
}

/**
 * Debounce search - Tránh xử lý quá nhiều khi gõ phím
 */
let debounceTimer;
searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(applyFilters, 300);
});

industryFilter.addEventListener('change', applyFilters);

function updateUIStatus(text) {
    rowCount.textContent = text;
}

// Bắt đầu
init();
