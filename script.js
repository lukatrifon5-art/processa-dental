(function(){
  'use strict';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Tooth mark entrance/floating idle animation is pure CSS now (see
     .tooth-diagram / .spark in styles.css) — no JS needed for it. */

  /* ================= Counters ================= */
  function formatNum(n){ return Math.round(n).toLocaleString('en-GB'); }
  function setFinal(el){
    el.textContent = formatNum(+el.dataset.count) + (el.dataset.suffix || '');
  }
  function animateCount(el){
    var target = +el.dataset.count, suffix = el.dataset.suffix || '';
    var dur = 1400, start = null;
    function frame(ts){
      if(start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = formatNum(target * eased) + suffix;
      if(p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  var counters = document.querySelectorAll('[data-count]');
  var revealEls = document.querySelectorAll('.reveal');

  if(reduceMotion || !('IntersectionObserver' in window)){
    counters.forEach(setFinal);
    revealEls.forEach(function(el){ el.classList.add('in'); });
  } else {
    var countObs = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          animateCount(entry.target);
          countObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach(function(el){ countObs.observe(el); });

    var revealObs = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('in');
          revealObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function(el){ revealObs.observe(el); });
  }

  /* ================= Leak calculator =================
     Calculator and booking form are back on the same page (single
     landing page again), so the estimate just writes straight into the
     form's hidden field and note below — no cross-page handoff needed. */
  var calc = document.getElementById('leak-calc');
  var leakOut = document.getElementById('leak-out');
  var leakField = document.getElementById('estimated-leak-field');
  var leakNote = document.getElementById('leak-note');
  var leakNoteNum = document.getElementById('leak-note-num');
  var shownLeak = 0;

  function picked(name){
    var el = calc.querySelector('input[name="' + name + '"]:checked');
    return el ? +el.value : 0;
  }
  function computeLeak(){
    var enq = picked('calc-enq');
    var lost = picked('calc-resp');
    var val = picked('calc-val');
    return Math.round((enq * lost * 0.3 * val * 12) / 1000) * 1000;
  }
  function renderLeak(n){ leakOut.textContent = formatNum(n); }
  function animateLeak(to){
    var from = shownLeak;
    shownLeak = to;
    if(reduceMotion){ renderLeak(to); return; }
    var dur = 500, start = null;
    function frame(ts){
      if(start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      renderLeak(from + (to - from) * eased);
      if(p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  function updateLeak(){
    var leak = computeLeak();
    animateLeak(leak);
    var pretty = '£' + formatNum(leak);
    leakField.value = pretty;
    leakNoteNum.textContent = pretty;
    leakNote.hidden = false;
  }
  if(calc){
    calc.addEventListener('change', updateLeak);
    shownLeak = computeLeak();
    renderLeak(shownLeak);
  }

  /* ================= Netlify form ================= */
  var form = document.querySelector('form[name="book-call"]');
  if(form){
    var confirmBox = document.getElementById('confirm');
    var errorBox = document.getElementById('form-error');

    form.addEventListener('submit', function(e){
      e.preventDefault();
      errorBox.classList.remove('show');

      if(!form.checkValidity()){
        form.reportValidity();
        return;
      }

      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Sending…';

      var body = new URLSearchParams(new FormData(form)).toString();
      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body
      }).then(function(res){
        if(!res.ok) throw new Error('HTTP ' + res.status);
        form.style.display = 'none';
        confirmBox.classList.add('show');
        confirmBox.focus();
      }).catch(function(){
        btn.disabled = false;
        btn.textContent = 'Book a call';
        errorBox.classList.add('show');
      });
    });
  }
})();
