// ==================== إعدادات Firebase ====================
const firebaseConfig = {
    apiKey: "AIzaSyC_fQcf9PCrma1kGGq4BWh1JPfnP3zNrA0",
    authDomain: "khitmah-da90b.firebaseapp.com",
    projectId: "khitmah-da90b",
    storageBucket: "khitmah-da90b.firebasestorage.app",
    messagingSenderId: "515268042502",
    appId: "1:515268042502:web:5e663036c34e9a5dbc4887"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const messaging = firebase.messaging();

// ==================== المتغيرات العامة ====================
let currentUser = null;
let currentCircleId = null;
let currentMemberData = null;
let currentMemberId = null;
let isAdmin = false;
let pendingUserData = null;
let pendingCircleId = null;
let currentUserGender = null;
let idleTimer = null;
let juzChart = null;
let lastActivityTime = Date.now();
let weeklyChart = null;
let topUsersChart = null;
let retentionChart = null;
let circlesActivityChart = null;
let deferredPrompt = null;

// متغيرات الصوت المحسنة
let audio = new Audio();
let currentAudioQueue = [];
let currentAudioIndex = 0;
let currentPlayingJuz = null;
let isPlaying = false;
let totalAyahsInJuz = 0;

const ADMIN_EMAIL = "admin@khitmah.com";
const ADMIN_PASSWORD = "Admin@123456";
let MAX_CIRCLE_MEMBERS = 30;
let MAX_EXTRA_JUZ_PER_DAY = 1;
let MAX_ABSENCE_DAYS = 3; // عدد أيام الغياب قبل الطرد
let TOTAL_JUZ = 30;
const IDLE_TIMEOUT = 30 * 60 * 1000;
const CACHE_TTL = 5 * 60 * 1000;
const QURAN_API_BASE = 'https://api.alquran.cloud/v1';

// مصادر الصوت المتعددة للاحتياط
const AUDIO_SOURCES = [
    {
        name: 'everyayah',
        url: 'https://everyayah.com/data/Alafasy_128kbps',
        pattern: (surah, ayah) => `${surah.padStart(3, '0')}${ayah.padStart(3, '0')}.mp3`,
        type: 'ayah'
    },
    {
        name: 'qurancdn',
        url: 'https://media.qurancdn.com/audio/128/Alafasy',
        pattern: (surah, ayah) => `${surah}.mp3`,
        type: 'surah'
    },
    {
        name: 'mp3quran',
        url: 'https://server7.mp3quran.net/afs',
        pattern: (surah, ayah) => `${surah.padStart(3, '0')}.mp3`,
        type: 'surah'
    }
];

let currentAudioSourceIndex = 0;

const ACHIEVEMENTS = {
    bronze: { name: "🥉 برونزية", parts: 300, icon: "🥉", desc: "300 جزء" },
    silver: { name: "🥈 فضية", parts: 600, icon: "🥈", desc: "600 جزء" },
    gold: { name: "🥇 ذهبية", parts: 900, icon: "🥇", desc: "900 جزء" },
    diamond: { name: "💎 ألماسية", parts: 1500, icon: "💎", desc: "1500 جزء" },
    firstKhatma: { name: "📖 أول ختمة", parts: 30, icon: "📖", desc: "أول ختمة (30 جزء)" },
    weekStreak: { name: "🔥 أسبوع", streak: 7, icon: "🔥", desc: "7 أيام متتالية" },
    monthStreak: { name: "⭐ شهر", streak: 30, icon: "⭐", desc: "30 يوم متتالية" },
    extraReader: { name: "📚 مجتهد", extraParts: 50, icon: "📚", desc: "50 جزء إضافي" },
    poolReader: { name: "🗃️ قارئ المخزون", extraParts: 10, icon: "🗃️", desc: "10 أجزاء من المخزون العام" }
};

let currentQuranPages = [];
let currentPageIndex = 0;

// ==================== PWA - التثبيت ====================
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('installPwaBtn');
    if (installBtn) installBtn.style.display = 'inline-flex';
});

document.getElementById('installPwaBtn')?.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('تم تثبيت التطبيق');
            const installBtn = document.getElementById('installPwaBtn');
            if (installBtn) installBtn.style.display = 'none';
        }
        deferredPrompt = null;
    }
});

// ==================== دوال مساعدة ====================
function showMessage(el, msg, isError = true) {
    const d = document.getElementById(el);
    if (d) { d.textContent = msg; d.className = `message ${isError ? 'error' : 'success'}`; setTimeout(() => { d.textContent = ''; d.className = 'message'; }, 4000); }
}

function showToast(msg, isError = false, duration = 3000) {
    let t = document.querySelector('.notification-toast');
    if (t) t.remove();
    t = document.createElement('div');
    t.className = 'notification-toast';
    t.style.backgroundColor = isError ? '#ef4444' : '#1a4739';
    t.innerHTML = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), duration);
}

function showScreen(id) { 
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); 
    document.getElementById(id)?.classList.add('active'); 
}

function getTodayString() { 
    return new Date().toDateString(); 
}

function escapeHtml(s) { 
    if (!s) return ''; 
    return s.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : m === '>' ? '&gt;' : ''); 
}

function calcPoints(extraCount, curExtra) { 
    let p = 0; 
    for (let i = 1; i <= extraCount; i++) { 
        let idx = curExtra + i; 
        if (idx === 1) p += 1; 
        else if (idx === 2) p += 1.2; 
        else if (idx === 3) p += 1.5; 
        else if (idx === 4) p += 2; 
        else p += 2.5; 
    } 
    return p; 
}

function calcTotalParts(m) {
    return (m.totalPartsRead || 0) + (m.totalExtraJuz || 0);
}

// حساب عدد الختمات من إجمالي الأجزاء
function calcKhatmasFromParts(totalParts) {
    return Math.floor(totalParts / 30);
}

// ==================== إدارة الإعدادات العامة ====================
async function initializeAppSettings() {
    const settingsRef = db.collection('appSettings').doc('config');
    const doc = await settingsRef.get();
    if (!doc.exists) {
        await settingsRef.set({
            maxExtraPerDay: 1,
            maxCircleMembers: 30,
            maxAbsenceDays: 3,
            shareMessage: "🎉 أتممت وردي اليوم في تطبيق ختمتي! 📖 #ختمتي #قرآن",
            updatedAt: new Date()
        });
    } else {
        const data = doc.data();
        MAX_CIRCLE_MEMBERS = data.maxCircleMembers || 30;
        MAX_EXTRA_JUZ_PER_DAY = data.maxExtraPerDay || 1;
        MAX_ABSENCE_DAYS = data.maxAbsenceDays || 3;
        localStorage.setItem('maxCircleMembers', MAX_CIRCLE_MEMBERS);
        localStorage.setItem('maxExtraPerDay', MAX_EXTRA_JUZ_PER_DAY);
        localStorage.setItem('maxAbsenceDays', MAX_ABSENCE_DAYS);
        if(document.getElementById('maxExtraPerDaySetting')) document.getElementById('maxExtraPerDaySetting').value = MAX_EXTRA_JUZ_PER_DAY;
        if(document.getElementById('shareMessageText')) document.getElementById('shareMessageText').value = data.shareMessage || "🎉 أتممت وردي اليوم في تطبيق ختمتي! 📖 #ختمتي #قرآن";
        if(document.getElementById('maxAbsenceDays')) document.getElementById('maxAbsenceDays').value = MAX_ABSENCE_DAYS;
    }
}

function listenToSettingsChanges() {
    db.collection('appSettings').doc('config').onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            MAX_CIRCLE_MEMBERS = data.maxCircleMembers || 30;
            MAX_EXTRA_JUZ_PER_DAY = data.maxExtraPerDay || 1;
            MAX_ABSENCE_DAYS = data.maxAbsenceDays || 3;
            localStorage.setItem('maxCircleMembers', MAX_CIRCLE_MEMBERS);
            localStorage.setItem('maxExtraPerDay', MAX_EXTRA_JUZ_PER_DAY);
            localStorage.setItem('maxAbsenceDays', MAX_ABSENCE_DAYS);
            if (document.getElementById('maxCircleMembers')) document.getElementById('maxCircleMembers').value = MAX_CIRCLE_MEMBERS;
            if (document.getElementById('maxExtraPerDaySetting')) document.getElementById('maxExtraPerDaySetting').value = MAX_EXTRA_JUZ_PER_DAY;
            if (document.getElementById('maxAbsenceDays')) document.getElementById('maxAbsenceDays').value = MAX_ABSENCE_DAYS;
            updateExtraLimitBadge();
        }
    });
}

async function updateMaxExtraPerDay() {
    const newMax = parseInt(document.getElementById('maxExtraPerDaySetting')?.value);
    if (newMax >= 0 && newMax <= 10) {
        await db.collection('appSettings').doc('config').set({ maxExtraPerDay: newMax, updatedAt: new Date() }, { merge: true });
        MAX_EXTRA_JUZ_PER_DAY = newMax;
        showToast(`✅ تم تحديث الحد الأقصى للأجزاء الإضافية إلى ${newMax} جزء يومياً`);
        updateExtraLimitBadge();
    } else {
        showToast("الرجاء إدخال رقم بين 0 و 10", true);
    }
}

async function updateMaxAbsenceDays() {
    const newMax = parseInt(document.getElementById('maxAbsenceDays')?.value);
    if (newMax >= 1 && newMax <= 10) {
        await db.collection('appSettings').doc('config').set({ maxAbsenceDays: newMax, updatedAt: new Date() }, { merge: true });
        MAX_ABSENCE_DAYS = newMax;
        showToast(`✅ تم تحديث عدد أيام الغياب قبل الطرد إلى ${newMax} أيام`);
    } else {
        showToast("الرجاء إدخال رقم بين 1 و 10", true);
    }
}

async function updateShareMessage() {
    const newMsg = document.getElementById('shareMessageText')?.value;
    if(newMsg) {
        await db.collection('appSettings').doc('config').set({ shareMessage: newMsg, updatedAt: new Date() }, { merge: true });
        showToast("✅ تم حفظ نص رسالة المشاركة");
    }
}

function updateExtraLimitBadge() {
    const badge = document.getElementById('extraLimitBadge');
    if(badge) badge.innerText = `(الحد الأقصى: ${MAX_EXTRA_JUZ_PER_DAY} جزء/يوم)`;
}

// ==================== تعديل اسم المستخدم ====================
let editNameTimeout;
async function checkEditUsername(username) {
    const div = document.getElementById('editNameAvailability');
    if (!username || username.length < 3) { if (div) { div.innerHTML = ''; div.className = 'name-availability'; } return false; }
    if (username === currentMemberData?.userName) { if (div) { div.innerHTML = '✅ هذا هو اسمك الحالي'; div.className = 'name-availability available'; } return true; }
    try {
        const users = await db.collection('users').where('username', '==', username).get();
        const members = await db.collection('circleMembers').where('userName', '==', username).get();
        const taken = !users.empty || !members.empty;
        if (div) { if (taken) { div.innerHTML = '❌ هذا الاسم مستخدم'; div.className = 'name-availability unavailable'; } else { div.innerHTML = '✅ هذا الاسم متاح'; div.className = 'name-availability available'; } }
        return !taken;
    } catch (e) { return true; }
}

async function updateUserName(newName) {
    if (!currentUser || !currentMemberData) return false;
    const memberRef = db.collection('circleMembers').doc(currentMemberId);
    const userRef = db.collection('users').doc(currentUser.uid);
    
    try {
        await memberRef.update({ userName: newName });
        await userRef.update({ username: newName, name: newName });
        currentMemberData.userName = newName;
        await updateUI();
        showToast("✅ تم تحديث اسم المستخدم بنجاح");
        return true;
    } catch (error) {
        console.error(error);
        showToast("حدث خطأ أثناء تحديث الاسم", true);
        return false;
    }
}

document.getElementById('editUserNameBtn')?.addEventListener('click', () => {
    const modal = document.getElementById('editNameModal');
    const input = document.getElementById('newUserName');
    input.value = currentMemberData?.userName || '';
    document.getElementById('editNameAvailability').innerHTML = '';
    modal.style.display = 'flex';
});

document.getElementById('newUserName')?.addEventListener('input', (e) => {
    clearTimeout(editNameTimeout);
    editNameTimeout = setTimeout(() => checkEditUsername(e.target.value.trim()), 500);
});

document.getElementById('confirmEditNameBtn')?.addEventListener('click', async () => {
    const newName = document.getElementById('newUserName').value.trim();
    if (!newName || newName.length < 3) {
        showToast("الاسم يجب أن يكون 3 أحرف على الأقل", true);
        return;
    }
    const isAvailable = await checkEditUsername(newName);
    if (!isAvailable && newName !== currentMemberData?.userName) {
        showToast("هذا الاسم مستخدم من قبل", true);
        return;
    }
    await updateUserName(newName);
    document.getElementById('editNameModal').style.display = 'none';
});

