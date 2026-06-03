// ДЕФОЛТТУК МААЛЫМАТТАР
const defaultAds = [
    { id: 101, name: "Азамат", phone: "+996700112233", brand: "Toyota Camry", number: "01KG777AAZ", from: "Кара-Көл", to: "Бишкек", time: "2026-06-15T08:30", price: "1200", seats: "4", description: "Багаж бар, кондиционер иштейт, жолуңуз байсалдуу болсун.", type: "professional", driverAge: "34", hasLicense: true, photo: "" },
    { id: 102, name: "Бакыт", phone: "+996555443322", brand: "Honda Stepwgn", number: "04KG221ABC", from: "Бишкек", to: "Ош", time: "2026-06-16T20:00", price: "1500", seats: "6", description: "Түнкү рейс, арткы орундуктар бош, кенен жүк салынат.", type: "casual", driverAge: "29", hasLicense: true, photo: "" }
];

const defaultReviews = [
    { driverPhone: "+996700112233", reviewerName: "Нурбек", rating: 5, text: "Абдан жакшы айдоочу экен, машина таза, тез жеткирди!", date: "2026-05-28" },
    { driverPhone: "+996700112233", reviewerName: "Айсулуу", rating: 4, text: "Баары жакты, болгону бир аз кечигип чыктык.", date: "2026-05-30" }
];

// LOCALSTORAGE МЕНЕН ИШТӨӨ
let ads = JSON.parse(localStorage.getItem('sapardash_ads')) || defaultAds;
let users = JSON.parse(localStorage.getItem('sapardash_users')) || [];
let currentUser = JSON.parse(localStorage.getItem('sapardash_current_user')) || null;
let reviews = JSON.parse(localStorage.getItem('sapardash_reviews')) || defaultReviews;

let map;
let tempImages = { car: "", license: "", patent: "" };
let activeCameraTarget = ""; 
let videoStream = null;
let activeDriverPhoneForReview = ""; 

// КАРТА ИНИЦИАЛИЗАЦИЯСЫ
function initMap() {
    if (document.getElementById('map')) {
        map = L.map('map').setView([41.2044, 74.7661], 6); 
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(map);
    }
}

// БАШКЫ ТАБДАРДЫ АЛМАШТЫРУУ (ЖҮРГҮНЧҮ / АЙДООЧУ)
function switchTab(tab) {
    const passengerSec = document.getElementById('passenger-section');
    const driverSec = document.getElementById('driver-section');
    const btnPass = document.getElementById('btn-passenger-tab');
    const btnDrive = document.getElementById('btn-driver-tab');

    if (tab === 'passenger') {
        passengerSec.classList.remove('hidden');
        driverSec.classList.add('hidden');
        btnPass.className = "px-4 py-2 rounded-lg text-sm font-semibold bg-white text-blue-600 shadow transition-all duration-300";
        btnDrive.className = "px-4 py-2 rounded-lg text-sm font-semibold text-white hover:bg-white/10 transition-all duration-300";
    } else {
        if (!currentUser || currentUser.role === 'passenger') {
            alert("Жарыя кошуу үчүн Айдоочу болуп катталышыңыз керек!");
            openAuthModal('register');
            return;
        }
        passengerSec.classList.add('hidden');
        driverSec.classList.remove('hidden');
        btnDrive.className = "px-4 py-2 rounded-lg text-sm font-semibold bg-white text-blue-600 shadow transition-all duration-300";
        btnPass.className = "px-4 py-2 rounded-lg text-sm font-semibold text-white hover:bg-white/10 transition-all duration-300";
        document.getElementById('driver-profile-notice').textContent = `Профиль: ${currentUser.name} (${currentUser.role === 'professional_driver' ? 'Проф Такси' : 'Жөнөкөй айдоочу'}, Жашы: ${currentUser.age || '—'})`;
    }
}

