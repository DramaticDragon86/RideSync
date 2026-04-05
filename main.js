document.addEventListener('DOMContentLoaded', () => {
    // 1. Data Store (with LocalStorage persistence)
    const STORAGE_KEY = 'ridesync_active_postings';
    
    // Initial data if storage is empty
    const defaultRides = [
        {
            id: 1,
            name: "Alex Johnson",
            start: "University Library",
            end: "Union Station",
            time: "18:30",
            baseFare: 45.00,
            riders: 1 
        },
        {
            id: 2,
            name: "Sarah Chen",
            start: "Engineering Quad",
            end: "SFO Airport",
            time: "05:00",
            baseFare: 60.00,
            riders: 2
        }
    ];

    let rides = JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultRides;

    const ridesGrid = document.getElementById('ridesGrid');
    const rideCountEl = document.getElementById('rideCount');
    const postingForm = document.getElementById('postingForm');
    const noRides = document.getElementById('noRides');

    function saveRides() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(rides));
    }

    // 2. Render Rides
    function renderRides() {
        if (!ridesGrid) return;

        ridesGrid.innerHTML = '';
        if (rides.length === 0) {
            noRides.style.display = 'block';
            ridesGrid.appendChild(noRides);
        } else {
            noRides.style.display = 'none';
            ridesGrid.appendChild(noRides); // Hidden ref
            
            rides.forEach(ride => {
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
                        <button class="join-btn ${ride.riders >= 4 ? 'full' : ''}" onclick="window.joinRide(${ride.id})">
                            ${ride.riders >= 4 ? 'Full' : '<i class="fa-solid fa-plus"></i> Join'}
                        </button>
                    </div>
                `;
                ridesGrid.appendChild(card);
            });
        }

        rideCountEl.textContent = rides.length;
    }

    // 3. Post New Ride
    if (postingForm) {
        postingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const newRide = {
                id: Date.now(),
                name: document.getElementById('studentName').value,
                start: document.getElementById('startLoc').value,
                end: document.getElementById('endLoc').value,
                time: document.getElementById('departureTime').value,
                baseFare: parseFloat(document.getElementById('baseFare').value),
                riders: 1
            };

            rides.unshift(newRide);
            saveRides();
            renderRides();
            postingForm.reset();
            
            // Success feedback
            const btn = postingForm.querySelector('button');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Posted Successfully!';
            btn.style.background = '#00ff88';
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '';
                window.scrollTo({
                    top: document.getElementById('ride-feed').offsetTop - 100,
                    behavior: 'smooth'
                });
            }, 1500);
        });
    }

    // 4. Join Ride Logic (Exposed Globally)
    window.joinRide = (id) => {
        const ride = rides.find(r => r.id === id);
        if (ride && ride.riders < 4) {
            ride.riders++;
            saveRides();
            renderRides();
        } else if (ride && ride.riders >= 4) {
            alert("This ride is currently full!");
        }
    };

    // 5. Cross-Tab Synchronization
    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
            rides = JSON.parse(e.newValue);
            renderRides();
        }
    });

    // Initial Render
    renderRides();

    // 5. Smooth Scroll
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