// ==================== دوال المخزون العام ====================
async function initializeGlobalExtraJuz() {
    const poolRef = db.collection('globalExtraJuz').doc('globalPool');
    const doc = await poolRef.get();
    if (!doc.exists) {
        await poolRef.set({
            availableJuz: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30],
            takenJuz: {},
            lastRefillDate: new Date(),
            refillCount: 0
        });
    }
}

async function showExtraJuzModal() {
    if (!currentMemberData) return;
    
    const todayAdded = (currentMemberData.extraReadingsPlan || []).filter(p => {
        const addedDate = p.addedAt?.toDate ? new Date(p.addedAt.toDate()).toDateString() : new Date(p.addedAt).toDateString();
        return addedDate === getTodayString();
    });
    if (todayAdded.length >= MAX_EXTRA_JUZ_PER_DAY) {
        showToast(`⚠️ مسموح فقط بـ ${MAX_EXTRA_JUZ_PER_DAY} جزء إضافي يومياً.`, true);
        return;
    }
    
    const poolRef = db.collection('globalExtraJuz').doc('globalPool');
    const poolDoc = await poolRef.get();
    if (!poolDoc.exists) {
        showToast("المخزون العام غير متاح حالياً", true);
        return;
    }
    
    const availableJuz = poolDoc.data().availableJuz || [];
    if (availableJuz.length === 0) {
        showToast("❗ لا توجد أجزاء متاحة في المخزون العام حالياً. تواصل مع المدير لتجديد المخزون.", true);
        return;
    }
    
    const modal = document.getElementById('extraJuzModal');
    const grid = document.getElementById('extraJuzGrid');
    const msgSpan = document.getElementById('availableExtraCountMsg');
    msgSpan.innerHTML = `📦 الأجزاء المتاحة حالياً: ${availableJuz.length} جزء | الحد اليومي: ${MAX_EXTRA_JUZ_PER_DAY} جزء`;
    
    grid.innerHTML = '';
    for (let i = 1; i <= 30; i++) {
        const isAvailable = availableJuz.includes(i);
        const btn = document.createElement('button');
        btn.className = `juz-btn ${!isAvailable ? 'disabled' : ''}`;
        btn.textContent = i;
        btn.disabled = !isAvailable;
        if (isAvailable) {
            btn.onclick = () => reserveExtraJuzFromPool(i);
        }
        grid.appendChild(btn);
    }
    
    modal.style.display = 'flex';
}

async function reserveExtraJuzFromPool(juz) {
    const modal = document.getElementById('extraJuzModal');
    const poolRef = db.collection('globalExtraJuz').doc('globalPool');
    
    try {
        await db.runTransaction(async t => {
            const poolDoc = await t.get(poolRef);
            if (!poolDoc.exists) throw new Error('المخزون غير موجود');
            const data = poolDoc.data();
            const available = data.availableJuz || [];
            const taken = data.takenJuz || {};
            
            if (!available.includes(juz)) {
                throw new Error('الجزء غير متاح حالياً');
            }
            if (taken[juz]) {
                throw new Error('الجزء محجوز مسبقاً');
            }
            
            const newAvailable = available.filter(j => j !== juz);
            const newTaken = { ...taken, [juz]: currentUser.uid };
            t.update(poolRef, { availableJuz: newAvailable, takenJuz: newTaken });
        });
        
        const memberRef = db.collection('circleMembers').doc(currentMemberId);
        const currentPlan = currentMemberData.extraReadingsPlan || [];
        const newPlan = [...currentPlan, {
            juz: juz,
            status: 'pending',
            addedAt: new Date(),
            pointsEarned: 0
        }];
        const newDailyTotal = (currentMemberData.dailyGoalTotal || 0) + 1;
        await memberRef.update({
            extraReadingsPlan: newPlan,
            dailyGoalTotal: newDailyTotal
        });
        
        currentMemberData.extraReadingsPlan = newPlan;
        currentMemberData.dailyGoalTotal = newDailyTotal;
        
        modal.style.display = 'none';
        showToast(`✅ تم إضافة الجزء ${juz} من المخزون العام إلى خطتك`, false);
        await loadExtraProgress();
        
    } catch (error) {
        console.error(error);
        showToast(error.message || 'حدث خطأ أثناء حجز الجزء', true);
    }
}

async function completeExtraJuz(juz) {
    const plan = currentMemberData.extraReadingsPlan || [];
    const item = plan.find(p => p.juz === juz && p.status === 'pending');
    if (!item) {
        showToast("⚠️ هذا الجزء غير موجود أو تم إكماله مسبقاً", true);
        return;
    }
    
    const completedCount = plan.filter(p => p.status === 'completed').length;
    const points = calcPoints(1, completedCount);
    
    const memberRef = db.collection('circleMembers').doc(currentMemberId);
    const updatedPlan = plan.map(p => {
        if (p.juz === juz && p.status === 'pending') {
            return { ...p, status: 'completed', completedAt: new Date(), pointsEarned: points };
        }
        return p;
    });
    const newCompleted = (currentMemberData.dailyGoalCompleted || 0) + 1;
    const newTotalExtra = (currentMemberData.totalExtraJuz || 0) + 1;
    
    await memberRef.update({
        extraReadingsPlan: updatedPlan,
        dailyGoalCompleted: newCompleted,
        totalExtraJuz: newTotalExtra,
        points: firebase.firestore.FieldValue.increment(points)
    });
    
    currentMemberData.extraReadingsPlan = updatedPlan;
    currentMemberData.dailyGoalCompleted = newCompleted;
    currentMemberData.totalExtraJuz = newTotalExtra;
    currentMemberData.points = (currentMemberData.points || 0) + points;
    
    showToast(`✅ الجزء ${juz} من المخزون +${points} نقطة`, false);
    
    const total = currentMemberData.dailyGoalTotal || 0;
    if (newCompleted === total && total > 0) {
        await memberRef.update({ points: firebase.firestore.FieldValue.increment(3) });
        currentMemberData.points += 3;
        showToast(`🎉 أتممت خطة اليوم! +3 نقاط إضافية`, false);
        addNotification(currentUser.uid, "🎉 إنجاز", "أتممت خطة الأجزاء الإضافية اليوم", 'achievement');
        showExtraCompletionShareUI(juz);
    }
    
    await checkAchievements(currentUser.uid, currentMemberData);
    await loadExtraProgress();
    await updateUI();
}

function showExtraCompletionShareUI(extraJuz) {
    const area = document.getElementById('completionMessageArea');
    const completionText = document.getElementById('completionText');
    if(area && completionText) {
        completionText.innerHTML = `🎉 أتممت الجزء الإضافي ${extraJuz}! +${calcPoints(1, (currentMemberData.dailyGoalCompleted || 0) - 1)} نقطة`;
        area.style.display = 'block';
    }
    setTimeout(() => {
        if(area) area.style.display = 'none';
    }, 30000);
}

async function loadExtraProgress() {
    const cont = document.getElementById('extraProgressList');
    if (!cont) return;
    if (!currentMemberData) { cont.innerHTML = '<div class="empty-plan">لا توجد بيانات</div>'; return; }
    
    const plan = currentMemberData.extraReadingsPlan || [];
    const completed = currentMemberData.dailyGoalCompleted || 0;
    const total = currentMemberData.dailyGoalTotal || 0;
    
    if (plan.length === 0) {
        cont.innerHTML = '<div class="empty-plan">📝 لا توجد أجزاء إضافية في خطتك اليوم. اضغط على "أضف جزءاً من المخزون"</div>';
        document.getElementById('dailyGoalFill').style.width = '0%';
        document.getElementById('dailyGoalText').innerHTML = `🎯 هدف اليوم: 0/${MAX_EXTRA_JUZ_PER_DAY}`;
        document.getElementById('totalExtraJuz').textContent = currentMemberData.totalExtraJuz || 0;
        let ep = 0;
        for (let p of plan) if (p.status === 'completed') ep += p.pointsEarned || 1;
        document.getElementById('extraPoints').textContent = ep;
        return;
    }
    
    plan.sort((a, b) => a.juz - b.juz);
    cont.innerHTML = '';
    let extraPoints = 0;
    for (let item of plan) {
        const isComp = item.status === 'completed';
        if (isComp) extraPoints += item.pointsEarned || 1;
        const div = document.createElement('div');
        div.className = `progress-item ${isComp ? 'completed' : 'pending'}`;
        div.innerHTML = `<div><span>📖 الجزء ${item.juz} (من المخزون العام)</span><span>${isComp ? '✅ تم' : '⏳ في الانتظار'}</span></div><div>${!isComp ? `<button class="complete-extra-btn" onclick="completeExtraJuz(${item.juz})">📌 أنهيت</button>` : `<span class="points-earned">+${item.pointsEarned || 1} نقطة</span>`}</div>`;
        cont.appendChild(div);
    }
    
    const percent = total > 0 ? (completed / total * 100) : 0;
    document.getElementById('dailyGoalFill').style.width = percent + '%';
    document.getElementById('dailyGoalText').innerHTML = `🎯 هدف اليوم: ${completed}/${total}`;
    document.getElementById('totalExtraJuz').textContent = currentMemberData.totalExtraJuz || 0;
    document.getElementById('extraPoints').textContent = extraPoints;
}

async function refreshExtraPoolStats() {
    const poolRef = db.collection('globalExtraJuz').doc('globalPool');
    const doc = await poolRef.get();
    if (doc.exists) {
        const data = doc.data();
        const availableCount = data.availableJuz?.length || 0;
        const takenCount = Object.keys(data.takenJuz || {}).length;
        document.getElementById('availableExtraJuzCount').textContent = availableCount;
        document.getElementById('takenExtraJuzCount').textContent = takenCount;
        const lastDate = data.lastRefillDate?.toDate();
        document.getElementById('lastRefillDate').textContent = lastDate ? lastDate.toLocaleDateString('ar') : '-';
        
        const takenList = document.getElementById('takenExtraJuzList');
        takenList.innerHTML = '';
        for (const [juz, userId] of Object.entries(data.takenJuz || {})) {
            const userSnap = await db.collection('users').doc(userId).get();
            const userName = userSnap.exists ? userSnap.data().username : 'مستخدم غير معروف';
            takenList.innerHTML += `<div class="admin-list-item"><div><strong>الجزء ${juz}</strong><br><small>📖 مقروء من قبل: ${escapeHtml(userName)}</small></div></div>`;
        }
        if (takenList.innerHTML === '') takenList.innerHTML = '<div class="empty-plan">لا توجد أجزاء مأخوذة حالياً</div>';
    }
}

async function refillGlobalExtraJuz() {
    if (!confirm('⚠️ هل أنت متأكد من تجديد المخزون العام؟ سيتم إعادة تعيين جميع الأجزاء (30 جزءاً) ومسح سجل الأجزاء المأخوذة.')) return;
    const poolRef = db.collection('globalExtraJuz').doc('globalPool');
    await poolRef.set({
        availableJuz: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30],
        takenJuz: {},
        lastRefillDate: new Date(),
        refillCount: firebase.firestore.FieldValue.increment(1)
    });
    showToast("✅ تم تجديد المخزون العام بنجاح", false);
    await refreshExtraPoolStats();
}

// ==================== دوال تسجيل الدخول و Google و FCM ====================
async function initFCM() {
    if (!currentUser || currentUser.email === ADMIN_EMAIL) return;
    try {
        await messaging.requestPermission();
        const token = await messaging.getToken({ vapidKey: 'BGpXqZ5kQ9v3Ld2FgH7jK1mN4pR6sT8uVwXyZ2aBcDeFgHiJkLmNoPqRsTuVwXyZ' });
        await db.collection('users').doc(currentUser.uid).update({ fcmToken: token });
        messaging.onMessage((payload) => {
            showToast(payload.notification.body);
        });
    } catch (err) {
        console.error('FCM error:', err);
    }
}

async function handleGoogleSignIn() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
            let username = user.displayName ? user.displayName.replace(/\s/g, '') : user.email.split('@')[0];
            let finalUsername = username;
            let counter = 1;
            while (true) {
                const existing = await db.collection('users').where('username', '==', finalUsername).get();
                if (existing.empty) break;
                finalUsername = `${username}_${counter}`;
                counter++;
            }
            await db.collection('users').doc(user.uid).set({
                name: finalUsername,
                username: finalUsername,
                email: user.email,
                gender: 'mixed',
                role: 'user',
                createdAt: new Date()
            });
        }
        
        currentUser = user;
        const udoc = await db.collection('users').doc(user.uid).get();
        currentUserGender = udoc.data().gender || 'mixed';
        
        const isAd = await checkIfAdmin(user);
        if (isAd) {
            await loadAdminData();
            showScreen('adminScreen');
        } else {
            await initFCM();
            await loadUserData();
        }
    } catch (error) {
        console.error(error);
        let errorMsg = "فشل الدخول عبر Google";
        if (error.code === 'auth/popup-blocked') errorMsg = "تم حظر النافذة المنبثقة، يرجى السماح بالنوافذ المنبثقة للموقع";
        else if (error.code === 'auth/unauthorized-domain') errorMsg = "النطاق غير مصرح به، أضف هذا النطاق في Firebase Console";
        showMessage('authMessage', errorMsg, true);
    }
}