// КИРҮҮ / КАТТАЛУУ ТАБДАРЫН АЛМАШТЫРУУ
function switchAuthTab(mode) {
    const loginForm = document.getElementById('auth-login-form');
    const regForm = document.getElementById('auth-register-form');
    const loginTab = document.getElementById('btn-auth-login-tab');
    const regTab = document.getElementById('btn-auth-reg-tab');

    if (mode === 'login') {
        loginForm.classList.remove('hidden');
        regForm.classList.add('hidden');
        loginTab.className = "flex-1 py-4 text-center font-bold text-sm border-b-2 border-blue-600 text-blue-600 transition-all duration-300";
        regTab.className = "flex-1 py-4 text-center font-bold text-sm text-slate-500 border-b-2 border-transparent transition-all duration-300";
    } else {
        loginForm.classList.add('hidden');
        regForm.classList.remove('hidden');
        regTab.className = "flex-1 py-4 text-center font-bold text-sm border-b-2 border-blue-600 text-blue-600 transition-all duration-300";
        loginTab.className = "flex-1 py-4 text-center font-bold text-sm text-slate-500 border-b-2 border-transparent transition-all duration-300";
    }
}

// РОЛГО ЖАРАША ТАЛАПТАРДЫ КӨРСӨТҮҮ
function toggleRoleFields() {
    const role = document.getElementById('reg-role').value;
    const divAge = document.getElementById('div-reg-age');
    const divDocs = document.getElementById('div-reg-docs');
    const divProfDoc = document.getElementById('div-reg-license-prof');

    if (role === 'passenger') {
        divAge.classList.add('hidden'); divDocs.classList.add('hidden');
    } else if (role === 'casual_driver') {
        divAge.classList.remove('hidden'); divDocs.classList.remove('hidden'); divProfDoc.classList.add('hidden');
    } else if (role === 'professional_driver') {
        divAge.classList.remove('hidden'); divDocs.classList.remove('hidden'); divProfDoc.classList.remove('hidden');
    }
}

// СҮРӨТ ЖҮКТӨӨ (FILE READER)
function handleImageUpload(event, type) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        tempImages[type] = e.target.result;
        updateImageStatusUI(type);
    };
    reader.readAsDataURL(file);
}

// КАМЕРА АЧУУ
function openCameraModal(type) {
    activeCameraTarget = type;
    const modal = document.getElementById('camera-modal');
    const card = document.getElementById('camera-card-modal');
    
    modal.classList.remove('hidden');
    setTimeout(() => {
        card.style.transform = 'scale(1)';
        card.style.opacity = '1';
    }, 30);

    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then(stream => {
            videoStream = stream;
            document.getElementById('camera-video').srcObject = stream;
        })
        .catch(() => {
            alert("Камера ачылган жок же уруксат берилген эмес!");
            closeCameraModal();
        });
}

function closeCameraModal() {
    const card = document.getElementById('camera-card-modal');
    card.style.transform = 'scale(0.95)';
    card.style.opacity = '0';
    setTimeout(() => {
        document.getElementById('camera-modal').classList.add('hidden');
    }, 150);
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
}

function takeSnapshot() {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    
    tempImages[activeCameraTarget] = canvas.toDataURL('image/jpeg');
    updateImageStatusUI(activeCameraTarget);
    closeCameraModal();
}

function updateImageStatusUI(type) {
    if (type === 'car') document.getElementById('car-preview').classList.remove('hidden');
    if (type === 'license') {
        document.getElementById('preview-license').textContent = "✓ Жаңыртылды";
        document.getElementById('preview-license').className = "text-xs text-green-600 font-bold animate-fade-in";
    }
    if (type === 'patent') {
        document.getElementById('preview-patent').textContent = "✓ Жаңыртылды";
        document.getElementById('preview-patent').className = "text-xs text-green-600 font-bold animate-fade-in";
    }
}

