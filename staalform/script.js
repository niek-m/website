// --- Topbar shadow + mobile nav ---------------------------
const bar = document.querySelector('.topbar');
const menu = document.querySelector('.menu');
const mob = document.getElementById('mob');

const onScroll = () => bar.classList.toggle('is-scrolled', window.scrollY > 6);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') === 'true';
  menu.setAttribute('aria-expanded', String(!open));
  mob.hidden = open;
});
mob.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  menu.setAttribute('aria-expanded', 'false');
  mob.hidden = true;
}));

// --- Reveal on scroll -------------------------------------
const reveal = document.querySelectorAll(
  '.section__lead, .sol, .cap__list li, .cap__facts, .sectors__list li, .proc__steps li, .quote blockquote, .faq details, .appt__pitch, .apptform, .contact__grid > *'
);
reveal.forEach(el => el.classList.add('reveal'));

const io = new IntersectionObserver((entries) => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      e.target.style.transitionDelay = (i % 8) * 55 + 'ms';
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.14, rootMargin: '0px 0px -40px 0px' });
reveal.forEach(el => io.observe(el));

// --- Slot picker ------------------------------------------
const slots = document.querySelectorAll('.slot');
const slotField = document.getElementById('slotField');
slots.forEach(s => {
  s.addEventListener('click', () => {
    slots.forEach(x => x.classList.remove('is-active'));
    s.classList.add('is-active');
    const isOther = s.dataset.slot === 'andere tijd';
    slotField.readOnly = !isOther;
    slotField.value = isOther ? '' : s.dataset.slot;
    if (isOther) slotField.focus();
  });
});

// --- Form (front-end demo) --------------------------------
const form = document.getElementById('apptForm');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const btn = form.querySelector('button[type="submit"]');
  const orig = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Afspraak ingepland ✓';
  btn.style.background = '#12a558';
  btn.style.color = '#fff';
  setTimeout(() => {
    form.reset();
    slots.forEach(x => x.classList.remove('is-active'));
    btn.disabled = false;
    btn.textContent = orig;
    btn.style.background = '';
    btn.style.color = '';
  }, 3500);
});

// --- Year -------------------------------------------------
document.getElementById('yr').textContent = new Date().getFullYear();