let nameTimeout;
async function checkUsername(username) {
    const div = document.getElementById('nameAvailability');
    if (!username || username.length < 3) { if (div) { div.innerHTML = ''; div.className = 'name-availability'; } return false; }
    try {
        const users = await db.collection('users').where('username', '==', username).get();
        const members = await db.collection('circleMembers').where('userName', '==', username).get();
        const taken = !users.empty || !members.empty;
        if (div) { if (taken) { div.innerHTML = '❌ هذا الاسم مستخدم'; div.className = 'name-availability unavailable'; } else { div.innerHTML = '✅ هذا الاسم متاح'; div.className = 'name-availability available'; } }
        return !taken;
    } catch (e) { return true; }
}
document.getElementById('regName')?.addEventListener('input', e => { clearTimeout(nameTimeout); nameTimeout = setTimeout(() => checkUsername(e.target.value.trim()), 500); });

async function loginWithUsernameOrEmail(identifier, password) {
    const isEmail = identifier.includes('@');
    if (isEmail) return await auth.signInWithEmailAndPassword(identifier, password);
    const users = await db.collection('users').where('username', '==', identifier).get();
    if (users.empty) throw new Error('اسم المستخدم غير موجود');
    return await auth.signInWithEmailAndPassword(users.docs[0].data().email, password);
}

async function addNotification(userId, title, message, type = 'general') { 
    await db.collection('notifications').add({ userId, title, message, type, createdAt: new Date(), read: false }); 
}

async function checkAchievements(userId, memberData) {
    const total = calcTotalParts(memberData);
    const khatmas = calcKhatmasFromParts(total);
    const streak = memberData.streakDays || 0;
    const extra = memberData.totalExtraJuz || 0;
    const earned = memberData.achievements || [];
    const newA = [];
    
    for (const [key, ach] of Object.entries(ACHIEVEMENTS)) {
        if (earned.includes(key)) continue;
        if ((ach.parts && total >= ach.parts) || (ach.streak && streak >= ach.streak) || (ach.extraParts && extra >= ach.extraParts) || (key === 'firstKhatma' && khatmas >= 1)) {
            newA.push(key);
            addNotification(userId, "🎉 إنجاز!", ach.name, 'achievement');
            showToast(`🎉 حصلت على ${ach.name}`);
        }
    }
    if (newA.length) {
        const q = await db.collection('circleMembers').where('userId', '==', userId).get();
        if (!q.empty) await q.docs[0].ref.update({ achievements: [...earned, ...newA] });
    }
}

function resetIdleTimer() {
    if (!currentUser || currentUser.email === ADMIN_EMAIL) return;
    lastActivityTime = Date.now();
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
        if (Date.now() - lastActivityTime >= IDLE_TIMEOUT) {
            showToast("⚠️ تم تسجيل الخروج تلقائياً لعدم النشاط", true);
            auth.signOut();
        }
    }, IDLE_TIMEOUT);
}
['click', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
    document.addEventListener(event, resetIdleTimer);
});

async function checkEmailVerification(user) {
    if (!user || user.email === ADMIN_EMAIL) return true;
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (userDoc.exists && userDoc.data().isGuest === true) return true;
    await user.reload();
    if (!user.emailVerified) {
        showToast("📧 يرجى تفعيل بريدك الإلكتروني أولاً. تحقق من بريدك الوارد.", true, 5000);
        await auth.signOut();
        return false;
    }
    return true;
}

async function getCachedOrFetch(key, fetchFn, ttl = CACHE_TTL) {
    const cached = localStorage.getItem(`cache_${key}`);
    if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < ttl) return data;
    }
    const fresh = await fetchFn();
    localStorage.setItem(`cache_${key}`, JSON.stringify({ data: fresh, timestamp: Date.now() }));
    return fresh;
}

function initDarkMode() {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'enabled') {
        document.body.classList.add('dark-mode');
        updateDarkModeButtons(true);
    } else {
        document.body.classList.remove('dark-mode');
        updateDarkModeButtons(false);
    }
}
function updateDarkModeButtons(isDark) {
    const btns = document.querySelectorAll('#darkModeToggleCircle, #darkModeToggleMain, #darkModeToggleAdmin');
    btns.forEach(btn => {
        if (btn) btn.textContent = isDark ? '☀️' : '🌙';
    });
}
function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
    updateDarkModeButtons(isDark);
}
function initFontSize() {
    const savedSize = localStorage.getItem('fontSize') || 'medium';
    document.body.classList.add(`font-${savedSize}`);
}
function setFontSize(size) {
    document.body.classList.remove('font-small', 'font-medium', 'font-large');
    document.body.classList.add(`font-${size}`);
    localStorage.setItem('fontSize', size);
}
function showFontSizeModal() {
    const modal = document.getElementById('fontSizeModal');
    if (modal) modal.style.display = 'flex';
}

async function requestNotificationPermission() {
    if (typeof Notification === "undefined") {
        console.warn("الإشعارات غير مدعومة في هذا المتصفح");
        return false;
    }
    if (Notification.permission === "granted") return true;
    if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            showToast("✅ تم تفعيل الإشعارات");
            scheduleDailyReminder();
            return true;
        }
    }
    return false;
}
function scheduleDailyReminder() {
    if (typeof Notification === "undefined") return;
    const reminderHour = parseInt(localStorage.getItem('reminderHour')) || 20;
    const now = new Date();
    let target = new Date();
    target.setHours(reminderHour, 0, 0, 0);
    if (now >= target) target.setDate(target.getDate() + 1);
    const delay = target - now;
    setTimeout(() => {
        if (Notification.permission === "granted" && currentUser && currentMemberData) {
            const last = currentMemberData.lastReadDate ? new Date(currentMemberData.lastReadDate.toDate()).toDateString() : null;
            if (last !== getTodayString()) {
                new Notification("📖 ختمتي - تذكير بالورد", { body: "لم تقرأ وردك اليوم بعد؟ لا تنسَ ختمتك!", icon: "/favicon.ico" });
            }
        }
        scheduleDailyReminder();
    }, delay);
}
function showNotificationPermissionPrompt() {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
        document.getElementById('notificationPermissionModal').style.display = 'flex';
    }
}
document.getElementById('enableNotificationsBtn')?.addEventListener('click', async () => {
    document.getElementById('notificationPermissionModal').style.display = 'none';
    await requestNotificationPermission();
});
document.getElementById('dismissNotificationsBtn')?.addEventListener('click', () => {
    document.getElementById('notificationPermissionModal').style.display = 'none';
});

function showOnboardingIfNeeded() {
    if (!localStorage.getItem('onboardingCompleted')) {
        document.getElementById('onboardingOverlay').style.display = 'flex';
        const steps = ['onboardingStep1', 'onboardingStep2', 'onboardingStep3'];
        document.querySelectorAll('.onboarding-next').forEach((btn, idx) => {
            btn.onclick = () => {
                if (idx === steps.length - 1) {
                    document.getElementById('onboardingOverlay').style.display = 'none';
                    localStorage.setItem('onboardingCompleted', 'true');
                } else {
                    document.getElementById(steps[idx]).style.display = 'none';
                    document.getElementById(steps[idx+1]).style.display = 'block';
                }
            };
        });
    }
}