// КАТТАЛУУНУ ИШКЕ АШЫРУУ
function handleRegister() {
    const role = document.getElementById('reg-role').value;
    const name = document.getElementById('reg-name').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const age = document.getElementById('reg-age').value.trim();
    const password = document.getElementById('reg-password').value.trim();

    if (!name || !phone || !password) { alert("Сураныч, негизги талааларды толтуруңуз!"); return; }
    if (role !== 'passenger' && !age) { alert("Сураныч, жашыңызды жазыңыз!"); return; }
    if (role !== 'passenger' && !tempImages['license']) { alert("Айдоочулук күбөлүктүн сүрөтүн тиркеңиз!"); return; }
    if (role === 'professional_driver' && !tempImages['patent']) { alert("Лицензия/Патент сүрөтүн тиркеңиз!"); return; }

    const newUser = { role, name, phone, age, password, licenseImg: tempImages['license'], patentImg: tempImages['patent'] };
    users.push(newUser);
    localStorage.setItem('sapardash_users', JSON.stringify(users));

    currentUser = newUser;
    localStorage.setItem('sapardash_current_user', JSON.stringify(currentUser));

    alert("Каттоо ийгиликтүү бүттү!");
    closeAuthModal();
    updateAuthUI();
}

// КИРҮҮНҮ ИШКЕ АШЫРУУ
function handleLogin() {
    const phone = document.getElementById('login-phone').value.trim();
    const password = document.getElementById('login-password').value.trim();
    
    const found = users.find(u => u.phone === phone && u.password === password);
    if (found) {
        currentUser = found;
        localStorage.setItem('sapardash_current_user', JSON.stringify(currentUser));
        alert("Кош келиңиз!");
        closeAuthModal();
        updateAuthUI();
    } else {
        alert("Логин же сыр сөз ката!");
    }
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('sapardash_current_user');
    updateAuthUI();
    switchTab('passenger');
}

function updateAuthUI() {
    const container = document.getElementById('auth-status');
    if (!container) return;
    if (currentUser) {
        let rTxt = currentUser.role === 'passenger' ? 'Кардар' : (currentUser.role === 'professional_driver' ? 'Проф Айдоочу' : 'Попутка');
        container.innerHTML = `
            <span class="font-bold text-blue-100">👋 ${currentUser.name} (${rTxt})</span>
            <button onclick="handleLogout()" class="bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-lg text-xs font-semibold ml-1 transition transform active:scale-95">Чыгуу</button>
        `;
    } else {
        container.innerHTML = `
            <button onclick="openAuthModal('login')" class="bg-white/10 hover:bg-white text-white hover:text-blue-600 px-4 py-2 rounded-xl text-xs font-bold transition duration-300 border border-white/20 shadow-sm">Кирүү / Катталуу</button>
        `;
    }
}

function openAuthModal(mode) {
    const modal = document.getElementById('auth-modal');
    const card = document.getElementById('auth-card-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        card.style.transform = 'scale(1)';
        card.style.opacity = '1';
    }, 30);
    switchAuthTab(mode);
    toggleRoleFields();
}

function closeAuthModal() {
    const card = document.getElementById('auth-card-modal');
    card.style.transform = 'scale(0.95)';
    card.style.opacity = '0';
    setTimeout(() => {
        document.getElementById('auth-modal').classList.add('hidden');
    }, 150);
}

// ЖАҢЫ ЖАРЫЯ САКТОО
function saveForm(event) {
    event.preventDefault();
    const type = currentUser.role === 'professional_driver' ? 'professional' : 'casual';
    
    const newAd = {
        id: Date.now(),
        name: currentUser.name,
        phone: currentUser.phone,
        driverAge: currentUser.age,
        hasLicense: !!currentUser.licenseImg,
        brand: document.getElementById('car-brand').value,
        number: document.getElementById('car-number').value.toUpperCase(),
        from: document.getElementById('trip-from').value,
        to: document.getElementById('trip-to').value,
        time: document.getElementById('trip-time').value,
        price: document.getElementById('trip-price').value,
        seats: document.getElementById('car-seats').value,
        description: document.getElementById('trip-description').value,
        type: type,
        photo: tempImages['car']
    };

    ads.unshift(newAd);
    localStorage.setItem('sapardash_ads', JSON.stringify(ads));

    document.getElementById('taxi-form').reset();
    tempImages['car'] = "";
    document.getElementById('car-preview').classList.add('hidden');

    alert("Жарыяңыз ийгиликтүү жайгаштырылды!");
    switchTab('passenger');
    renderAds();
}

