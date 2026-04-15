// public/js/dataDocs.js
(() => {
  const abs = (v) => {
    v = (v || "").trim();
    if (!v) return "";
    if (/^https?:\/\//i.test(v)) return v;
    if (!v.startsWith("/")) v = "/" + v;
    return location.origin + v;
  };

  const norm = (t) =>
    (t || "")
      .trim()
      .replace(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+/i, "")
      .replace(/\s+/g, " ")
      .trim();

  const copy = async (t) => {
    t = norm(t);
    if (!t) return false;
    try {
      if (navigator.clipboard && isSecureContext) {
        await navigator.clipboard.writeText(t);
        return true;
      }
    } catch {}
    try {
      const ta = document.createElement("textarea");
      ta.value = t;
      ta.readOnly = true;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  };

  const tip = (el, msg) => {
    const old = el.getAttribute("title") || "";
    el.setAttribute("title", msg);
    setTimeout(() => (old ? el.setAttribute("title", old) : el.removeAttribute("title")), 1200);
  };

  document.addEventListener("DOMContentLoaded", () => {
    // New: .endpoint (preferred data-path, fallback to existing "/...")
    document.querySelectorAll(".endpoint").forEach((el) => {
      const p = el.getAttribute("data-path") || el.textContent.trim();
      if (p && (el.getAttribute("data-path") || p.startsWith("/"))) el.textContent = abs(p);
    });

    // Legacy: .api-url[data-path]
    document.querySelectorAll(".api-url[data-path]").forEach((el) => {
      el.textContent = abs(el.getAttribute("data-path"));
    });

    // UX hint
    document.querySelectorAll(".copyCode, pre.code-block").forEach((el) => {
      el.style.cursor = "pointer";
      if (!el.title) el.title = "Click to copy";
    });
  });

  // Copy on click
  document.addEventListener("click", async (e) => {
    const el = e.target.closest(".copyCode, pre.code-block");
    if (!el) return;
    const endpoint = el.querySelector(".endpoint");
    const raw = (endpoint && endpoint.textContent) || el.innerText || el.textContent || "";
    tip(el, (await copy(raw)) ? "Copied ✓" : "Copy failed");
  });
})();