function updateJuzProgressChart() {
    if (!currentMemberData) return;
    const totalParts = currentMemberData.totalPartsRead || 0;
    const progressInCurrentKhatma = totalParts % 30;
    const percent = (progressInCurrentKhatma / 30) * 100;
    
    document.getElementById('juzProgressPercent').textContent = Math.round(percent) + '%';
    const canvas = document.getElementById('juzProgressChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (juzChart) juzChart.destroy();
    juzChart = new Chart(ctx, {
        type: 'doughnut',
        data: { datasets: [{ data: [percent, 100-percent], backgroundColor: ['#fbbf24', '#e5e7eb'], borderWidth: 0 }] },
        options: { cutout: '70%', plugins: { tooltip: { enabled: false }, legend: { display: false } } }
    });
}

async function ensureAdminExists() {
    try {
        await auth.signInWithEmailAndPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        const doc = await db.collection('users').doc(auth.currentUser.uid).get();
        if (!doc.exists) await db.collection('users').doc(auth.currentUser.uid).set({ name: "المدير العام", username: "admin", email: ADMIN_EMAIL, role: "admin", gender: "male", createdAt: new Date() });
        await auth.signOut();
    } catch (e) {
        if (e.code === 'auth/user-not-found') {
            const uc = await auth.createUserWithEmailAndPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
            await db.collection('users').doc(uc.user.uid).set({ name: "المدير العام", username: "admin", email: ADMIN_EMAIL, role: "admin", gender: "male", createdAt: new Date() });
            await auth.signOut();
        }
    }
}
async function checkIfAdmin(user) {
    if (!user) return false;
    const btn = document.getElementById('adminPanelBtn');
    if (user.email === ADMIN_EMAIL) { isAdmin = true; if (btn) btn.style.display = 'inline-block'; return true; }
    try {
        const doc = await db.collection('users').doc(user.uid).get();
        if (doc.exists && doc.data().role === 'admin') { isAdmin = true; if (btn) btn.style.display = 'inline-block'; return true; }
    } catch (e) { }
    isAdmin = false; if (btn) btn.style.display = 'none'; return false;
}

async function createDefaultCircle() {
    const snap = await db.collection('circles').limit(1).get();
    if (snap.empty) await db.collection('circles').add({ circleName: "الحلقة الرئيسية", inviteCode: "DEFAULT123", gender: "mixed", createdAt: new Date(), memberCount: 0 });
}
function exitToAuth() { auth.signOut().then(() => { showScreen('authScreen'); pendingUserData = null; currentUser = null; isAdmin = false; }); }
async function refreshCircles() { if (pendingUserData) await showAvailableCircles(pendingUserData); else if (currentUser) { const ud = await db.collection('users').doc(currentUser.uid).get(); if (ud.exists) await showAvailableCircles({ userId: currentUser.uid, email: currentUser.email, name: ud.data().username, gender: ud.data().gender }); } }

async function showAvailableCircles(userData) {
    pendingUserData = userData;
    currentUserGender = userData.gender;
    await createDefaultCircle();
    const circles = await getCachedOrFetch('circles', async () => {
        const snap = await db.collection('circles').get();
        const result = [];
        for (const doc of snap.docs) {
            const c = doc.data();
            result.push({ id: doc.id, name: c.circleName, inviteCode: c.inviteCode, memberCount: c.memberCount || 0, gender: c.gender || 'mixed', isFull: (c.memberCount || 0) >= MAX_CIRCLE_MEMBERS, createdAt: c.createdAt });
        }
        result.sort((a, b) => (a.createdAt?.toDate() || 0) - (b.createdAt?.toDate() || 0));
        return result;
    });
    filterCirclesUI(circles);
}
function filterCirclesUI(circles) {
    const searchTerm = document.getElementById('searchCircleInput')?.value.toLowerCase() || '';
    let filtered = currentUserGender ? circles.filter(c => c.gender === 'mixed' || c.gender === currentUserGender) : circles;
    if (searchTerm) {
        filtered = filtered.filter(c => c.name.toLowerCase().includes(searchTerm) || c.inviteCode.toLowerCase().includes(searchTerm));
    }
    const container = document.getElementById('availableCirclesList');
    if (!container) return;
    container.innerHTML = '';
    if (filtered.length === 0) { container.innerHTML = '<div class="circle-card"><h4>لا توجد حلقات متاحة</h4><button onclick="refreshCircles()" class="refresh-btn">تحديث</button></div>'; showScreen('selectCircleScreen'); return; }
    let activeFound = false;
    for (const circle of filtered) {
        const isActive = !circle.isFull && !activeFound;
        if (isActive) activeFound = true;
        const card = document.createElement('div');
        card.className = `circle-card ${circle.gender === 'female' ? 'female-circle' : circle.gender === 'male' ? 'male-circle' : ''}`;
        const genderBadge = circle.gender === 'female' ? '<span class="circle-gender-badge female">👩 نسائي</span>' : circle.gender === 'male' ? '<span class="circle-gender-badge male">👨 رجالي</span>' : '<span class="circle-gender-badge mixed">👥 مختلط</span>';
        const btnHtml = circle.isFull ? '<button class="join-btn" disabled>❌ مكتملة</button>' : (isActive ? `<button class="join-btn" onclick="selectCircle('${circle.id}')">➕ انضم</button>` : '<button class="join-btn" disabled>⏳ انتظر دورك</button>');
        card.innerHTML = `<h4>🔄 ${escapeHtml(circle.name)}</h4><p>🔑 ${circle.inviteCode}</p><p>👥 ${circle.memberCount}/${MAX_CIRCLE_MEMBERS}</p>${genderBadge}${btnHtml}`;
        container.appendChild(card);
    }
    showScreen('selectCircleScreen');
}
window.selectCircle = async function (id) { pendingCircleId = id; await showAvailableJuz(id); };
async function showAvailableJuz(circleId) {
    const doc = await db.collection('circleAvailableJuz').doc(circleId).get();
    let taken = {}, avail = [];
    if (doc.exists) { avail = doc.data().availableJuz || []; taken = doc.data().takenJuz || {}; }
    else { avail = Array.from({ length: 30 }, (_, i) => i + 1); await db.collection('circleAvailableJuz').doc(circleId).set({ circleId, availableJuz: avail, takenJuz: taken, createdAt: new Date() }); }
    const container = document.getElementById('juzGrid');
    container.innerHTML = '';
    for (let i = 1; i <= 30; i++) {
        const isTaken = taken[i] && taken[i] !== pendingUserData?.userId;
        const btn = document.createElement('button');
        btn.className = `juz-btn ${isTaken ? 'taken' : ''}`;
        btn.textContent = i;
        btn.disabled = isTaken;
        if (!isTaken) btn.onclick = () => selectJuz(circleId, i);
        container.appendChild(btn);
    }
    showScreen('selectJuzScreen');
}

// ==================== دوال اختيار الجزء الأساسي والدخول ====================
async function selectJuz(circleId, juz) {
    if (!pendingUserData) {
        showMessage('juzSelectionMessage', 'خطأ: يرجى إعادة المحاولة', true);
        return;
    }
    const existingMemberCheck = await db.collection('circleMembers')
        .where('userId', '==', pendingUserData.userId)
        .where('isActive', '==', true)
        .get();
    if (!existingMemberCheck.empty) {
        showMessage('juzSelectionMessage', '⚠️ أنت بالفعل عضو في حلقة', true);
        return;
    }

    const userName = pendingUserData.name || pendingUserData.username || "مستخدم";
    const availRef = db.collection('circleAvailableJuz').doc(circleId);
    try {
        await db.runTransaction(async t => {
            const d = await t.get(availRef);
            const data = d.data() || { availableJuz: [], takenJuz: {} };
            if (data.takenJuz[juz] && data.takenJuz[juz] !== pendingUserData.userId) {
                throw new Error('الجزء مأخوذ');
            }
            const newTaken = { ...data.takenJuz, [juz]: pendingUserData.userId };
            const newAvail = data.availableJuz.filter(j => j !== juz);
            t.update(availRef, { takenJuz: newTaken, availableJuz: newAvail });
        });

        const circleRef = db.collection('circles').doc(circleId);
        const cDoc = await circleRef.get();
        await circleRef.update({ memberCount: (cDoc.data().memberCount || 0) + 1 });

        const memberId = db.collection('circleMembers').doc().id;
        const memberDoc = {
            circleId, 
            userId: pendingUserData.userId, 
            userName, 
            userEmail: pendingUserData.email || "", 
            userGender: pendingUserData.gender || "mixed",
            joinedAt: new Date(), 
            selectedJuz: juz, 
            currentJuz: juz,
            totalPartsRead: 0,
            completedKhatmas: 0,
            lastReadDate: null,
            absenceCount: 0,
            streakDays: 0, 
            isActive: true,
            extraReadingsPlan: [], 
            dailyGoalTotal: 0, 
            dailyGoalCompleted: 0,
            totalExtraJuz: 0, 
            achievements: [], 
            points: 0
        };
        await db.collection('circleMembers').doc(memberId).set(memberDoc);

        currentMemberData = memberDoc;
        currentMemberId = memberId;
        currentCircleId = circleId;

        showMessage('juzSelectionMessage', `✅ تم اختيار الجزء ${juz}`, false);

        await updateUI();
        await Promise.all([
            loadLeaderboardOptimized(),
            loadGlobalOptimized(),
            loadCircleInfo(),
            loadExtraProgress(),
            checkDaily(),
            loadAchievements(),
            loadNotificationsNoIndex()
        ]);
        updateJuzProgressChart();
        showScreen('mainScreen');
        showToast("🎉 مرحباً بك في الحلقة!", false);

        pendingUserData = null;
        pendingCircleId = null;
    } catch (error) {
        console.error(error);
        showMessage('juzSelectionMessage', error.message || 'حدث خطأ', true);
    }
}

async function loadUserData() {
    if (!currentUser || currentUser.email === ADMIN_EMAIL) return;
    const verified = await checkEmailVerification(currentUser);
    if (!verified) return;
    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    if (!userDoc.exists) {
        await db.collection('users').doc(currentUser.uid).set({
            name: currentUser.displayName || currentUser.email.split('@')[0],
            username: currentUser.displayName || currentUser.email.split('@')[0],
            email: currentUser.email,
            gender: 'mixed',
            role: 'user',
            createdAt: new Date()
        });
    }
    currentUserGender = userDoc.exists ? userDoc.data().gender : 'mixed';
    const members = await db.collection('circleMembers')
        .where('userId', '==', currentUser.uid)
        .where('isActive', '==', true)
        .get();
    if (members.empty) {
        await showAvailableCircles({
            userId: currentUser.uid,
            email: currentUser.email,
            name: userDoc.exists ? userDoc.data().username : currentUser.displayName || currentUser.email.split('@')[0],
            gender: currentUserGender
        });
        return;
    }
    const mDoc = members.docs[0];
    currentMemberData = mDoc.data();
    currentMemberId = mDoc.id;
    currentCircleId = currentMemberData.circleId;
    if (!currentMemberData.selectedJuz) {
        await showAvailableCircles({
            userId: currentUser.uid,
            email: currentUser.email,
            name: userDoc.exists ? userDoc.data().username : currentUser.displayName || currentUser.email.split('@')[0],
            gender: currentUserGender
        });
        return;
    }
    await updateUI();
    await Promise.all([loadLeaderboardOptimized(), loadGlobalOptimized(), loadCircleInfo(), loadExtraProgress(), checkDaily(), loadAchievements(), loadNotificationsNoIndex()]);
    updateJuzProgressChart();
    showScreen('mainScreen');
    showOnboardingIfNeeded();
    showNotificationPermissionPrompt();
    resetIdleTimer();
    updateExtraLimitBadge();
}

async function updateUI() {
    document.getElementById('userName').textContent = currentMemberData.userName;
    
    const totalParts = currentMemberData.totalPartsRead || 0;
    const currentJuzNum = currentMemberData.currentJuz || currentMemberData.selectedJuz;
    const progressInKhatma = totalParts % 30;
    const currentKhatma = Math.floor(totalParts / 30) + 1;
    
    document.getElementById('currentJuz').textContent = currentJuzNum;
    document.getElementById('juzStatus').innerHTML = `الختمة ${currentKhatma} - الجزء ${currentJuzNum} من 30`;
    document.getElementById('khatmaProgress').style.width = (progressInKhatma / 30 * 100) + '%';
    document.getElementById('totalPartsRead').textContent = calcTotalParts(currentMemberData);
    document.getElementById('completedKhatmas').textContent = calcKhatmasFromParts(totalParts);
    document.getElementById('streakDays').textContent = currentMemberData.streakDays || 0;
    document.getElementById('userPoints').textContent = Math.floor(currentMemberData.points || 0);
    
    // تحديث الإحصائيات المصغرة
    document.getElementById('totalPartsCount').textContent = totalParts;
    document.getElementById('khatmasCount').textContent = calcKhatmasFromParts(totalParts);
    document.getElementById('streakCount').textContent = currentMemberData.streakDays || 0;
    
    const last = currentMemberData.lastReadDate ? new Date(currentMemberData.lastReadDate.toDate()).toDateString() : null;
    const btn = document.getElementById('completeDailyJuzBtn');
    if (last === getTodayString()) { 
        btn.disabled = true; 
        btn.textContent = '✅ تم إكمال الورد'; 
        btn.style.background = '#9ca3af'; 
    } else { 
        btn.disabled = false; 
        btn.textContent = '✅ أنهيت وردي اليوم'; 
        btn.style.background = '#fbbf24'; 
    }
    
    const badges = currentMemberData.achievements || [];
    const badgeDiv = document.getElementById('userBadges');
    badgeDiv.innerHTML = badges.map(b => `<span class="user-badge">${ACHIEVEMENTS[b]?.icon || '🏅'} ${ACHIEVEMENTS[b]?.name || ''}</span>`).join('');
    
    // عرض رسالة تحذير إذا كان المستخدم غائباً
    const warningDiv = document.getElementById('warningMessage');
    if (currentMemberData.absenceCount >= 1 && currentMemberData.absenceCount < MAX_ABSENCE_DAYS) {
        warningDiv.style.display = 'block';
        warningDiv.innerHTML = `⚠️ لم تقرأ وردك لمدة ${currentMemberData.absenceCount} يوم! إذا وصلت إلى ${MAX_ABSENCE_DAYS} أيام، سيتم إخراجك من الحلقة.`;
    } else {
        warningDiv.style.display = 'none';
    }
}

async function checkDaily() {
    if (!currentMemberData) return;
    
    const today = getTodayString();
    const lastRead = currentMemberData.lastReadDate ? new Date(currentMemberData.lastReadDate.toDate()).toDateString() : null;
    
    // إذا كان قد قرأ اليوم، لا تفعل شيئاً
    if (lastRead === today) return;
    
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    // إذا لم يقرأ أمس
    if (lastRead !== yesterday) {
        // زيادة عدد أيام الغياب
        const newAbsenceCount = (currentMemberData.absenceCount || 0) + 1;
        
        // تحديث عدد أيام الغياب
        const memberRef = db.collection('circleMembers').doc(currentMemberId);
        await memberRef.update({ absenceCount: newAbsenceCount });
        currentMemberData.absenceCount = newAbsenceCount;
        
        // إرسال إشعار في اليوم الثاني
        if (newAbsenceCount === 2) {
            addNotification(currentUser.uid, "⚠️ تنبيه", `لم تقرأ وردك لمدة يومين! إذا وصلت إلى ${MAX_ABSENCE_DAYS} أيام، سيتم إخراجك من الحلقة.`, 'warning');
            showToast(`⚠️ تنبيه: لم تقرأ لمدة ${newAbsenceCount} أيام. ستُطرد بعد ${MAX_ABSENCE_DAYS} أيام`, true);
        }
        
        // إذا وصل إلى الحد الأقصى، يتم طرده
        if (newAbsenceCount >= MAX_ABSENCE_DAYS) {
            await kickUserFromCircle();
        }
    } else {
        // قرأ أمس، إعادة تعيين عدد أيام الغياب
        if (currentMemberData.absenceCount > 0) {
            const memberRef = db.collection('circleMembers').doc(currentMemberId);
            await memberRef.update({ absenceCount: 0 });
            currentMemberData.absenceCount = 0;
        }
    }
}

async function kickUserFromCircle() {
    if (!currentMemberData) return;
    
    showToast(`⚠️ تم إخراجك من الحلقة بسبب الغياب لمدة ${MAX_ABSENCE_DAYS} أيام متتالية`, true);
    addNotification(currentUser.uid, "🚫 تم إخراجك من الحلقة", `لم تقرأ وردك لمدة ${MAX_ABSENCE_DAYS} أيام متتالية، تم إخراجك من الحلقة. يرجى الانضمام إلى حلقة جديدة.`, 'warning');
    
    // تحرير الجزء
    const availRef = db.collection('circleAvailableJuz').doc(currentCircleId);
    await db.runTransaction(async t => {
        const d = await t.get(availRef);
        const data = d.data();
        if (data) {
            const newTaken = { ...data.takenJuz };
            delete newTaken[currentMemberData.selectedJuz];
            const newAvail = [...data.availableJuz, currentMemberData.selectedJuz].sort((a, b) => a - b);
            t.update(availRef, { takenJuz: newTaken, availableJuz: newAvail });
        }
    });
    
    // تقليل عدد أعضاء الحلقة
    const circRef = db.collection('circles').doc(currentCircleId);
    const circDoc = await circRef.get();
    await circRef.update({ memberCount: (circDoc.data().memberCount || 1) - 1 });
    
    // تعطيل العضوية
    const memberRef = db.collection('circleMembers').doc(currentMemberId);
    await memberRef.update({ isActive: false, leftAt: new Date() });
    
    // التوجيه لاختيار حلقة جديدة
    setTimeout(async () => {
        await auth.signOut();
        window.location.reload();
    }, 3000);
}

function showCompletionShareUI(completedJuz) {
    const area = document.getElementById('completionMessageArea');
    const completionText = document.getElementById('completionText');
    if(area && completionText) {
        const totalParts = currentMemberData.totalPartsRead || 0;
        const extraCount = currentMemberData.dailyGoalCompleted || 0;
        const newKhatmas = calcKhatmasFromParts(totalParts);
        const oldKhatmas = calcKhatmasFromParts(totalParts - 1);
        
        if (newKhatmas > oldKhatmas) {
            completionText.innerHTML = `🎉 مبارك! أكملت ختمة رقم ${newKhatmas}! 🎉`;
        } else {
            completionText.innerHTML = `🎉 أتممت الجزء ${completedJuz}${extraCount > 0 ? ` + ${extraCount} جزء إضافي` : ''}!`;
        }
        area.style.display = 'block';
    }
    setTimeout(() => {
        if(area) area.style.display = 'none';
    }, 30000);
}

async function completeDaily() {
    if (!currentUser || !currentMemberData) return;
    
    const today = getTodayString();
    const lastRead = currentMemberData.lastReadDate ? new Date(currentMemberData.lastReadDate.toDate()).toDateString() : null;
    
    if (lastRead === today) { 
        showToast("⚠️ أتممت اليوم بالفعل", true); 
        return; 
    }
    
    const btn = document.getElementById('completeDailyJuzBtn');
    const orig = btn?.textContent;
    if (btn) { btn.disabled = true; btn.textContent = '⏳ جاري...'; }
    
    try {
        const q = await db.collection('circleMembers').where('userId', '==', currentUser.uid).get();
        if (q.empty) throw new Error();
        const ref = q.docs[0].ref;
        
        // حفظ رقم الجزء الذي تم إكماله قبل التحديث
        const completedJuz = currentMemberData.currentJuz;
        localStorage.setItem('lastCompletedJuz', completedJuz);
        
        // حساب التقدم الجديد
        const currentJuz = currentMemberData.currentJuz;
        const newJuz = (currentJuz % 30) + 1;
        const newTotalParts = (currentMemberData.totalPartsRead || 0) + 1;
        const newKhatmas = Math.floor(newTotalParts / 30);
        const oldKhatmas = Math.floor((currentMemberData.totalPartsRead || 0) / 30);
        
        // حساب النقاط
        let newPoints = (currentMemberData.points || 0) + 1;
        let khatmaBonus = 0;
        
        if (newKhatmas > oldKhatmas) {
            khatmaBonus = 10;
            newPoints += khatmaBonus;
            showToast(`🎉 ختمة جديدة! +${khatmaBonus} نقاط`, false);
            addNotification(currentUser.uid, "🎉 ختمة", `ختمة رقم ${newKhatmas}`, 'achievement');
        }
        
        // حساب السلسلة
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        let newStreak = (currentMemberData.streakDays || 0) + 1;
        if (lastRead !== yesterday && lastRead !== null) newStreak = 1;
        
        await ref.update({ 
            currentJuz: newJuz,
            totalPartsRead: newTotalParts,
            lastReadDate: new Date(),
            streakDays: newStreak,
            points: newPoints,
            absenceCount: 0
        });
        
        currentMemberData.currentJuz = newJuz;
        currentMemberData.totalPartsRead = newTotalParts;
        currentMemberData.lastReadDate = new Date();
        currentMemberData.streakDays = newStreak;
        currentMemberData.points = newPoints;
        currentMemberData.absenceCount = 0;
        
        await checkAchievements(currentUser.uid, currentMemberData);
        showToast(`✅ تم تسجيل وردك +1 نقطة${khatmaBonus > 0 ? ` +${khatmaBonus} مكافأة ختمة` : ''}`, false);
        
        // تمرير رقم الجزء الذي تم إكماله
        showCompletionShareUI(completedJuz);
        await updateUI(); 
        await loadExtraProgress(); 
        updateJuzProgressChart();
        
    } catch (e) { 
        showToast("حدث خطأ", true); 
        if (btn) { btn.disabled = false; btn.textContent = orig; } 
    }
}

// ==================== دوال المشاركة المحسنة ====================
async function shareToSocial(platform) {
    const settingsDoc = await db.collection('appSettings').doc('config').get();
    let baseMessage = settingsDoc.exists ? settingsDoc.data().shareMessage : "🎉 أتممت وردي اليوم في تطبيق ختمتي! 📖 #ختمتي #قرآن";
    const userName = currentMemberData.userName;
    const totalParts = currentMemberData.totalPartsRead || 0;
    const khatmas = calcKhatmasFromParts(totalParts);
    // استخدام completedJuz المخزن بدلاً من currentJuz
    const completedJuz = localStorage.getItem('lastCompletedJuz') || currentMemberData.currentJuz;
    const extraCompleted = currentMemberData.dailyGoalCompleted || 0;
    const extraText = extraCompleted > 0 ? ` + ${extraCompleted} جزء إضافي` : '';
    const message = `${baseMessage}\n\nالاسم: ${userName}\nتم إتمام الجزء ${completedJuz}${extraText}\nإجمالي الأجزاء: ${totalParts}\nعدد الختمات: ${khatmas}\nالسلسلة: ${currentMemberData.streakDays || 0} يوم\n⭐ النقاط: ${Math.floor(currentMemberData.points || 0)}`;
    const encodedMessage = encodeURIComponent(message);
    let url = '';
    if (platform === 'whatsapp') {
        url = `https://wa.me/?text=${encodedMessage}`;
    } else if (platform === 'telegram') {
        url = `https://t.me/share/url?url=${encodedMessage}&text=${message}`;
    }
    if (url) window.open(url, '_blank');
}

document.getElementById('shareWhatsAppBtn')?.addEventListener('click', () => shareToSocial('whatsapp'));
document.getElementById('shareTelegramBtn')?.addEventListener('click', () => shareToSocial('telegram'));

async function loadLeaderboardOptimized() {
    if (!currentCircleId) return;
    const members = [];
    const snap = await db.collection('circleMembers').where('circleId', '==', currentCircleId).where('isActive', '==', true).get();
    snap.forEach(d => members.push(d.data()));
    members.sort((a, b) => calcTotalParts(b) - calcTotalParts(a));
    const cont = document.getElementById('leaderboardList');
    if (!cont) return;
    cont.innerHTML = '';
    let rank = 1;
    for (let m of members.slice(0, 30)) {
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
        const total = calcTotalParts(m);
        const khatmas = calcKhatmasFromParts(m.totalPartsRead || 0);
        const div = document.createElement('div');
        div.className = 'leaderboard-item';
        div.innerHTML = `<div class="leaderboard-rank">${medal}</div><div>${escapeHtml(m.userName)}</div><div>📖 ${total} جزء | 🏆 ${khatmas} ختمة</div>`;
        cont.appendChild(div);
        rank++;
    }
    if (members.length === 0) cont.innerHTML = '<p style="text-align:center;">لا يوجد أعضاء</p>';
}

async function loadGlobalOptimized() {
    const members = [];
    const snap = await db.collection('circleMembers').where('isActive', '==', true).get();
    snap.forEach(d => members.push(d.data()));
    members.sort((a, b) => calcTotalParts(b) - calcTotalParts(a));
    const cont = document.getElementById('globalRankingList');
    if (!cont) return;
    cont.innerHTML = '';
    let totalParts = 0, totalKhat = 0;
    for (let i = 0; i < Math.min(members.length, 50); i++) {
        const m = members[i];
        const tp = calcTotalParts(m);
        totalParts += tp; 
        totalKhat += calcKhatmasFromParts(m.totalPartsRead || 0);
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1;
        const div = document.createElement('div');
        div.className = 'leaderboard-item';
        div.innerHTML = `<div class="leaderboard-rank">${medal}</div><div>${escapeHtml(m.userName)}</div><div>📖 ${tp} جزء</div>`;
        cont.appendChild(div);
    }
    document.getElementById('globalTotalParts').textContent = totalParts;
    document.getElementById('globalTotalKhatmas').textContent = totalKhat;
}

async function loadCircleInfo() {
    const circ = await db.collection('circles').doc(currentCircleId).get();
    if (!circ.exists) return;
    const c = circ.data();
    const icon = c.gender === 'female' ? '👩' : c.gender === 'male' ? '👨' : '👥';
    document.getElementById('circleInfo').innerHTML = `<div class="stat-card"><h3>🔄 ${escapeHtml(c.circleName)} ${icon}</h3><p>🔑 ${c.inviteCode}</p><p>👥 ${c.memberCount || 0}/${MAX_CIRCLE_MEMBERS}</p><p>📖 جزئك: ${currentMemberData.selectedJuz}</p></div>`;
    document.getElementById('circleActions').innerHTML = `<button onclick="copyInviteCode()" style="background:#3b82f6; width:100%; padding:12px; border-radius:25px; color:white; margin-bottom:10px;">📋 نسخ الرمز</button><button onclick="leaveCircle()" style="background:#ef4444; width:100%; padding:12px; border-radius:25px; color:white;">🚪 مغادرة</button>`;
    const members = await db.collection('circleMembers').where('circleId', '==', currentCircleId).where('isActive', '==', true).get();
    const list = document.getElementById('circleMembersList');
    list.innerHTML = '<h4>👥 الأعضاء:</h4>';
    for (let d of members.docs) {
        const m = d.data();
        list.innerHTML += `<div class="member-item"><span>${escapeHtml(m.userName)} ${m.userId === currentUser.uid ? '(أنت)' : ''}</span><span>الجزء ${m.selectedJuz}</span></div>`;
    }
}
window.copyInviteCode = async function () { const c = await db.collection('circles').doc(currentCircleId).get(); await navigator.clipboard.writeText(c.data().inviteCode); showToast("✅ تم نسخ الرمز"); };
window.leaveCircle = async function () {
    if (!confirm('⚠️ هل أنت متأكد؟')) return;
    const q = await db.collection('circleMembers').where('userId', '==', currentUser.uid).where('isActive', '==', true).get();
    if (q.empty) return;
    const mem = q.docs[0], data = mem.data(), availRef = db.collection('circleAvailableJuz').doc(data.circleId);
    await db.runTransaction(async t => {
        const d = await t.get(availRef);
        const dt = d.data();
        if (dt) {
            const newTaken = { ...dt.takenJuz };
            delete newTaken[data.selectedJuz];
            const newAvail = [...dt.availableJuz, data.selectedJuz].sort((a, b) => a - b);
            t.update(availRef, { takenJuz: newTaken, availableJuz: newAvail });
        }
    });
    const circRef = db.collection('circles').doc(data.circleId);
    const circDoc = await circRef.get();
    await circRef.update({ memberCount: (circDoc.data().memberCount || 1) - 1 });
    await mem.ref.update({ isActive: false, leftAt: new Date() });
    showToast("✅ تم المغادرة");
    setTimeout(async () => { await auth.signOut(); window.location.reload(); }, 2000);
};

async function loadAchievements() {
    const cont = document.getElementById('achievementsList');
    const earned = currentMemberData.achievements || [];
    cont.innerHTML = '';
    for (let [key, ach] of Object.entries(ACHIEVEMENTS)) {
        const isEarned = earned.includes(key);
        const div = document.createElement('div');
        div.className = `achievement-card ${isEarned ? 'earned' : ''}`;
        div.innerHTML = `<div class="achievement-icon">${ach.icon}</div><div class="achievement-name">${ach.name}</div><div class="achievement-desc">${ach.desc}</div>`;
        cont.appendChild(div);
    }
}

async function loadNotificationsNoIndex() {
    const cont = document.getElementById('userNotificationsList');
    if (!cont) return;
    try {
        const allNotif = await db.collection('notifications').get();
        const notifications = [];
        allNotif.forEach(d => {
            const n = d.data();
            if (n.userId === currentUser.uid) notifications.push({ id: d.id, ...n });
        });
        notifications.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));
        const limited = notifications.slice(0, 50);
        if (limited.length === 0) { cont.innerHTML = '<p style="text-align:center;">لا توجد إشعارات</p>'; return; }
        cont.innerHTML = '';
        for (let n of limited) {
            const date = n.createdAt?.toDate().toLocaleDateString('ar') || '';
            const div = document.createElement('div');
            div.className = `user-notification-item ${!n.read ? 'unread' : ''}`;
            div.innerHTML = `<div class="title">${escapeHtml(n.title)}</div><div class="message">${escapeHtml(n.message)}</div><div class="date">${date}</div>`;
            div.onclick = async () => { if (!n.read) await db.collection('notifications').doc(n.id).update({ read: true }); };
            cont.appendChild(div);
        }
    } catch (error) { console.error(error); cont.innerHTML = '<p style="text-align:center;">خطأ في تحميل الإشعارات</p>'; }
}

