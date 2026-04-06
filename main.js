import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getFirestore, collection, addDoc, onSnapshot, query, orderBy, updateDoc, doc, increment, where, setDoc, getDoc, getDocs, arrayUnion, arrayRemove, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
const auth = getAuth(app);
// --- END: FIREBASE CONFIGURATION ---

document.addEventListener('DOMContentLoaded', () => {
    // 🎨 UI Elements
    const authPage = document.getElementById('auth-page');
    const verificationPage = document.getElementById('verification-page');
    const mainApp = document.getElementById('main-app');
    const authForm = document.getElementById('authForm');
    const signupFields = document.getElementById('signup-fields');
    const authTitle = document.getElementById('auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const toggleAuthLink = document.getElementById('toggle-auth-link');
    const toggleAuthText = document.getElementById('toggle-auth-text');
    const authError = document.getElementById('authError');
    const authSchoolInput = document.getElementById('authSchool');
    const authUniSuggestions = document.getElementById('auth-uni-suggestions');

    const verifySchoolName = document.getElementById('verify-school-name');
    const verifyStatus = document.getElementById('verify-status');
    const verifyError = document.getElementById('verify-error');
    const retryVerifyBtn = document.getElementById('retry-verify-btn');
    const devBypassBtn = document.getElementById('dev-bypass-btn');

    const uniBadge = document.getElementById('currentUniBadge');
    const ridesGrid = document.getElementById('ridesGrid');
    const noRides = document.getElementById('noRides');
    const postingForm = document.getElementById('postingForm');
    const airportList = document.getElementById('airportList');

    // State Tracking
    let currentUniversity = null;
    let currentUserData = null;
    let isSignupMode = true;

    // 🔐 0. Auth Logic
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            authPage.style.display = 'none';
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    currentUserData = userDoc.data();
                    document.getElementById('studentName').value = currentUserData.name;
                    currentUniversity = currentUserData.school;
                    verifyLocationOnCampus();
                } else {
                    console.error("No user data found in Firestore");
                    signOut(auth);
                }
            } catch (e) {
                console.error("Error fetching user data", e);
                signOut(auth);
            }
        } else {
            authPage.style.display = 'flex';
            verificationPage.style.display = 'none';
            mainApp.style.display = 'none';
        }
    });

    toggleAuthLink.addEventListener('click', (e) => {
        e.preventDefault();
        isSignupMode = !isSignupMode;
        if (isSignupMode) {
            signupFields.style.display = 'block';
            authTitle.textContent = 'Sign Up ✏️';
            authSubtitle.textContent = 'Create your RideSync student account.';
            authSubmitBtn.textContent = 'Create Account';
            toggleAuthLink.textContent = 'Log In Here';
            toggleAuthText.childNodes[0].nodeValue = 'Already have an account? ';
            document.getElementById('authName').required = true;
            document.getElementById('authPhone').required = true;
            document.getElementById('authSchool').required = true;
        } else {
            signupFields.style.display = 'none';
            authTitle.textContent = 'Log In 📓';
            authSubtitle.textContent = 'Welcome back to RideSync.';
            authSubmitBtn.textContent = 'Log In';
            toggleAuthLink.textContent = 'Sign Up Here';
            toggleAuthText.childNodes[0].nodeValue = "Don't have an account? ";
            document.getElementById('authName').required = false;
            document.getElementById('authPhone').required = false;
            document.getElementById('authSchool').required = false;
        }
        authError.style.display = 'none';
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        authError.style.display = 'none';

        const email = document.getElementById('authEmail').value;
        const password = document.getElementById('authPassword').value;

        try {
            if (isSignupMode) {
                if (!email.endsWith('.edu')) {
                    throw new Error("Must use a valid .edu email address.");
                }
                const name = document.getElementById('authName').value;
                const phone = document.getElementById('authPhone').value;
                const school = document.getElementById('authSchool').value;

                const userCredential = await createUserWithEmailAndPassword(auth, email, password);

                await setDoc(doc(db, "users", userCredential.user.uid), {
                    name,
                    phone,
                    school,
                    email
                });
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (error) {
            authError.textContent = error.message;
            authError.style.display = 'block';
            console.error("Auth Error:", error);
        }
    });

    document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        signOut(auth);
    });

    // Live University Search for Signup
    let authSearchTimeout = null;
    let authUniversityDataCache = null;

    authSchoolInput.addEventListener('input', () => {
        const val = authSchoolInput.value.toLowerCase();
        if (val.length < 3) return;

        clearTimeout(authSearchTimeout);
        authSearchTimeout = setTimeout(async () => {
            try {
                if (!authUniversityDataCache) {
                    const res = await fetch('https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json');
                    authUniversityDataCache = await res.json();
                }
                const matches = authUniversityDataCache.filter(uni => uni.name.toLowerCase().includes(val)).slice(0, 10);
                authUniSuggestions.innerHTML = '';
                matches.forEach(uni => {
                    const opt = document.createElement('option');
                    opt.value = uni.name;
                    authUniSuggestions.appendChild(opt);
                });
            } catch (e) { console.warn("Uni search fail:", e); }
        }, 300);
    });

    // 📍 1. Strict Campus Verification
    function verifyLocationOnCampus() {
        verificationPage.style.display = 'flex';
        mainApp.style.display = 'none';
        verifySchoolName.textContent = currentUniversity;
        verifyStatus.style.display = 'block';
        verifyStatus.innerHTML = '<i class="fa-solid fa-satellite-dish fa-fade"></i> Checking your GPS...';
        verifyError.style.display = 'none';
        retryVerifyBtn.style.display = 'none';
        devBypassBtn.style.display = 'inline-block'; // Helpful for devs testing at home

        if (!navigator.geolocation) {
            failVerification("Geolocation is not supported by your device.");
            return;
        }

        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude, longitude } = pos.coords;
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16`);
                const data = await res.json();

                const detectedSchool = data.address?.university || data.address?.college || data.display_name?.split(',')[0];

                // Extremely basic fuzzy matching: check if detected name shares at least one significant word with registered school
                const registeredWords = currentUniversity.toLowerCase().split(' ').filter(w => w.length > 3);
                const detectedWords = (detectedSchool || '').toLowerCase();

                const isMatch = registeredWords.some(word => detectedWords.includes(word));

                if (isMatch || detectedSchool === currentUniversity) {
                    enterPortal();
                } else {
                    failVerification(`You appear to be near "${detectedSchool || 'an unknown location'}". You must be at <strong>${currentUniversity}</strong>.`);
                }
            } catch (err) {
                failVerification("Network error while verifying location.");
            }
        }, () => {
            failVerification("You must grant location permissions to verify you're on campus.");
        });
    }

    function failVerification(reasonHtml) {
        verifyStatus.style.display = 'none';
        verifyError.style.display = 'block';
        verifyError.innerHTML = reasonHtml;
        retryVerifyBtn.style.display = 'inline-block';
    }

    retryVerifyBtn.addEventListener('click', verifyLocationOnCampus);
    devBypassBtn.addEventListener('click', enterPortal);

    const universityAirportsMap = {
        "Northwestern University": ["O'Hare Intl (ORD)", "Midway Intl (MDW)"],
        "University of California, Berkeley": ["San Francisco Intl (SFO)", "Oakland Intl (OAK)"],
        "Stanford University": ["San Francisco Intl (SFO)", "San Jose Intl (SJC)"],
        "University of Southern California": ["Los Angeles Intl (LAX)", "Burbank Airport (BUR)"],
        "University of California, Los Angeles": ["Los Angeles Intl (LAX)", "Burbank Airport (BUR)"],
        "New York University": ["JFK Intl", "LaGuardia (LGA)", "Newark Liberty (EWR)"],
        "Columbia University": ["JFK Intl", "LaGuardia (LGA)", "Newark Liberty (EWR)"]
        // Additional schools can be hardcoded here
    };

    function getAirportsForUniversity(uniName) {
        const defaultAirports = universityAirportsMap[uniName] || [];
        const quickContainer = document.getElementById('quick-airports');
        const endLocInput = document.getElementById('endLoc');

        if (quickContainer) {
            quickContainer.innerHTML = ''; // Clear loader

            defaultAirports.forEach(name => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'btn btn-secondary';
                btn.style.padding = '5px 10px';
                btn.style.fontSize = '0.9rem';
                btn.style.marginRight = '0.5rem';
                btn.textContent = name;
                btn.onclick = () => {
                    Array.from(quickContainer.children).forEach(c => c.style.backgroundColor = 'transparent');
                    btn.style.backgroundColor = '#f0f0f0';
                    endLocInput.value = name;
                    endLocInput.style.display = 'none';
                };
                quickContainer.appendChild(btn);
            });

            // Add Other button
            const otherBtn = document.createElement('button');
            otherBtn.type = 'button';
            otherBtn.className = 'btn';
            otherBtn.style.padding = '5px 10px';
            otherBtn.style.fontSize = '0.9rem';
            otherBtn.textContent = 'Other';
            otherBtn.onclick = () => {
                Array.from(quickContainer.children).forEach(c => c.style.backgroundColor = 'transparent');
                otherBtn.style.backgroundColor = '#f0f0f0';
                endLocInput.value = '';
                endLocInput.style.display = 'block';
            };
            quickContainer.appendChild(otherBtn);

            // Select first by default if exists
            if (defaultAirports.length > 0) {
                quickContainer.children[0].click();
            } else {
                otherBtn.click();
            }
        }
    }

    // 🚀 2. Finalize Entry
    function enterPortal() {
        verificationPage.style.display = 'none';
        mainApp.style.display = 'block';
        uniBadge.textContent = `📍 verified at ${currentUniversity}`;

        getAirportsForUniversity(currentUniversity);
        syncRidesForUniversity();
    }

    // 📋 3. Sync Rides (Cloud + Auto-Match View)
    function syncRidesForUniversity() {
        const ridesRef = collection(db, "rides");

        // Only load rides that the current user is a passenger in
        const q = query(ridesRef, orderBy("createdAt", "desc"));

        onSnapshot(q, (snapshot) => {
            const allRides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Client-side filtering ensures it works without complex indexing 
            // and filters out anything the user isn't assigned to.
            const userUid = auth.currentUser ? auth.currentUser.uid : null;
            const myRides = allRides.filter(ride =>
                ride.university === currentUniversity &&
                ride.passengers &&
                ride.passengers.includes(userUid)
            );

            renderRides(myRides);
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
                const card = document.createElement('div');
                card.className = 'ride-card';
                card.innerHTML = `
                    <div class="ride-header">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div>
                                <h3 style="font-size: 1.5rem; text-decoration: underline;">Matched Carpool</h3>
                                <p style="font-family: var(--font-accent);">${ride.date} • heading to ${ride.end}</p>
                            </div>
                            <span style="background: #f0f0f0; padding: 5px 10px; border-radius: 5px; font-weight: bold;">
                                <i class="fa-regular fa-clock"></i> ${ride.time}
                            </span>
                        </div>
                    </div>
                    
                    <div style="margin: 1rem 0;">
                        <p><strong>Passengers (${ride.currentRiders}/${ride.maxRiders}):</strong></p>
                        <ul style="margin-top: 0.5rem; padding-left: 1.5rem;">
                            ${ride.passengerNames ? ride.passengerNames.map(name => `<li>${name}</li>`).join('') : ''}
                        </ul>
                    </div>

                    <div class="fare-box" style="justify-content: space-between; align-items: center; background: #e8f5e9;">
                        <p style="font-size: 1rem; color: #2e7d32; font-weight: bold;"><i class="fa-solid fa-circle-check"></i> You are secured in this ride!</p>
                        <button class="btn btn-secondary" onclick="window.leaveRide('${ride.id}')" style="padding: 5px 15px; font-size: 0.9rem;">Leave Ride</button>
                    </div>
                `;
                ridesGrid.appendChild(card);
            });
        }
    }

    // 📝 4. Find or Create Matching Listing
    if (postingForm) {
        // Handle Max Rider Buttons
        const riderBtns = document.querySelectorAll('.rider-btn');
        const maxRidersInput = document.getElementById('maxRiders');

        if (riderBtns.length > 0) {
            maxRidersInput.value = "2"; 
            riderBtns[0].style.backgroundColor = 'var(--pen-blue)';
            riderBtns[0].style.color = 'white';

            riderBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    riderBtns.forEach(b => {
                        b.style.backgroundColor = 'transparent';
                        b.style.color = 'var(--pencil)';
                    });
                    
                    btn.style.backgroundColor = 'var(--pen-blue)';
                    btn.style.color = 'white';
                    
                    if (btn.dataset.val === 'other') {
                        maxRidersInput.style.display = 'block';
                        maxRidersInput.value = "";
                        maxRidersInput.focus();
                        maxRidersInput.required = true;
                    } else {
                        maxRidersInput.style.display = 'none';
                        maxRidersInput.value = btn.dataset.val;
                        maxRidersInput.required = false; 
                    }
                });
            });
        }

        postingForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const myName = document.getElementById('studentName').value;
            const endVal = document.getElementById('endLoc').value;
            const dateVal = document.getElementById('rideDate').value;
            const timeVal = document.getElementById('departureTime').value;
            const maxRidersVal = parseInt(maxRidersInput.value) || 2;
            const userUid = auth.currentUser.uid;

            try {
                // AUTO MATCH LOGIC
                const ridesRef = collection(db, "rides");
                const q = query(ridesRef, orderBy("createdAt", "desc"));
                const querySnapshot = await getDocs(q);

                let matchedRide = null;

                // Helper to convert HH:MM to minutes from midnight
                const toMinutes = (tStr) => {
                    const parts = tStr.split(':');
                    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
                };
                const myMins = toMinutes(timeVal);

                querySnapshot.forEach(docSnap => {
                    const ride = docSnap.data();

                    // Filter matching rides locally
                    const isSameUni = ride.university === currentUniversity;
                    const isSameEnd = ride.end === endVal;
                    const isSameDate = ride.date === dateVal;
                    const isNotFull = ride.currentRiders < ride.maxRiders;
                    const imNotAlreadyInit = !(ride.passengers || []).includes(userUid);

                    if (isSameUni && isSameEnd && isSameDate && isNotFull && imNotAlreadyInit) {
                        const rideMins = toMinutes(ride.time);
                        // Within 30 minutes?
                        if (Math.abs(rideMins - myMins) <= 30) {
                            if (!matchedRide) {
                                matchedRide = { id: docSnap.id, ...ride, minsGap: Math.abs(rideMins - myMins) };
                            } else if (Math.abs(rideMins - myMins) < matchedRide.minsGap) {
                                // Prefer the closely matching time
                                matchedRide = { id: docSnap.id, ...ride, minsGap: Math.abs(rideMins - myMins) };
                            }
                        }
                    }
                });

                if (matchedRide) {
                    // Update existing document!
                    const matchRef = doc(db, "rides", matchedRide.id);
                    await updateDoc(matchRef, {
                        currentRiders: increment(1),
                        passengers: arrayUnion(userUid),
                        passengerNames: arrayUnion(myName),
                        passengerPhones: arrayUnion(currentUserData.phone || 'N/A')
                    });

                    // Alert the user via Email (and local popup)
                    sendEmailAlert(`Match Found! You've joined ${matchedRide.passengerNames[0]}'s carpool. Their phone is ${matchedRide.passengerPhones[0]}.`, userUid);
                } else {
                    // Create new request since no match was found
                    const payload = {
                        university: currentUniversity,
                        end: endVal,
                        date: dateVal,
                        time: timeVal,
                        maxRiders: maxRidersVal,
                        currentRiders: 1,
                        passengers: [userUid],
                        passengerNames: [myName],
                        passengerPhones: [currentUserData.phone || 'N/A'],
                        createdAt: Date.now()
                    };
                    await addDoc(ridesRef, payload);
                    sendEmailAlert("Request created successfully! We will email you as soon as someone matches with you.", userUid);
                }

                postingForm.reset();

                const quickAirports = document.getElementById('quick-airports');
                if (quickAirports && quickAirports.children.length > 0 && quickAirports.children[0].tagName === 'BUTTON') {
                    quickAirports.children[0].click();
                }

                window.scrollTo({ top: ridesGrid.offsetTop - 100, behavior: 'smooth' });
            } catch (err) {
                alert("Error Posting Request: " + err.message);
                console.error(err);
            }
        });
    }

    // 🚪 5. Leave / Delete Logic
    window.leaveRide = async (id) => {
        if (!confirm("Are you sure you want to leave this carpool?")) return;

        try {
            const rideRef = doc(db, "rides", id);
            const rideSnap = await getDoc(rideRef);

            if (rideSnap.exists()) {
                const ride = rideSnap.data();
                const userUid = auth.currentUser.uid;
                const userName = document.getElementById('studentName').value || currentUserData.name;
                const userPhone = currentUserData.phone || 'N/A';

                if (ride.currentRiders <= 1) {
                    // You are the last person, delete the entire ride
                    await deleteDoc(rideRef);
                    sendEmailAlert("Your carpool request has been successfully canceled and removed.", userUid);
                } else {
                    // Remove yourself from the group
                    await updateDoc(rideRef, {
                        currentRiders: increment(-1),
                        passengers: arrayRemove(userUid),
                        passengerNames: arrayRemove(userName),
                        passengerPhones: arrayRemove(userPhone)
                    });
                    sendEmailAlert("You have successfully left the carpool group.", userUid);
                }
            }
        } catch (err) {
            console.error("Leave error:", err);
            alert("Error leaving ride.");
        }
    };

    // 📧 Email System integration 
    // Uses EmailJS - replacing SMS logic
    function sendEmailAlert(message, uid) {
        // 1. Show the visually pleasing mock popup
        const alertBox = document.getElementById('mock-phone-alert');
        const textElem = document.getElementById('mock-sms-text');

        if (alertBox && textElem) {
            textElem.textContent = message;
            alertBox.style.bottom = '20px';
            setTimeout(() => { alertBox.style.bottom = '-150px'; }, 6000);
        }

        // 2. Transmit Actual Email via EmailJS
        // To enable: Go to https://www.emailjs.com, create free account, plug in keys
        const USE_REAL_EMAIL = false; // Set to true when keys are plugged in

        if (USE_REAL_EMAIL && typeof emailjs !== 'undefined') {
            const serviceID = "YOUR_SERVICE_ID";
            const templateID = "YOUR_TEMPLATE_ID";
            const publicKey = "YOUR_PUBLIC_KEY";

            // Assuming user is logged in and we have their auth email
            const userEmail = auth.currentUser ? auth.currentUser.email : "user@edu.com";

            emailjs.send(serviceID, templateID, {
                to_email: userEmail,
                subject: "RideSync Notification",
                message: message
            }, publicKey)
                .then(() => console.log("Physical email successfully pushed to: " + userEmail))
                .catch(err => console.error("EmailJS Error:", err));
        } else {
            console.log("Mock Email queued for delivery: " + message);
        }
    }
});
