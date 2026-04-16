'use client';

import { useEffect } from 'react';

export default function ScrollReveal() {
  useEffect(() => {
    // Navbar blur on scroll
    const handleScroll = () => {
      const nav = document.getElementById('navbar');
      if (!nav) return;
      if (window.scrollY > 20) {
        nav.style.background = 'rgba(2, 6, 23, 0.9)';
        nav.style.borderBottom = '1px solid rgba(255, 255, 255, 0.05)';
      } else {
        nav.style.background = 'rgba(2, 6, 23, 0.8)';
        nav.style.borderBottom = '1px solid rgba(255, 255, 255, 0.05)';
      }
    };
    window.addEventListener('scroll', handleScroll);

    // Scroll Reveal Intersection Observer
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');

          const progressBars = entry.target.querySelectorAll('.progress-bar');
          if (progressBars.length) {
            progressBars.forEach((bar) => {
              bar.style.animation = 'none';
              // eslint-disable-next-line no-unused-expressions
              bar.offsetHeight;
              bar.style.animation = null;
            });
          }
        }
      });
    }, observerOptions);

    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  return null;
}