window.createCircle = async function () {
    const name = prompt("اسم الحلقة:", "حلقة جديدة");
    if (!name) return;
    const gender = prompt("نوع الحلقة (ذكر/أنثى/مختلط):", "مختلط");
    let g = 'mixed';
    if (gender === 'ذكر' || gender === 'male') g = 'male';
    else if (gender === 'أنثى' || gender === 'female') g = 'female';
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
        await db.collection('circles').add({ circleName: name, inviteCode: code, gender: g, createdBy: auth.currentUser?.uid, createdAt: new Date(), memberCount: 0 });
        showToast("✅ تم إنشاء الحلقة");
        await loadAdminCircles();
        await loadAdminData();
    } catch (error) { console.error(error); showToast("حدث خطأ", true); }
};

async function loadAdminData() {
    if (!isAdmin) return;
    const usersSnap = await db.collection('circleMembers').get();
    const users = [];
    usersSnap.forEach(d => { if (d.data().isActive === true) users.push(d.data()); });
    const circles = await db.collection('circles').get();
    let khat = 0, parts = 0;
    users.forEach(u => { 
        khat += calcKhatmasFromParts(u.totalPartsRead || 0); 
        parts += calcTotalParts(u); 
    });
    document.getElementById('totalUsers').textContent = users.length;
    document.getElementById('totalCircles').textContent = circles.size;
    document.getElementById('totalKhatmas').textContent = khat;
    document.getElementById('totalPartsAll').textContent = parts;
    document.getElementById('femaleCirclesCount').textContent = circles.docs.filter(d => d.data().gender === 'female').length;
    const today = getTodayString();
    let active = 0;
    users.forEach(u => { const last = u.lastReadDate; if (last && new Date(last.toDate()).toDateString() === today) active++; });
    document.getElementById('dailyActivity').textContent = users.length ? Math.round(active / users.length * 100) + '%' : '0%';
    await loadAdminCircles();
    await loadAdminUsers();
    await loadAdminCharts(users, circles);
    await refreshExtraPoolStats();
}

