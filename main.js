import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, onSnapshot, query, orderBy, updateDoc, doc, increment, where 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- START: FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyBlf4nxd3lwSOcRaIkSXRDyfdWxmaiF4ko",
  authDomain: "ridesync-48836.firebaseapp.com",
  projectId: "ridesync-48836",
  storageBucket: "ridesync-48836.firebasestorage.app",
  messagingSenderId: "376915967476",
  appId: "1:376915967476:web:75e1401ffe81f4d5af0da1",
  measurementId: "G-SP3X8NEBWN"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// --- END: FIREBASE CONFIGURATION ---

document.addEventListener('DOMContentLoaded', () => {
    // 🎨 UI Elements
    const selectionPage = document.getElementById('selection-page');
    const mainApp = document.getElementById('main-app');
    const universityNameEl = document.getElementById('detected-uni-name');
    const locationLoader = document.getElementById('locationLoader');
    const uniBadge = document.getElementById('currentUniBadge');
    const ridesGrid = document.getElementById('ridesGrid');
    const noRides = document.getElementById('noRides');
    const postingForm = document.getElementById('postingForm');
    const airportList = document.getElementById('airportList');
    
    // State Tracking
    let currentUniversity = null;
    let localRides = [];

    // 📍 1. Initial Location Detection
    async function detectLocation() {
        if (!navigator.geolocation) {
            showManualSearch("Location access not supported.");
            return;
        }

        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude, longitude } = pos.coords;
            try {
                // Reverse Geocode
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16`);
                const data = await res.json();
                
                const uniName = data.address.university || data.address.college || data.display_name.split(',')[0];
                currentUniversity = uniName;
                
                // Show detection results
                locationLoader.style.display = 'none';
                document.getElementById('detected-campus-info').style.display = 'block';
                universityNameEl.textContent = uniName;
                
                // Map Preview
                const map = L.map('map-preview-small').setView([latitude, longitude], 15);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                L.marker([latitude, longitude]).addTo(map).bindPopup(uniName).openPopup();

                // Find Airports Nearby
                findNearbyAirports(latitude, longitude);

            } catch (err) {
                showManualSearch("Unable to find your campus automatically.");
            }
        }, () => {
            showManualSearch("Location access was denied.");
        });
    }

    function showManualSearch(msg) {
        locationLoader.textContent = msg;
        setTimeout(() => {
            locationLoader.style.display = 'none';
            document.getElementById('manual-search-view').style.display = 'block';
        }, 2000);
    }

    async function findNearbyAirports(lat, lon) {
        const queryStr = `[out:json];node["aeroway"="aerodrome"](around:70000, ${lat}, ${lon});out;`;
        const res = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: queryStr });
        const data = await res.json();
        const airports = data.elements.map(el => el.tags.name).filter(n => n);
        
        airportList.innerHTML = '';
        airports.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            airportList.appendChild(opt);
        });
    }

    // 🚀 2. Finalize University Selection
    const manualSearchInput = document.getElementById('manualUniSearch');
    const uniSuggestions = document.getElementById('uni-suggestions');

    // Live University Search (Regulated Selection)
    let searchTimeout = null;
    manualSearchInput.addEventListener('input', () => {
        const val = manualSearchInput.value;
        if (val.length < 3) return;

        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            try {
                // Using hipolabs.com (the API server does not support https, so it's http)
                const res = await fetch(`http://universities.hipolabs.com/search?name=${encodeURIComponent(val)}`);
                const data = await res.json();
                
                uniSuggestions.innerHTML = '';
                data.slice(0, 10).forEach(uni => {
                    const opt = document.createElement('option');
                    opt.value = uni.name;
                    uniSuggestions.appendChild(opt);
                });
            } catch (e) { console.warn("Uni search fail:", e); }
        }, 500);
    });

    document.getElementById('confirm-uni-btn').addEventListener('click', enterPortal);
    document.getElementById('search-uni-btn').addEventListener('click', () => {
        const manualName = manualSearchInput.value;
        if (manualName) {
            currentUniversity = manualName;
            enterPortal();
        }
    });

    document.getElementById('change-uni-btn').addEventListener('click', () => {
        document.getElementById('detected-campus-info').style.display = 'none';
        document.getElementById('manual-search-view').style.display = 'block';
    });

    function enterPortal() {
        selectionPage.style.display = 'none';
        mainApp.style.display = 'block';
        uniBadge.textContent = `📍 ${currentUniversity}`;
        
        // Load Real-Time Data (Using a more robust client-side filter to avoid Indexing Errors)
        syncRidesForUniversity();
    }

    // 📋 3. Sync Rides (Cloud + Robust Filter)
    function syncRidesForUniversity() {
        const ridesRef = collection(db, "rides");
        
        // 🔥 Switch to a simpler query that doesn't REQUIRE the user to create 
        // manual indexes in the Firebase Console (Fixes "nothing appears" bug!)
        const q = query(ridesRef, orderBy("createdAt", "desc"));

        onSnapshot(q, (snapshot) => {
            const allRides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Client-side filtering ensures it works even without a Firebase Index!
            const filteredRides = allRides.filter(ride => ride.university === currentUniversity);
            
            renderRides(filteredRides);
        }, (error) => {
            console.error("Firebase sync error:", error);
            alert("Database Error! Make sure you initialized Firestore in your console.");
        });
    }

    function renderRides(data) {
        ridesGrid.innerHTML = '';
        if (data.length === 0) {
            noRides.style.display = 'block';
        } else {
            noRides.style.display = 'none';
            data.forEach(ride => {
                const splitFare = (ride.baseFare / ride.riders).toFixed(2);
                const card = document.createElement('div');
                card.className = 'ride-card';
                card.innerHTML = `
                    <div class="ride-header">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div>
                                <h3 style="font-size: 1.5rem; text-decoration: underline;">Ride with ${ride.name}</h3>
                                <p style="font-family: var(--font-accent);">Posted for ${ride.university}</p>
                            </div>
                            <span style="background: #f0f0f0; padding: 5px 10px; border-radius: 5px; font-weight: bold;">
                                <i class="fa-regular fa-clock"></i> ${ride.time}
                            </span>
                        </div>
                    </div>
                    
                    <div style="margin: 1rem 0;">
                        <p><strong>Pickup:</strong> ${ride.start}</p>
                        <p><strong>Heading to:</strong> ${ride.end}</p>
                    </div>

                    <div class="fare-box">
                        <div>
                            <p style="font-size: 0.8rem; font-weight: bold; text-transform: uppercase;">Est. Split Fare</p>
                            <h2 style="color: var(--crayon-red); font-size: 2rem;">$${splitFare}</h2>
                            <p style="font-size: 0.7rem; color: #555;">${ride.riders} people on this trip</p>
                        </div>
                        <button class="btn btn-primary" onclick="window.joinRide('${ride.id}')" style="padding: 10px 20px;">
                            ${ride.riders >= 4 ? 'Full 📋' : 'Join Ride ✏️'}
                        </button>
                    </div>
                `;
                ridesGrid.appendChild(card);
            });
        }
    }

    // 📝 4. Post New Listing
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
                university: currentUniversity, // Scoping to current uni
                createdAt: Date.now()
            };

            try {
                await addDoc(collection(db, "rides"), payload);
                postingForm.reset();
                window.scrollTo({ top: ridesGrid.offsetTop - 100, behavior: 'smooth' });
            } catch (err) {
                alert("Error Posting Sketch: " + err.message);
            }
        });
    }

    // 🤝 5. Join Logic
    window.joinRide = async (id) => {
        const rideRef = doc(db, "rides", id);
        try {
            await updateDoc(rideRef, { riders: increment(1) });
        } catch (err) {
            console.error("Join error:", err);
        }
    };

    // Kickoff
    detectLocation();
});
