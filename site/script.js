// --- Nav: scroll shadow + mobile menu toggle ---------------
const nav = document.querySelector('.nav');
const toggle = document.querySelector('.nav__toggle');
const mobile = document.getElementById('mobile-menu');

const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 6);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!open));
  mobile.hidden = open;
});
mobile.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  toggle.setAttribute('aria-expanded', 'false');
  mobile.hidden = true;
}));

// --- Reveal on scroll --------------------------------------
const revealTargets = document.querySelectorAll(
  '.section__head, .card, .step, .spotlight__copy, .spotlight__visual, .techniques__grid > *, .why__intro, .why__points > div, .cta__inner > *, .contact__grid > *'
);
revealTargets.forEach(el => el.classList.add('reveal'));

const io = new IntersectionObserver((entries) => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      e.target.style.transitionDelay = (i % 6) * 60 + 'ms';
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

revealTargets.forEach(el => io.observe(el));

// --- Count-up on stats -------------------------------------
const stats = document.querySelectorAll('.stats__num[data-count]');
const statIO = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    const target = parseFloat(el.dataset.count);
    const isFractional = String(target).includes('.');
    const suffix = el.textContent.replace(/[0-9.,\s]/g, '');
    const original = el.textContent;
    let start = null;
    const dur = 900;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / dur);
      const val = target * (1 - Math.pow(1 - p, 3));
      el.textContent = (isFractional ? val.toFixed(1) : Math.round(val).toString()) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = original;
    };
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      requestAnimationFrame(step);
    }
    statIO.unobserve(el);
  });
}, { threshold: 0.6 });
stats.forEach(s => statIO.observe(s));

// --- Contact form (front-end only, no backend yet) --------
const form = document.getElementById('contactForm');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const btn = form.querySelector('button[type="submit"]');
  const originalLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Verstuurd — we bellen je terug ✓';
  btn.style.background = '#0EA968';
  btn.style.color = '#fff';
  setTimeout(() => {
    form.reset();
    btn.disabled = false;
    btn.textContent = originalLabel;
    btn.style.background = '';
    btn.style.color = '';
  }, 3500);
});

// --- Footer year -------------------------------------------
document.getElementById('year').textContent = new Date().getFullYear();
