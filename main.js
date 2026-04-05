// RideSync - Logic and Interactivity

document.addEventListener('DOMContentLoaded', () => {
    // 1. Smooth Scrolling for Navigation
    const navLinks = document.querySelectorAll('a[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80, // Offset for navbar
                    behavior: 'smooth'
                });
            }
        });
    });

    // 2. Form Handling
    const bookingForm = document.getElementById('bookingForm');
    const bookingSuccess = document.getElementById('bookingSuccess');

    if (bookingForm) {
        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Mock success animation
            bookingForm.style.opacity = '0';
            bookingForm.style.transform = 'translateY(-20px)';
            bookingForm.style.transition = 'all 0.6s ease';
            
            setTimeout(() => {
                bookingForm.style.display = 'none';
                bookingSuccess.style.display = 'block';
                bookingSuccess.style.animation = 'fadeIn 0.8s ease forwards';
            }, 600);
        });
    }

    // 3. Simple Parallax for Hero Image
    const heroImage = document.querySelector('.hero-image img');
    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY;
        if (heroImage) {
            heroImage.style.transform = `translateY(${scrolled * 0.1}px) scale(${1 + scrolled * 0.0001})`;
        }
    });

    // 4. Reveal on Scroll
    const featureCards = document.querySelectorAll('.feature-card');
    const observerOptions = {
        threshold: 0.1
    };

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    featureCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
        revealObserver.observe(card);
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