// ИЗДӨӨ ЖАНА ФИЛЬТР
function searchTrips() {
    const fromVal = document.getElementById('search-from').value.toLowerCase().trim();
    const toVal = document.getElementById('search-to').value.toLowerCase().trim();
    const typeVal = document.getElementById('filter-type').value;

    const filtered = ads.filter(ad => {
        const matchFrom = ad.from.toLowerCase().includes(fromVal);
        const matchTo = ad.to.toLowerCase().includes(toVal);
        const matchType = (typeVal === 'all' || ad.type === typeVal);
        return matchFrom && matchTo && matchType;
    });

    renderAds(filtered);
}

// ЖАРЫЯЛАРДЫ ЭКРАНГА ЧЫГАРУУ
function renderAds(filteredAds = ads) {
    const container = document.getElementById('ads-container');
    if (!container) return;
    container.innerHTML = '';
    document.getElementById('ads-count').textContent = `${filteredAds.length} жарыя`;

    if (filteredAds.length === 0) {
        container.innerHTML = `<div class="col-span-2 text-center py-12 text-slate-400 animate-fade-in">Учурда мындай багыт боюнча каттамдар табылган жок 😕</div>`;
        return;
    }

    filteredAds.forEach((ad, index) => {
        const driverReviews = reviews.filter(r => r.driverPhone === ad.phone);
        const reviewCount = driverReviews.length;
        const avgRating = reviewCount > 0 ? (driverReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(1) : "0.0";
        const isProf = ad.type === 'professional';
        
        // Кезек менен чыгуу эффектиси үчүн кечигүү (delay)
        const delay = index * 80;

        container.innerHTML += `
            <div class="bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition duration-300 animate-fade-in-up" style="animation-delay: ${delay}ms">
                <div class="relative h-44 bg-slate-100 overflow-hidden group">
                    <img src="${ad.photo || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=500'}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
                    <span class="absolute top-2 left-2 text-[10px] font-bold px-2 py-1 rounded-xl bg-white/95 backdrop-blur-sm border shadow-sm ${isProf ? 'text-amber-600' : 'text-blue-600'}">
                        ${isProf ? '⭐ Профессионал Такси' : '🚗 Жөнөкөй Попутка'}
                    </span>
                </div>
                <div class="p-5 space-y-3">
                    <div class="flex justify-between items-center">
                        <h3 class="font-bold text-slate-900 text-base">${ad.from} ➔ ${ad.to}</h3>
                        <span class="font-black text-blue-600 text-lg">${ad.price} сом</span>
                    </div>
                    
                    <div class="text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1 hover:bg-blue-50/40 transition">
                        <p class="font-bold text-slate-700 flex justify-between items-center">
                            <span>👤 ${ad.name} ${ad.driverAge ? `(${ad.driverAge} жашта)` : ''}</span>
                            <button onclick="openReviewsModal('${ad.phone}', '${ad.name}')" class="text-blue-600 underline font-semibold hover:text-indigo-600 transition">
                                ⭐ ${avgRating} (${reviewCount} отзыв)
                            </button>
                        </p>
                        <p class="text-[11px] text-slate-500">
                            📜 Документ: <span class="text-green-600 font-bold">✓ Тастыкталган</span> 
                            ${isProf ? ' | <span class="text-amber-600 font-bold">⭐ Лицензия бар</span>' : ''}
                        </p>
                    </div>

                    ${ad.description ? `<p class="text-xs italic text-slate-600 bg-slate-50 p-2 rounded-lg border-l-2 border-blue-500">"${ad.description}"</p>` : ''}
                    
                    <div class="text-xs text-slate-500 flex justify-between pt-1">
                        <span>🪑 Бош орун: <span class="font-bold text-slate-800">${ad.seats}</span></span> 
                        <span>🚘 ${ad.brand} <span class="bg-slate-100 px-1.5 py-0.5 rounded font-mono border text-[10px]">${ad.number}</span></span>
                    </div>

                    <a href="tel:${ad.phone}" class="w-full text-center bg-blue-600 hover:bg-indigo-600 text-white block py-2.5 rounded-xl font-bold text-sm transition duration-300 transform active:scale-95 shadow hover:shadow-lg">
                        📞 Чалуу: ${ad.phone}
                    </a>
                </div>
            </div>
        `;
    });
}

// ОТЗЫВ МОДАЛЫН АЧУУ
function openReviewsModal(phone, name) {
    activeDriverPhoneForReview = phone;
    document.getElementById('reviews-title-name').textContent = `${name} — Айдоочунун профили`;
    
    const modal = document.getElementById('reviews-modal');
    const card = document.getElementById('reviews-card-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        card.style.transform = 'scale(1)';
        card.style.opacity = '1';
    }, 30);

    renderReviewsList();
}

