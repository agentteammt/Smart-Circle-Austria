/* Rechtsseiten — Scrollspy für die Inhaltsübersicht + Footer-Jahr */
(function () {
  'use strict';

  // Aktuelles Jahr im Footer
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  // Scrollspy: hebt den TOC-Eintrag des sichtbaren Abschnitts hervor
  var links = Array.prototype.slice.call(document.querySelectorAll('.lg-toc a[href^="#"]'));
  if (!links.length) return;
  var map = {};
  links.forEach(function (a) {
    var id = a.getAttribute('href').slice(1);
    var sec = document.getElementById(id);
    if (sec) map[id] = a;
  });

  var current = null;
  function setActive(id) {
    if (current === id) return;
    current = id;
    links.forEach(function (a) { a.classList.remove('active'); });
    if (map[id]) map[id].classList.add('active');
  }

  var observer = new IntersectionObserver(function (entries) {
    // Wähle den obersten sichtbaren Abschnitt
    var visible = entries.filter(function (e) { return e.isIntersecting; });
    if (visible.length) {
      visible.sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; });
      setActive(visible[0].target.id);
    }
  }, { rootMargin: '-88px 0px -70% 0px', threshold: 0 });

  Object.keys(map).forEach(function (id) {
    var sec = document.getElementById(id);
    if (sec) observer.observe(sec);
  });

  // Auf Mobil: TOC nach Klick einklappen
  document.querySelectorAll('.lg-toc-details a').forEach(function (a) {
    a.addEventListener('click', function () {
      var d = a.closest('details');
      if (d && window.matchMedia('(max-width: 900px)').matches) d.removeAttribute('open');
    });
  });
})();
