/**
 * Helpdesk AI embed script.
 *
 * Drop this on any page and it adds a launcher button that opens the workspace
 * assistant in an iframe panel:
 *
 *   <script src="https://your-host/embed.js" data-workspace="acme" defer></script>
 *
 * Everything is namespaced and inline-styled so it can't collide with, or be
 * restyled by, the host page's CSS.
 */
(function () {
  "use strict";

  var script = document.currentScript;
  if (!script) return;

  var workspace = script.getAttribute("data-workspace");
  if (!workspace) {
    console.warn("[helpdesk-ai] Missing data-workspace attribute");
    return;
  }

  // Derive the host from the script's own src so the snippet is copy-pasteable.
  var origin = new URL(script.src, window.location.href).origin;
  var position = script.getAttribute("data-position") || "right";
  var accent = script.getAttribute("data-accent") || "#3d7bf7";

  // Optional visitor identity from the host page, e.g. a signed-in customer.
  // Passed to the assistant so support staff know who they're talking to,
  // and so the pre-chat form can be skipped.
  var identity = new URLSearchParams();
  var name = script.getAttribute("data-name");
  var email = script.getAttribute("data-email");
  if (name) identity.set("name", name);
  if (email) identity.set("email", email);
  identity.set("embedded", "1");

  var ID = "helpdesk-ai-root";
  if (document.getElementById(ID)) return;

  var root = document.createElement("div");
  root.id = ID;
  root.style.cssText = [
    "position:fixed",
    "bottom:20px",
    position === "left" ? "left:20px" : "right:20px",
    "z-index:2147483000",
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif",
  ].join(";");

  var panel = document.createElement("div");
  panel.style.cssText = [
    "width:min(400px, calc(100vw - 40px))",
    "height:min(620px, calc(100vh - 120px))",
    "border-radius:16px",
    "overflow:hidden",
    "background:#fff",
    "box-shadow:0 12px 48px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
    "margin-bottom:12px",
    "opacity:0",
    "transform:translateY(8px) scale(0.98)",
    "transform-origin:bottom " + position,
    "transition:opacity .22s cubic-bezier(.32,.72,0,1), transform .22s cubic-bezier(.32,.72,0,1)",
    "pointer-events:none",
    "display:none",
  ].join(";");

  var frame = document.createElement("iframe");
  frame.title = "Support assistant";
  frame.style.cssText = "width:100%;height:100%;border:0;display:block";
  frame.setAttribute("allow", "microphone");
  panel.appendChild(frame);

  var button = document.createElement("button");
  button.type = "button";
  button.setAttribute("aria-label", "Open support chat");
  button.setAttribute("aria-expanded", "false");
  button.style.cssText = [
    "width:52px",
    "height:52px",
    "border-radius:50%",
    "border:0",
    "cursor:pointer",
    "background:" + accent,
    "color:#fff",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "box-shadow:0 4px 16px rgba(0,0,0,0.18)",
    "transition:transform .16s cubic-bezier(.32,.72,0,1)",
    position === "left" ? "margin-right:auto" : "margin-left:auto",
  ].join(";");

  var CHAT_ICON =
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var CLOSE_ICON =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  button.innerHTML = CHAT_ICON;

  button.addEventListener("mouseenter", function () {
    button.style.transform = "scale(1.06)";
  });
  button.addEventListener("mouseleave", function () {
    button.style.transform = "scale(1)";
  });

  var open = false;

  function setOpen(next) {
    open = next;
    button.setAttribute("aria-expanded", String(open));
    button.innerHTML = open ? CLOSE_ICON : CHAT_ICON;
    button.setAttribute(
      "aria-label",
      open ? "Close support chat" : "Open support chat"
    );

    if (open) {
      // Load the assistant only when it's first opened.
      if (!frame.src) {
        frame.src =
          origin + "/w/" + encodeURIComponent(workspace) + "?" + identity.toString();
      }
      panel.style.display = "block";
      // Next frame, so the transition has a starting state to animate from.
      requestAnimationFrame(function () {
        panel.style.opacity = "1";
        panel.style.transform = "translateY(0) scale(1)";
        panel.style.pointerEvents = "auto";
      });
    } else {
      panel.style.opacity = "0";
      panel.style.transform = "translateY(8px) scale(0.98)";
      panel.style.pointerEvents = "none";
      setTimeout(function () {
        if (!open) panel.style.display = "none";
      }, 220);
    }
  }

  button.addEventListener("click", function () {
    setOpen(!open);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && open) setOpen(false);
  });

  root.appendChild(panel);
  root.appendChild(button);

  function mount() {
    document.body.appendChild(root);
  }

  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