async function loadAdminCharts(users, circles) {
    const weeklyCtx = document.getElementById('weeklyActivityChart')?.getContext('2d');
    if (weeklyCtx && weeklyChart) weeklyChart.destroy();
    if (weeklyCtx) {
        const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        const counts = [0,0,0,0,0,0,0];
        users.forEach(u => {
            if (u.lastReadDate) {
                const day = new Date(u.lastReadDate.toDate()).getDay();
                counts[day]++;
            }
        });
        weeklyChart = new Chart(weeklyCtx, {
            type: 'bar', data: { labels: days, datasets: [{ label: 'نشاط يومي', data: counts, backgroundColor: '#1a4739' }] }
        });
    }
    const topCtx = document.getElementById('topUsersChart')?.getContext('2d');
    if (topCtx && topUsersChart) topUsersChart.destroy();
    if (topCtx) {
        const top = [...users].sort((a,b) => calcTotalParts(b)-calcTotalParts(a)).slice(0,5);
        topUsersChart = new Chart(topCtx, {
            type: 'pie', data: { labels: top.map(u => u.userName), datasets: [{ data: top.map(u => calcTotalParts(u)), backgroundColor: ['#fbbf24','#f59e0b','#1a4739','#3b82f6','#ec489a'] }] }
        });
    }
    const retentionCtx = document.getElementById('retentionChart')?.getContext('2d');
    if (retentionCtx && retentionChart) retentionChart.destroy();
    if (retentionCtx) {
        const activeDay1 = users.filter(u => u.lastReadDate && (new Date() - u.lastReadDate.toDate()) < 86400000).length;
        const activeDay7 = users.filter(u => u.lastReadDate && (new Date() - u.lastReadDate.toDate()) < 7*86400000).length;
        const activeDay30 = users.filter(u => u.lastReadDate && (new Date() - u.lastReadDate.toDate()) < 30*86400000).length;
        retentionChart = new Chart(retentionCtx, {
            type: 'line',
            data: { labels: ['اليوم الأول', '7 أيام', '30 يوماً'], datasets: [{ label: 'معدل الاحتفاظ (%)', data: [users.length ? (activeDay1/users.length*100).toFixed(1) : 0, users.length ? (activeDay7/users.length*100).toFixed(1) : 0, users.length ? (activeDay30/users.length*100).toFixed(1) : 0], borderColor: '#1a4739', tension: 0.3 }] }
        });
    }
    const circlesCtx = document.getElementById('circlesActivityChart')?.getContext('2d');
    if (circlesCtx && circlesActivityChart) circlesActivityChart.destroy();
    if (circlesCtx) {
        const circleNames = circles.docs.map(d => d.data().circleName);
        const activeMembersCount = [];
        for (let doc of circles.docs) {
            const members = await db.collection('circleMembers').where('circleId', '==', doc.id).where('isActive', '==', true).get();
            activeMembersCount.push(members.size);
        }
        circlesActivityChart = new Chart(circlesCtx, {
            type: 'bar',
            data: { labels: circleNames, datasets: [{ label: 'الأعضاء النشطون', data: activeMembersCount, backgroundColor: '#fbbf24' }] }
        });
    }
}

async function loadAdminCircles() {
    const circles = await db.collection('circles').get();
    const cont = document.getElementById('circlesList');
    cont.innerHTML = '';
    for (let doc of circles.docs) {
        const c = doc.data();
        const membersSnap = await db.collection('circleMembers').get();
        let activeCount = 0;
        membersSnap.forEach(m => { if (m.data().circleId === doc.id && m.data().isActive === true) activeCount++; });
        cont.innerHTML += `<div class="admin-list-item"><div><strong>🔄 ${escapeHtml(c.circleName)} ${c.gender === 'female' ? '👩' : c.gender === 'male' ? '👨' : '👥'}</strong><br><small>🔑 ${c.inviteCode} | 👥 ${activeCount}/${MAX_CIRCLE_MEMBERS}</small></div><div><button onclick="editCircle('${doc.id}')" class="edit-btn">✏️</button><button onclick="deleteCircle('${doc.id}')" class="delete-btn">🗑️</button></div></div>`;
    }
}

async function loadAdminUsers() {
    const members = [];
    const snap = await db.collection('circleMembers').get();
    snap.forEach(d => { if (d.data().isActive === true) members.push({ id: d.id, ...d.data() }); });
    const circleFilter = document.getElementById('filterCircle')?.value;
    const genderFilter = document.getElementById('filterGender')?.value;
    const search = document.getElementById('searchUser')?.value.toLowerCase();
    let filtered = members;
    if (circleFilter && circleFilter !== 'all') filtered = filtered.filter(m => m.circleId === circleFilter);
    if (genderFilter && genderFilter !== 'all') filtered = filtered.filter(m => m.userGender === genderFilter);
    if (search) filtered = filtered.filter(m => m.userName?.toLowerCase().includes(search) || m.userEmail?.toLowerCase().includes(search));
    filtered.sort((a, b) => calcTotalParts(b) - calcTotalParts(a));
    const cont = document.getElementById('usersList');
    cont.innerHTML = '';
    for (let m of filtered) {
        const total = calcTotalParts(m);
        const khatmas = calcKhatmasFromParts(m.totalPartsRead || 0);
        cont.innerHTML += `<div class="admin-list-item"><div><strong>${escapeHtml(m.userName)}</strong><br><small>📧 ${m.userEmail} | ${m.userGender === 'female' ? '👩' : '👨'}</small><br><small>📖 ${total} جزء | 🏆 ${khatmas} ختمة</small><br><small>📦 أجزاء إضافية مقروءة: ${m.totalExtraJuz || 0}</small><br><small>⚠️ غياب: ${m.absenceCount || 0} يوم</small></div><div><button onclick="editUser('${m.id}')" class="edit-btn">✏️</button><button onclick="deleteUser('${m.id}')" class="delete-btn">🗑️</button></div></div>`;
    }
    const circles = await db.collection('circles').get();
    const select = document.getElementById('filterCircle');
    if (select) select.innerHTML = '<option value="all">جميع الحلقات</option>' + circles.docs.map(d => `<option value="${d.id}">${escapeHtml(d.data().circleName)}</option>`).join('');
}

window.editCircle = async function (id) {
    const c = (await db.collection('circles').doc(id).get()).data();
    const newName = prompt("الاسم الجديد:", c.circleName);
    if (newName && newName.trim()) { await db.collection('circles').doc(id).update({ circleName: newName.trim() }); await loadAdminCircles(); showToast("✅ تم التعديل"); }
};
window.deleteCircle = async function (id) {
    if (!confirm("⚠️ حذف الحلقة؟")) return;
    const members = await db.collection('circleMembers').get();
    for (let m of members.docs) if (m.data().circleId === id) await m.ref.delete();
    await db.collection('circleAvailableJuz').doc(id).delete();
    await db.collection('circles').doc(id).delete();
    await loadAdminCircles(); await loadAdminData(); showToast("✅ تم الحذف");
};
window.editUser = async function (id) {
    const u = (await db.collection('circleMembers').doc(id).get()).data();
    const newName = prompt("الاسم الجديد:", u.userName);
    if (newName && newName.trim()) { await db.collection('circleMembers').doc(id).update({ userName: newName.trim() }); await loadAdminUsers(); showToast("✅ تم التعديل"); }
};
window.deleteUser = async function (id) {
    if (!confirm("⚠️ حذف المستخدم؟")) return;
    const u = (await db.collection('circleMembers').doc(id).get()).data();
    if (u) {
        const avail = db.collection('circleAvailableJuz').doc(u.circleId);
        const doc = await avail.get();
        if (doc.exists) {
            const data = doc.data();
            const newTaken = { ...data.takenJuz };
            delete newTaken[u.selectedJuz];
            const newAvail = [...data.availableJuz, u.selectedJuz].sort((a, b) => a - b);
            await avail.update({ takenJuz: newTaken, availableJuz: newAvail });
        }
    }
    await db.collection('circleMembers').doc(id).delete();
    await loadAdminUsers(); await loadAdminData(); showToast("✅ تم الحذف");
};
window.sendBroadcastNotification = async function () {
    const title = document.getElementById('notificationTitle')?.value;
    const msg = document.getElementById('notificationMessage')?.value;
    if (!title || !msg) { showToast("املأ البيانات", true); return; }
    const usersSnap = await db.collection('circleMembers').get();
    let count = 0;
    for (let d of usersSnap.docs) if (d.data().isActive === true) { await addNotification(d.data().userId, title, msg, 'broadcast'); count++; }
    showToast(`✅ تم الإرسال إلى ${count} مستخدم`);
    document.getElementById('notificationTitle').value = ''; document.getElementById('notificationMessage').value = '';
};

window.generateFullReport = async function () {
    const cont = document.getElementById('reportContent');
    const usersSnap = await db.collection('circleMembers').get();
    const users = [];
    usersSnap.forEach(d => { if (d.data().isActive === true) users.push({ id: d.id, ...d.data() }); });
    const circles = await db.collection('circles').get();
    let totalParts = 0, totalKhat = 0, totalExtra = 0;
    let usersTableRows = '';
    for (const u of users) {
        const total = calcTotalParts(u);
        const khatmas = calcKhatmasFromParts(u.totalPartsRead || 0);
        totalParts += total;
        totalKhat += khatmas;
        totalExtra += u.totalExtraJuz || 0;
        usersTableRows += `
            <tr style="border-bottom:1px solid #ddd;">
                <td style="padding:8px;">${escapeHtml(u.userName)}</td>
                <td style="padding:8px;">${u.selectedJuz}</td>
                <td style="padding:8px;">${total}</td>
                <td style="padding:8px;">${khatmas}</td>
                <td style="padding:8px;">${u.totalExtraJuz || 0}</td>
                <td style="padding:8px;">${u.streakDays || 0}</td>
                <td style="padding:8px;">${Math.floor(u.points || 0)}</td>
                <td style="padding:8px;">${u.absenceCount || 0}</td>
            </tr>
        `;
    }
    cont.innerHTML = `
        <div class="report-section">
            <h4>📊 تقرير شامل مع تفاصيل الأجزاء الإضافية</h4>
            <div class="report-stats">
                <div class="report-stat"><div class="label">👥 المستخدمين</div><div class="value">${users.length}</div></div>
                <div class="report-stat"><div class="label">🔄 الحلقات</div><div class="value">${circles.size}</div></div>
                <div class="report-stat"><div class="label">📖 إجمالي الأجزاء المقروءة</div><div class="value">${totalParts}</div></div>
                <div class="report-stat"><div class="label">🏆 إجمالي الختمات</div><div class="value">${totalKhat}</div></div>
                <div class="report-stat"><div class="label">📦 إجمالي الأجزاء الإضافية</div><div class="value">${totalExtra}</div></div>
            </div>
        </div>
        <div class="report-section">
            <h4>📋 تفاصيل المستخدمين</h4>
            <div style="overflow-x: auto;">
                <table style="width:100%; border-collapse:collapse; font-size:12px;">
                    <thead>
                        <tr><th style="text-align:right; padding:6px;">الاسم</th><th style="text-align:right; padding:6px;">الجزء</th><th style="text-align:right; padding:6px;">إجمالي الأجزاء</th><th style="text-align:right; padding:6px;">الختمات</th><th style="text-align:right; padding:6px;">أجزاء إضافية</th><th style="text-align:right; padding:6px;">السلسلة</th><th style="text-align:right; padding:6px;">النقاط</th><th style="text-align:right; padding:6px;">أيام الغياب</th></tr>
                    </thead>
                    <tbody>${usersTableRows}</tbody>
                </table>
            </div>
        </div>
    `;
};

