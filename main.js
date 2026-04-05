import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, onSnapshot, query, orderBy, updateDoc, doc, increment 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- START: FIREBASE CONFIGURATION ---
// 🎓 ACTION REQUIRED: Replace this config with your own from Firebase Console!
// 1. Visit console.firebase.google.com
// 2. Add Project -> Add Web App
// 3. Paste the config object here
const firebaseConfig = {
  apiKey: "AIzaSyBlf4nxd3lwSOcRaIkSXRDyfdWxmaiF4ko",
  authDomain: "ridesync-48836.firebaseapp.com",
  projectId: "ridesync-48836",
  storageBucket: "ridesync-48836.firebasestorage.app",
  messagingSenderId: "376915967476",
  appId: "1:376915967476:web:75e1401ffe81f4d5af0da1",
  measurementId: "G-SP3X8NEBWN"
};

// Initialize Firebase (safely checks if a real config exists)
const isFirebaseSetup = firebaseConfig.apiKey !== "YOUR_API_KEY";
let db = null;
if (isFirebaseSetup) {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
} else {
    console.warn("⚠️ RideSync: Firebase not configured. Using local session mode.");
}
// --- END: FIREBASE CONFIGURATION ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Data Store (Firebase with Local Fallback)
    const ridesGrid = document.getElementById('ridesGrid');
    const rideCountEl = document.getElementById('rideCount');
    const postingForm = document.getElementById('postingForm');
    const noRides = document.getElementById('noRides');

    let localRides = []; // Fallback if Firebase is not setup

    // 2. Real-Time Sync Listener
    if (db) {
        const ridesRef = collection(db, "rides");
        const q = query(ridesRef, orderBy("createdAt", "desc"));

        onSnapshot(q, (snapshot) => {
            localRides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderRides(localRides);
        }, (error) => {
            console.error("Firebase sync error:", error);
        });
    } else {
        // Simple mock data for demo if keys aren't added
        localRides = JSON.parse(localStorage.getItem('ridesync_local') || '[]');
        renderRides(localRides);
    }

    // 3. Render Logic
    function renderRides(data) {
        if (!ridesGrid) return;
        ridesGrid.innerHTML = '';
        
        if (data.length === 0) {
            noRides.style.display = 'block';
            ridesGrid.appendChild(noRides);
        } else {
            noRides.style.display = 'none';
            data.forEach(ride => {
                const splitFare = (ride.baseFare / ride.riders).toFixed(2);
                const card = document.createElement('div');
                card.className = 'ride-card';
                card.innerHTML = `
                    <div class="ride-header">
                        <div class="student-info">
                            <h4>${ride.name}</h4>
                            <span>University Student</span>
                        </div>
                        <div class="ride-time"><i class="fa-regular fa-clock"></i> ${ride.time}</div>
                    </div>
                    <div class="ride-route">
                        <div class="route-point">From: <strong>${ride.start}</strong></div>
                        <div class="route-point destination">To: <strong>${ride.end}</strong></div>
                    </div>
                    <div class="fare-box">
                        <div class="split-stats">
                            <label>Your Split Estimate</label>
                            <div class="amount">$${splitFare}</div>
                            <div class="riders-count">${ride.riders} ${ride.riders === 1 ? 'Person' : 'People'} synced</div>
                        </div>
                        <button class="join-btn ${ride.riders >= 4 ? 'full' : ''}" 
                                onclick="window.joinRide('${ride.id}')">
                            ${ride.riders >= 4 ? 'Full' : '<i class="fa-solid fa-plus"></i> Join'}
                        </button>
                    </div>
                `;
                ridesGrid.appendChild(card);
            });
        }
        rideCountEl.textContent = data.length;
    }

    // 4. Post New Ride (Cloud Persistence)
    if (postingForm) {
        postingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                name: document.getElementById('studentName').value,
                start: document.getElementById('startLoc').value,
                end: document.getElementById('endLoc').value,
                time: document.getElementById('departureTime').value,
                baseFare: parseFloat(document.getElementById('baseFare').value),
                riders: 1,
                createdAt: Date.now()
            };

            if (db) {
                try {
                    await addDoc(collection(db, "rides"), payload);
                } catch (e) {
                    alert("Error saving to cloud: " + e.message);
                }
            } else {
                localRides.unshift({ id: Date.now().toString(), ...payload });
                localStorage.setItem('ridesync_local', JSON.stringify(localRides));
                renderRides(localRides);
            }

            postingForm.reset();
            const btn = postingForm.querySelector('button');
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Posted Globally!';
            btn.style.background = '#00ff88';
            setTimeout(() => { btn.innerHTML = '<i class="fa-solid fa-plus"></i> Create Posting'; btn.style.background = ''; }, 1500);
        });
    }

    // 5. Join Ride (Cloud Update)
    window.joinRide = async (id) => {
        if (db) {
            const rideRef = doc(db, "rides", id);
            try {
                await updateDoc(rideRef, { riders: increment(1) });
            } catch (e) {
                alert("This ride is likely from an old local session.");
            }
        } else {
            const ride = localRides.find(r => r.id === id);
            if (ride && ride.riders < 4) {
                ride.riders++;
                localStorage.setItem('ridesync_local', JSON.stringify(localRides));
                renderRides(localRides);
            }
        }
    };
    // 6. Smooth Scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                window.scrollTo({
                    top: target.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
});

// Animations added dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(style);