function closeReviewsModal() {
    const card = document.getElementById('reviews-card-modal');
    card.style.transform = 'scale(0.95)';
    card.style.opacity = '0';
    setTimeout(() => {
        document.getElementById('reviews-modal').classList.add('hidden');
    }, 150);
}

function renderReviewsList() {
    const container = document.getElementById('reviews-list-container');
    if (!container) return;
    container.innerHTML = "";

    const filtered = reviews.filter(r => r.driverPhone === activeDriverPhoneForReview);
    document.getElementById('reviews-title-stats').textContent = `Жалпы пикирлердин саны: ${filtered.length}`;

    if (filtered.length === 0) {
        container.innerHTML = `<p class="text-center py-6 text-sm text-slate-400 animate-fade-in">Бул айдоочуга азырынча пикир калтырыла элек. Биринчи болуп жазыңыз!</p>`;
        return;
    }

    filtered.forEach((r, idx) => {
        let stars = "";
        for(let i=1; i<=5; i++) {
            stars += `<i class="fa-solid fa-star ${i <= r.rating ? 'text-amber-400' : 'text-slate-200'}"></i>`;
        }

        container.innerHTML += `
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1 animate-fade-in" style="animation-delay: ${idx * 50}ms">
                <div class="flex justify-between items-center">
                    <span class="font-bold text-slate-800">${r.reviewerName}</span>
                    <span class="text-[10px] text-slate-400">${r.date}</span>
                </div>
                <div class="flex text-amber-400 text-[10px]">${stars}</div>
                <p class="text-slate-600 mt-1">${r.text}</p>
            </div>
        `;
    });
}

// РЕЙТИНГ ЖУЛДУЗДАРЫН ТАНДОО
function setRatingValue(val) {
    document.getElementById('new-rating-value').value = val;
    const stars = document.querySelectorAll('#rating-stars-input i');
    stars.forEach((star, index) => {
        if (index < val) {
            star.className = "fa-solid fa-star cursor-pointer text-amber-400 transition transform hover:scale-125";
        } else {
            star.className = "fa-solid fa-star cursor-pointer text-slate-200 transition transform hover:scale-125";
        }
    });
}

// ЖАҢЫ ПИКИР КОШУУ
function submitReview() {
    if (!currentUser) {
        alert("Отзыв калтыруу үчүн алгач катталыңыз же системага кириңиз!");
        openAuthModal('register');
        return;
    }

    const text = document.getElementById('new-review-text').value.trim();
    const rating = parseInt(document.getElementById('new-rating-value').value);

    if (!text) {
        alert("Сураныч, пикириңизди жазыңыз!");
        return;
    }

    const today = new Date().toISOString().split('T')[0];

    const newRev = {
        driverPhone: activeDriverPhoneForReview,
        reviewerName: currentUser.name,
        rating: rating,
        text: text,
        date: today
    };

    reviews.push(newRev);
    localStorage.setItem('sapardash_reviews', JSON.stringify(reviews));

    document.getElementById('new-review-text').value = "";
    setRatingValue(5);

    alert("Пикириңиз ийгиликтүү кабыл алынды!");
    renderReviewsList();
    renderAds(); 
}

// ТИРКЕМЕ ЖҮКТӨЛГӨНДӨ БАШТАЛУУЧУ ФУНКЦИЯЛАР
window.onload = function() {
    initMap();
    updateAuthUI();
    renderAds();
};