window.exportReportToExcel = function() {
    const reportContent = document.getElementById('reportContent');
    if (!reportContent) return;
    
    const table = reportContent.querySelector('table');
    if (!table) {
        showToast("لا توجد بيانات لتصديرها", true);
        return;
    }
    
    const rows = table.querySelectorAll('tr');
    const data = [];
    
    const headers = [];
    const headerCells = rows[0].querySelectorAll('th');
    headerCells.forEach(cell => {
        headers.push(cell.innerText.trim());
    });
    
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.querySelectorAll('td');
        const rowData = {};
        cells.forEach((cell, index) => {
            if (headers[index]) {
                rowData[headers[index]] = cell.innerText.trim();
            }
        });
        if (Object.keys(rowData).length > 0) {
            data.push(rowData);
        }
    }
    
    const stats = reportContent.querySelectorAll('.report-stat');
    const summary = {};
    stats.forEach(stat => {
        const label = stat.querySelector('.label')?.innerText;
        const value = stat.querySelector('.value')?.innerText;
        if (label && value) {
            summary[label] = value;
        }
    });
    
    const wsData = [
        ['تقرير ختمتي'],
        [`تاريخ التقرير: ${new Date().toLocaleDateString('ar')}`],
        [],
        ['الإحصائيات العامة'],
        ...Object.entries(summary).map(([k, v]) => [k, v]),
        [],
        ['تفاصيل المستخدمين'],
        [],
        headers,
        ...data.map(row => headers.map(h => row[h] || ''))
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'تقرير ختمتي');
    ws['!cols'] = headers.map(() => ({ wch: 15 }));
    XLSX.writeFile(wb, `تقرير_ختمتي_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.xlsx`);
    showToast("✅ تم تصدير التقرير بنجاح", false);
};

window.downloadReportAsPDF = async function () {
    const cont = document.getElementById('reportContent');
    if (!cont) return;
    showToast("جاري إنشاء PDF...");
    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        pdf.text("تقرير ختمتي", 105, 20, { align: "center" });
        pdf.text(`التاريخ: ${new Date().toLocaleDateString('ar')}`, 105, 30, { align: "center" });
        let y = 50;
        const lines = pdf.splitTextToSize(cont.innerText, 170);
        for (let line of lines) { if (y > 280) { pdf.addPage(); y = 20; } pdf.text(line, 20, y); y += 7; }
        pdf.save(`تقرير_ختمتي.pdf`);
        showToast("✅ تم التحميل");
    } catch (e) { showToast("خطأ", true); }
};

window.exportCirclesToExcel = function () {
    db.collection('circles').get().then(snap => { const data = snap.docs.map(d => ({ 'اسم الحلقة': d.data().circleName, 'رمز الدعوة': d.data().inviteCode, 'النوع': d.data().gender, 'الأعضاء': d.data().memberCount || 0 })); const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'الحلقات'); XLSX.writeFile(wb, `حلقات_ختمتي.xlsx`); showToast("✅ تم التصدير"); }).catch(e => showToast("خطأ", true));
};
window.exportUsersToExcel = function () {
    db.collection('circleMembers').get().then(snap => { const data = []; snap.forEach(d => { const m = d.data(); if (m.isActive === true) data.push({ 'الاسم': m.userName, 'البريد': m.userEmail, 'الجزء': m.currentJuz, 'الأجزاء المقروءة': calcTotalParts(m), 'الختمات': calcKhatmasFromParts(m.totalPartsRead || 0), 'أجزاء إضافية': m.totalExtraJuz || 0, 'أيام الغياب': m.absenceCount || 0 }); }); const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'المستخدمين'); XLSX.writeFile(wb, `مستخدمين_ختمتي.xlsx`); showToast("✅ تم التصدير"); }).catch(e => showToast("خطأ", true));
};
window.updateMaxMembers = async function () {
    const newMax = parseInt(document.getElementById('maxCircleMembers')?.value);
    if (newMax && newMax >= 5 && newMax <= 100) {
        await db.collection('appSettings').doc('config').set({ maxCircleMembers: newMax, updatedAt: new Date() }, { merge: true });
        MAX_CIRCLE_MEMBERS = newMax;
        localStorage.setItem('maxCircleMembers', newMax);
        showToast(`✅ تم التحديث إلى ${newMax}`);
    }
};

window.joinByInviteCode = async function () {
    const code = document.getElementById('inviteCodeInput')?.value.trim().toUpperCase();
    if (!code) { showMessage('authMessage', 'أدخل رمز الدعوة'); return; }
    const snap = await db.collection('circles').where('inviteCode', '==', code).limit(1).get();
    if (snap.empty) { showMessage('authMessage', '❌ رمز غير صحيح'); return; }
    const circle = snap.docs[0].data();
    if ((circle.memberCount || 0) >= MAX_CIRCLE_MEMBERS) { showMessage('authMessage', '❌ مكتملة'); return; }
    if (circle.gender !== 'mixed' && circle.gender !== currentUserGender) { showMessage('authMessage', `❌ مخصصة لل${circle.gender === 'female' ? 'نساء' : 'رجال'}`); return; }
    if (confirm(`الانضمام إلى "${circle.circleName}"؟`)) {
        document.getElementById('inviteCodeModal').style.display = 'none';
        pendingCircleId = snap.docs[0].id;
        await showAvailableJuz(snap.docs[0].id);
    }
};
window.sendCustomMessage = function () { showToast("✅ تم الإرسال"); document.getElementById('messageModal').style.display = 'none'; };
window.confirmRedistribute = function () { showToast("جاري إعادة التوزيع..."); document.getElementById('redistributeModal').style.display = 'none'; };

// ==================== دوال عرض نص الجزء المحسن ====================
async function showJuzText(juzNumber) {
    if (!juzNumber || juzNumber < 1 || juzNumber > 30) {
        showToast("رقم جزء غير صالح", true);
        return;
    }
    const viewer = document.getElementById('juzTextViewer');
    const contentDiv = document.getElementById('juzTextContent');
    const viewerJuzSpan = document.getElementById('viewerJuzNumber');

    viewerJuzSpan.innerText = juzNumber;
    contentDiv.innerHTML = '<div class="loading-indicator">📖 جاري تحميل النص...</div>';
    viewer.style.display = 'block';

    try {
        const response = await fetch(`${QURAN_API_BASE}/juz/${juzNumber}/quran-uthmani`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();

        if (result.code !== 200 || !result.data || !result.data.ayahs) {
            throw new Error('البيانات غير متاحة');
        }

        const ayahs = result.data.ayahs;
        const pagesMap = new Map();
        
        for (const ayah of ayahs) {
            const pageNum = ayah.page;
            if (!pagesMap.has(pageNum)) {
                pagesMap.set(pageNum, []);
            }
            pagesMap.get(pageNum).push(ayah);
        }
        
        const pages = Array.from(pagesMap.keys()).sort((a, b) => a - b);
        currentQuranPages = pages.map(pageNum => {
            const pageAyahs = pagesMap.get(pageNum);
            let pageHtml = `<div class="quran-page" data-page="${pageNum}"><h5>📄 الصفحة ${pageNum}</h5>`;
            for (const ayah of pageAyahs) {
                pageHtml += `<div class="ayah-with-number">
                    <span class="ayah-text">${ayah.text}</span>
                    <span class="ayah-number">${ayah.numberInSurah}</span>
                </div>`;
            }
            pageHtml += `</div>`;
            return pageHtml;
        });
        
        currentPageIndex = 0;
        updatePageDisplay();
        
        showToast(`✅ تم تحميل نص الجزء ${juzNumber} بنجاح (${pages.length} صفحة).`, false, 2000);
    } catch (error) {
        console.error('حدث خطأ في جلب نص الجزء:', error);
        contentDiv.innerHTML = `<p class="error-message">⚠️ حدث خطأ أثناء تحميل النص. الرجاء المحاولة لاحقاً.</p>`;
        showToast('فشل تحميل نص الجزء', true);
    }
}

function updatePageDisplay() {
    const contentDiv = document.getElementById('juzTextContent');
    const pageDisplay = document.getElementById('currentPageDisplay');
    if (currentQuranPages.length === 0) {
        contentDiv.innerHTML = '<p class="error-message">لا توجد صفحات لعرضها</p>';
        if(pageDisplay) pageDisplay.innerText = 'الصفحة 0 / 0';
        return;
    }
    contentDiv.innerHTML = currentQuranPages[currentPageIndex];
    if(pageDisplay) pageDisplay.innerText = `الصفحة ${currentPageIndex + 1} / ${currentQuranPages.length}`;
}

function nextPage() {
    if (currentQuranPages.length > 0 && currentPageIndex < currentQuranPages.length - 1) {
        currentPageIndex++;
        updatePageDisplay();
    } else {
        showToast("هذه آخر صفحة في الجزء", false, 1500);
    }
}

function prevPage() {
    if (currentQuranPages.length > 0 && currentPageIndex > 0) {
        currentPageIndex--;
        updatePageDisplay();
    } else {
        showToast("هذه أول صفحة في الجزء", false, 1500);
    }
}

document.getElementById('viewJuzTextBtn')?.addEventListener('click', () => {
    const curJuz = currentMemberData?.currentJuz || 1;
    showJuzText(curJuz);
});
document.getElementById('closeTextViewer')?.addEventListener('click', () => {
    document.getElementById('juzTextViewer').style.display = 'none';
});
document.getElementById('prevPageBtn')?.addEventListener('click', prevPage);
document.getElementById('nextPageBtn')?.addEventListener('click', nextPage);

// ==================== دوال تشغيل الصوت (آية آية) ====================
function stopAudio() {
    if (audio) {
        audio.pause();
        audio.src = '';
        audio.onended = null;
        audio.onerror = null;
    }
    currentAudioQueue = [];
    currentAudioIndex = 0;
    isPlaying = false;
    currentPlayingJuz = null;
    totalAyahsInJuz = 0;
}

async function testAudioUrl(url, timeout = 5000) {
    return new Promise((resolve) => {
        const testAudio = new Audio();
        testAudio.src = url;
        let resolved = false;
        
        const cleanup = () => {
            testAudio.pause();
            testAudio.src = '';
            testAudio.oncanplay = null;
            testAudio.onerror = null;
        };
        
        testAudio.oncanplay = () => {
            if (!resolved) {
                resolved = true;
                cleanup();
                resolve(true);
            }
        };
        
        testAudio.onerror = () => {
            if (!resolved) {
                resolved = true;
                cleanup();
                resolve(false);
            }
        };
        
        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                cleanup();
                resolve(false);
            }
        }, timeout);
    });
}

async function playJuzAudio() {
    const juzNum = currentMemberData?.currentJuz || 1;
    const playerDiv = document.getElementById('audioPlayer');
    const audioJuzSpan = document.getElementById('audioJuzName');
    
    stopAudio();
    
    audioJuzSpan.innerText = `الجزء ${juzNum} (جلب البيانات...)`;
    playerDiv.style.display = 'block';
    currentPlayingJuz = juzNum;
    
    try {
        showToast(`📡 جاري تحميل بيانات الجزء ${juzNum}...`, false);
        const response = await fetch(`${QURAN_API_BASE}/juz/${juzNum}`);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        
        if (result.code !== 200 || !result.data || !result.data.ayahs) {
            throw new Error('لا توجد بيانات للجزء');
        }
        
        const ayahs = result.data.ayahs;
        totalAyahsInJuz = ayahs.length;
        
        currentAudioQueue = [];
        
        for (let i = 0; i < ayahs.length; i++) {
            const ayah = ayahs[i];
            const surahNum = ayah.surah.number;
            const ayahNum = ayah.numberInSurah;
            
            let audioUrl = null;
            for (let srcIdx = 0; srcIdx < AUDIO_SOURCES.length; srcIdx++) {
                const source = AUDIO_SOURCES[srcIdx];
                let url;
                if (source.type === 'ayah') {
                    url = `${source.url}/${source.pattern(surahNum.toString(), ayahNum.toString())}`;
                } else {
                    url = `${source.url}/${source.pattern(surahNum.toString(), ayahNum.toString())}`;
                }
                audioUrl = url;
                break;
            }
            
            currentAudioQueue.push({
                url: audioUrl,
                surah: surahNum,
                ayah: ayahNum,
                index: i + 1
            });
        }
        
        if (currentAudioQueue.length === 0) {
            throw new Error('لا توجد روابط صوتية متاحة');
        }
        
        currentAudioIndex = 0;
        isPlaying = true;
        playCurrentAyahInJuz();
        
        audioJuzSpan.innerText = `الجزء ${juzNum} (0/${totalAyahsInJuz}) - جاري التشغيل...`;
        showToast(`✅ تم تحميل ${totalAyahsInJuz} آية. بدء التلاوة...`, false, 3000);
        
    } catch (error) {
        console.error('خطأ في تحضير الصوت:', error);
        showToast(`❌ فشل تحميل صوت الجزء ${juzNum}: ${error.message}`, true);
        audioJuzSpan.innerText = `الجزء ${juzNum} (خطأ)`;
        playerDiv.style.display = 'none';
    }
}

