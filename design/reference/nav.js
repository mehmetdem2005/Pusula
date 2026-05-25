/* ─────────────────────────────────────────────────────────────────────────
   Pusula nav — scroll state, mega menus, drawer, command palette
   ───────────────────────────────────────────────────────────────────────── */
(() => {
  "use strict";

  /* ───────── 1. Scroll state on header ───────── */
  const header = document.querySelector("header.nav");
  if (header) {
    let lastScroll = -1;
    const onScroll = () => {
      const y = window.scrollY;
      if ((y > 8) !== (lastScroll > 8)) {
        header.classList.toggle("is-scrolled", y > 8);
      }
      lastScroll = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ───────── 2. Mega menu (hover + focus) ───────── */
  const megaHost = document.querySelector(".mega-host");
  const megaTriggers = document.querySelectorAll(".nav-item[data-mega]");
  let activeMega = null;
  let closeTimer = null;

  function openMega(name) {
    clearTimeout(closeTimer);
    if (activeMega === name) return;
    activeMega = name;
    megaTriggers.forEach(t => t.classList.toggle("is-open", t.dataset.mega === name));
    megaHost?.querySelectorAll(".mega").forEach(m => m.classList.toggle("is-open", m.dataset.megaPanel === name));
  }
  function closeMega() {
    activeMega = null;
    megaTriggers.forEach(t => t.classList.remove("is-open"));
    megaHost?.querySelectorAll(".mega").forEach(m => m.classList.remove("is-open"));
  }
  function scheduleClose() {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(closeMega, 150);
  }

  megaTriggers.forEach(t => {
    t.addEventListener("mouseenter", () => openMega(t.dataset.mega));
    t.addEventListener("mouseleave", scheduleClose);
    t.addEventListener("click", (e) => {
      e.preventDefault();
      activeMega === t.dataset.mega ? closeMega() : openMega(t.dataset.mega);
    });
    t.addEventListener("focus", () => openMega(t.dataset.mega));
  });
  if (megaHost) {
    megaHost.addEventListener("mouseenter", () => clearTimeout(closeTimer));
    megaHost.addEventListener("mouseleave", scheduleClose);
  }
  // Close on click outside
  document.addEventListener("click", (e) => {
    if (!activeMega) return;
    if (e.target.closest(".nav-item[data-mega]") || e.target.closest(".mega")) return;
    closeMega();
  });
  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && activeMega) closeMega();
  });

  /* ───────── 3. Topbar dismiss ───────── */
  const topbar = document.querySelector(".topbar");
  const topbarClose = document.querySelector(".topbar-close");
  if (topbarClose && topbar) {
    if (sessionStorage.getItem("pusula_topbar_dismissed") === "1") {
      topbar.classList.add("is-closed");
    }
    topbarClose.addEventListener("click", () => {
      topbar.classList.add("is-closed");
      sessionStorage.setItem("pusula_topbar_dismissed", "1");
    });
  }

  /* ───────── 4. Mobile drawer ───────── */
  const drawer = document.getElementById("drawer");
  const hamburger = document.querySelector(".hamburger");
  const drawerClose = document.querySelector(".drawer-close");
  const drawerBg = drawer?.querySelector(".drawer-bg");

  function openDrawer() {
    drawer?.classList.add("is-open");
    hamburger?.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }
  function closeDrawer() {
    drawer?.classList.remove("is-open");
    hamburger?.classList.remove("is-open");
    document.body.style.overflow = "";
  }
  hamburger?.addEventListener("click", () => {
    drawer?.classList.contains("is-open") ? closeDrawer() : openDrawer();
  });
  drawerClose?.addEventListener("click", closeDrawer);
  drawerBg?.addEventListener("click", closeDrawer);
  // Close on link click
  drawer?.querySelectorAll(".drawer-acc-item, .drawer-link, .drawer-foot .btn").forEach(el => {
    el.addEventListener("click", closeDrawer);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawer?.classList.contains("is-open")) closeDrawer();
  });

  /* ───────── 5. Command palette (⌘K / Ctrl+K) ───────── */
  const cmdk = document.getElementById("cmdk");
  const cmdkInput = cmdk?.querySelector("input");
  const cmdkTrigger = document.querySelector(".nav-cmd");
  const cmdkBg = cmdk?.querySelector(".cmdk-bg");
  const cmdkItems = () => Array.from(cmdk?.querySelectorAll(".cmdk-item") || []);

  function openCmdk() {
    cmdk?.classList.add("is-open");
    document.body.style.overflow = "hidden";
    setTimeout(() => cmdkInput?.focus(), 60);
  }
  function closeCmdk() {
    cmdk?.classList.remove("is-open");
    document.body.style.overflow = "";
    if (cmdkInput) cmdkInput.value = "";
    filterCmdk("");
  }
  cmdkTrigger?.addEventListener("click", openCmdk);
  cmdkBg?.addEventListener("click", closeCmdk);
  document.addEventListener("keydown", (e) => {
    const isOpen = cmdk?.classList.contains("is-open");
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      isOpen ? closeCmdk() : openCmdk();
    } else if (e.key === "Escape" && isOpen) {
      closeCmdk();
    }
  });

  // Filter
  function filterCmdk(q) {
    q = q.toLowerCase().trim();
    let firstVisible = null;
    cmdkItems().forEach(it => {
      const text = it.textContent.toLowerCase();
      const match = !q || text.includes(q);
      it.style.display = match ? "" : "none";
      if (match && !firstVisible) firstVisible = it;
    });
    // Hide empty groups
    cmdk?.querySelectorAll(".cmdk-group").forEach(g => {
      const any = Array.from(g.querySelectorAll(".cmdk-item")).some(i => i.style.display !== "none");
      g.style.display = any ? "" : "none";
    });
  }
  cmdkInput?.addEventListener("input", (e) => filterCmdk(e.target.value));

  /* ───────── 6. Animated counter (one-shot on view) ───────── */
  const counters = document.querySelectorAll("[data-count]");
  if (counters.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseFloat(el.dataset.count);
        const suffix = el.dataset.suffix || "";
        const prefix = el.dataset.prefix || "";
        const decimals = parseInt(el.dataset.decimals || "0", 10);
        const dur = 1200;
        const start = performance.now();
        const startVal = 0;
        const easeOut = (t) => 1 - Math.pow(1 - t, 3);
        const step = (now) => {
          const t = Math.min(1, (now - start) / dur);
          const v = startVal + (target - startVal) * easeOut(t);
          let s = decimals === 0 ? Math.round(v).toLocaleString("tr-TR") : v.toFixed(decimals);
          el.textContent = prefix + s + suffix;
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        io.unobserve(el);
      });
    }, { threshold: 0.4 });
    counters.forEach(c => io.observe(c));
  }

  /* ───────── 7. Reveal on scroll ───────── */
  const reveals = document.querySelectorAll("[data-reveal]");
  if (reveals.length && "IntersectionObserver" in window) {
    const io2 = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          io2.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    reveals.forEach(r => io2.observe(r));
  }
})();