function playCurrentAyahInJuz() {
    if (!isPlaying || currentAudioIndex >= currentAudioQueue.length) {
        finishJuzPlayback();
        return;
    }
    
    const ayah = currentAudioQueue[currentAudioIndex];
    const ayahNumDisplay = currentAudioIndex + 1;
    const audioJuzSpan = document.getElementById('audioJuzName');
    
    if (audioJuzSpan) {
        audioJuzSpan.innerText = `الجزء ${currentPlayingJuz} (${ayahNumDisplay}/${totalAyahsInJuz}) - سورة ${ayah.surah} آية ${ayah.ayah}`;
    }
    
    audio.src = ayah.url;
    audio.currentTime = 0;
    
    const playPromise = audio.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.warn('التشغيل التلقائي محظور:', error);
            showToast('⚠️ اضغط على زر التشغيل لبدء التلاوة', false, 3000);
        });
    }
    
    audio.onended = () => {
        currentAudioIndex++;
        playCurrentAyahInJuz();
    };
    
    audio.onerror = (e) => {
        console.warn(`خطأ في تحميل الآية ${currentAudioIndex + 1}:`, e);
        currentAudioIndex++;
        playCurrentAyahInJuz();
    };
}

function finishJuzPlayback() {
    isPlaying = false;
    const audioJuzSpan = document.getElementById('audioJuzName');
    if (audioJuzSpan) {
        audioJuzSpan.innerText = `الجزء ${currentPlayingJuz} (تم ✅)`;
    }
    showToast(`🎉 انتهى تلاوة الجزء ${currentPlayingJuz} بنجاح!`, false, 5000);
    currentPlayingJuz = null;
}

function pauseAudio() {
    if (audio) {
        isPlaying = false;
        audio.pause();
    }
}

function resumeAudio() {
    if (audio && currentAudioQueue.length > 0 && currentAudioIndex < currentAudioQueue.length) {
        isPlaying = true;
        audio.play().catch(e => console.warn(e));
    }
}

document.getElementById('playAudioBtn')?.addEventListener('click', playJuzAudio);
document.getElementById('playAudioCtrl')?.addEventListener('click', resumeAudio);
document.getElementById('pauseAudioCtrl')?.addEventListener('click', pauseAudio);
document.getElementById('closeAudioPlayer')?.addEventListener('click', () => {
    stopAudio();
    document.getElementById('audioPlayer').style.display = 'none';
});

function shareAchievement() {
    const userName = currentMemberData.userName;
    const totalParts = currentMemberData.totalPartsRead || 0;
    const streak = currentMemberData.streakDays || 0;
    const points = Math.floor(currentMemberData.points || 0);
    document.getElementById('shareUserName').innerText = userName;
    document.getElementById('shareTotalParts').innerText = totalParts;
    document.getElementById('shareStreak').innerText = streak;
    document.getElementById('sharePoints').innerText = points;
    document.getElementById('shareModal').style.display = 'flex';
}
document.getElementById('shareAchievementBtn')?.addEventListener('click', shareAchievement);
document.getElementById('doShareBtn')?.addEventListener('click', async () => {
    const card = document.getElementById('shareCardPreview');
    try {
        const canvas = await html2canvas(card);
        const imgData = canvas.toDataURL('image/png');
        if (navigator.share) {
            const blob = await (await fetch(imgData)).blob();
            const file = new File([blob], 'achievement.png', { type: 'image/png' });
            await navigator.share({ files: [file], title: 'إنجازي في ختمتي', text: 'أنا فخور بإنجازي في تطبيق ختمتي!' });
        } else {
            const link = document.createElement('a');
            link.download = 'achievement.png';
            link.href = imgData;
            link.click();
            showToast("✅ تم حفظ الصورة");
        }
    } catch (err) {
        showToast("فشل المشاركة", true);
    }
    document.getElementById('shareModal').style.display = 'none';
});

// ==================== أحداث النماذج والتبويبات ====================
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('regName').value.trim(), email = document.getElementById('regEmail').value.trim(), gender = document.getElementById('regGender').value, pass = document.getElementById('regPassword').value, confirm = document.getElementById('regConfirmPassword').value;
    if (pass !== confirm) { showMessage('authMessage', 'كلمة السر غير متطابقة'); return; }
    if (pass.length < 6) { showMessage('authMessage', '6 أحرف على الأقل'); return; }
    if (username.length < 3) { showMessage('authMessage', 'اسم المستخدم 3 أحرف'); return; }
    if (!email.includes('@')) { showMessage('authMessage', 'بريد غير صحيح'); return; }
    if (!gender) { showMessage('authMessage', 'اختر الجنس'); return; }
    const avail = await checkUsername(username);
    if (!avail) { showMessage('authMessage', 'اسم المستخدم غير متاح'); return; }
    const btn = document.getElementById('registerBtn'), orig = btn.textContent;
    btn.textContent = '⏳ جاري...'; btn.disabled = true;
    try {
        const uc = await auth.createUserWithEmailAndPassword(email, pass);
        await uc.user.updateProfile({ displayName: username });
        await uc.user.sendEmailVerification();
        await db.collection('users').doc(uc.user.uid).set({ name: username, username, email, gender, role: 'user', createdAt: new Date() });
        showMessage('authMessage', '✅ تم التسجيل، يرجى تفعيل بريدك الإلكتروني', false);
        await auth.signOut();
    } catch (err) { let msg = 'حدث خطأ'; if (err.code === 'auth/email-already-in-use') msg = 'البريد مستخدم'; if (err.code === 'auth/weak-password') msg = 'كلمة سر ضعيفة'; showMessage('authMessage', msg); }
    finally { btn.textContent = orig; btn.disabled = false; }
});
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('loginUsername').value.trim(), pass = document.getElementById('loginPassword').value, btn = e.target.querySelector('button'), orig = btn.textContent;
    btn.textContent = '⏳ جاري...'; btn.disabled = true;
    try {
        const uc = await loginWithUsernameOrEmail(id, pass);
        currentUser = uc.user;
        const isAd = await checkIfAdmin(currentUser);
        if (isAd) { await loadAdminData(); showScreen('adminScreen'); }
        else { await initFCM(); await loadUserData(); }
    } catch (err) { showMessage('authMessage', 'اسم المستخدم أو كلمة السر غير صحيحة'); }
    finally { btn.textContent = orig; btn.disabled = false; }
});
document.getElementById('logoutBtn')?.addEventListener('click', () => auth.signOut());
document.getElementById('adminLogoutBtn')?.addEventListener('click', () => auth.signOut());
document.getElementById('adminPanelBtn')?.addEventListener('click', async () => { await loadAdminData(); showScreen('adminScreen'); });
document.getElementById('backToUserBtn')?.addEventListener('click', () => showScreen('mainScreen'));
document.getElementById('completeDailyJuzBtn')?.addEventListener('click', completeDaily);
document.getElementById('createCircleBtn')?.addEventListener('click', createCircle);
document.getElementById('joinByCodeBtn')?.addEventListener('click', () => document.getElementById('inviteCodeModal').style.display = 'flex');
document.getElementById('confirmInviteBtn')?.addEventListener('click', joinByInviteCode);
document.getElementById('refreshCirclesBtn')?.addEventListener('click', refreshCircles);
document.getElementById('exitToAuthBtn')?.addEventListener('click', exitToAuth);
document.getElementById('filterAllCircles')?.addEventListener('click', () => { if (pendingUserData) showAvailableCircles(pendingUserData); });
document.getElementById('filterFemaleCircles')?.addEventListener('click', () => { if (pendingUserData) showAvailableCircles(pendingUserData); });
document.getElementById('filterMaleCircles')?.addEventListener('click', () => { if (pendingUserData) showAvailableCircles(pendingUserData); });
document.getElementById('filterCircle')?.addEventListener('change', () => loadAdminUsers());
document.getElementById('filterGender')?.addEventListener('change', () => loadAdminUsers());
document.getElementById('searchUser')?.addEventListener('input', () => loadAdminUsers());
document.getElementById('updateAdminPasswordBtn')?.addEventListener('click', async () => {
    const newPass = document.getElementById('adminNewPassword').value;
    if (!newPass || newPass.length < 6) { showMessage('authMessage', '6 أحرف على الأقل'); return; }
    try { await currentUser.updatePassword(newPass); showMessage('authMessage', '✅ تم التحديث', false); document.getElementById('adminNewPassword').value = ''; } catch (e) { showMessage('authMessage', 'حدث خطأ'); }
});
document.getElementById('addExtraJuzBtn')?.addEventListener('click', showExtraJuzModal);
document.getElementById('refillExtraPoolBtn')?.addEventListener('click', refillGlobalExtraJuz);
document.getElementById('googleFullBtn')?.addEventListener('click', handleGoogleSignIn);
document.getElementById('updateMaxAbsenceDays')?.addEventListener('click', updateMaxAbsenceDays);

const resetModal = document.getElementById('resetModal');
document.getElementById('forgotPasswordLink')?.addEventListener('click', e => { e.preventDefault(); if (resetModal) resetModal.style.display = 'flex'; });
document.querySelectorAll('.close-modal, .close').forEach(btn => {
    btn.addEventListener('click', () => { document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); });
});
document.getElementById('sendResetBtn')?.addEventListener('click', async () => {
    const email = document.getElementById('resetEmail').value.trim(), msg = document.getElementById('resetMessage');
    if (!email) { if (msg) msg.innerHTML = '⚠️ أدخل البريد'; return; }
    if (email === ADMIN_EMAIL) { if (msg) msg.innerHTML = '🔐 كلمة المدير: Admin@123456'; return; }
    try { await auth.sendPasswordResetEmail(email); if (msg) { msg.innerHTML = '✅ تم الإرسال'; msg.style.color = '#16a34a'; } setTimeout(() => { if (resetModal) resetModal.style.display = 'none'; }, 3000); } catch (e) { if (msg) { msg.innerHTML = '❌ البريد غير موجود'; msg.style.color = '#dc2626'; } }
});

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        document.getElementById(`${tab}Form`).classList.add('active');
    });
});
document.querySelectorAll('.main-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('.main-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.main-tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`${tab}Tab`).classList.add('active');
    });
});
document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.adminTab;
        document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`admin${tab.charAt(0).toUpperCase() + tab.slice(1)}Tab`).classList.add('active');
        const sel = document.getElementById('adminTabSelect');
        if (sel) sel.value = tab;
        if (tab === 'extraPool') refreshExtraPoolStats();
    });
});
const adminSel = document.getElementById('adminTabSelect');
if (adminSel) {
    adminSel.addEventListener('change', e => {
        const tab = e.target.value;
        document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`admin${tab.charAt(0).toUpperCase() + tab.slice(1)}Tab`).classList.add('active');
        const matching = document.querySelector(`.admin-tab-btn[data-admin-tab="${tab}"]`);
        if (matching) matching.classList.add('active');
        if (tab === 'extraPool') refreshExtraPoolStats();
    });
}
window.onclick = function (e) { document.querySelectorAll('.modal').forEach(m => { if (e.target === m) m.style.display = 'none'; }); };

// ==================== تهيئة الإعدادات والاستماع و PWA ====================
document.addEventListener('DOMContentLoaded', async () => {
    await initializeAppSettings();
    listenToSettingsChanges();
    initDarkMode();
    initFontSize();
    document.getElementById('darkModeToggleCircle')?.addEventListener('click', toggleDarkMode);
    document.getElementById('darkModeToggleMain')?.addEventListener('click', toggleDarkMode);
    document.getElementById('darkModeToggleAdmin')?.addEventListener('click', toggleDarkMode);
    document.getElementById('fontSizeBtn')?.addEventListener('click', showFontSizeModal);
    
    document.querySelectorAll('#fontSizeModal .font-size-options button').forEach(btn => {
        btn.addEventListener('click', () => {
            setFontSize(btn.dataset.size);
            document.getElementById('fontSizeModal').style.display = 'none';
        });
    });
    document.getElementById('searchCircleInput')?.addEventListener('input', () => { if (pendingUserData) showAvailableCircles(pendingUserData); });
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then(reg => console.log('SW registered', reg)).catch(err => console.error('SW error', err));
    }
});

(async function init() {
    try { await ensureAdminExists(); await initializeGlobalExtraJuz(); await initializeAppSettings(); } catch (e) { console.error(e); }
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            const isAd = await checkIfAdmin(user);
            if (isAd) { await loadAdminData(); showScreen('adminScreen'); }
            else { await initFCM(); await loadUserData(); }
        } else { showScreen('authScreen'); }
    });
})();
