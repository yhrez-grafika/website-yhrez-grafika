(function () {
  if (window.__yhrezAsistenPemanduLoaded) return;
  window.__yhrezAsistenPemanduLoaded = true;

  function runWhenReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
      return;
    }
    callback();
  }

  function deteksiKonteks() {
    var title = (document.title || "").toLowerCase();
    var path = (window.location.pathname || "").toLowerCase();
    var href = (window.location.href || "").toLowerCase();

    var isMapPage = path.includes("map") || href.includes("map") || title.includes("alamat pengiriman");
    var isKatalogPage = path.includes("katalog") || title.includes("katalog");
    var isProdukPage = path.includes("/produk/") || title.includes("produk") || title.includes("jilid") || title.includes("stempel");
    var isTentangPage = path.includes("tentangkami") || title.includes("tentang");
    var isGaleriPage = path.includes("galeri") || title.includes("portofolio");
    var isHomePage = path.endsWith("/") || path.endsWith("/index.html") || title.includes("yh'rez grafika | pusat");

    var pageType = "umum";
    if (isMapPage) pageType = "map";
    else if (isKatalogPage) pageType = "katalog";
    else if (isProdukPage) pageType = "produk";
    else if (isTentangPage) pageType = "tentang";
    else if (isGaleriPage) pageType = "galeri";
    else if (isHomePage) pageType = "home";

    return {
      pageType: pageType,
      isMapPage: isMapPage,
      isKatalogPage: isKatalogPage,
      pageTitle: document.title || "Halaman tanpa judul",
      pagePath: window.location.pathname || "/",
      pageUrl: window.location.href,
    };
  }

  function hapusIkonWALama() {
    var selectors = [".wa-float", ".floating-wa", "a[aria-label*='Chat WhatsApp Admin']", "a[aria-label*='WhatsApp Admin']", ".wa-float-text"];

    selectors.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (el) {
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
    });
  }

  function injectStyle() {
    if (document.getElementById("yhrez-ai-style")) return;

    var style = document.createElement("style");
    style.id = "yhrez-ai-style";
    style.textContent =
      "\n      .yhrez-ai-widget {\n        position: fixed;\n        right: 16px;\n        bottom: 16px;\n        z-index: 99999;\n        display: flex;\n        flex-direction: column;\n        align-items: flex-end;\n        gap: 10px;\n      }\n\n      .yhrez-ai-tooltip {\n        display: none;\n        max-width: 250px;\n        background: #ffffff;\n        color: #0f172a;\n        border: 1px solid #bfdbfe;\n        border-radius: 12px;\n        padding: 9px 11px;\n        box-shadow: 0 10px 22px rgba(15, 23, 42, 0.2);\n        font: 600 12px/1.45 Poppins, Arial, sans-serif;\n      }\n\n      .yhrez-ai-tooltip.show {\n        display: block;\n        animation: yhrezAiFadeIn 0.25s ease;\n      }\n\n      .yhrez-ai-toggle {\n        width: 60px;\n        height: 60px;\n        border: 0;\n        border-radius: 999px;\n        background: linear-gradient(135deg, #0b4bc7 0%, #1d7bf5 100%);\n        color: #ffffff;\n        font-size: 26px;\n        display: inline-flex;\n        align-items: center;\n        justify-content: center;\n        box-shadow: 0 14px 24px rgba(29, 123, 245, 0.35);\n        cursor: pointer;\n      }\n\n      .yhrez-ai-panel {\n        width: min(360px, calc(100vw - 22px));\n        max-height: min(560px, calc(100vh - 98px));\n        display: flex;\n        flex-direction: column;\n        background: #ffffff;\n        border: 1px solid #dbeafe;\n        border-radius: 18px;\n        overflow: hidden;\n        transform: translateY(12px) scale(0.96);\n        transform-origin: right bottom;\n        opacity: 0;\n        visibility: hidden;\n        pointer-events: none;\n        box-shadow: 0 22px 42px rgba(15, 23, 42, 0.3);\n        transition: opacity 0.26s ease, transform 0.26s ease, visibility 0.26s ease;\n      }\n\n      .yhrez-ai-widget.open .yhrez-ai-panel {\n        transform: translateY(0) scale(1);\n        opacity: 1;\n        visibility: visible;\n        pointer-events: auto;\n      }\n\n      .yhrez-ai-header {\n        background: linear-gradient(135deg, #0b4bc7 0%, #1b74ea 100%);\n        color: #ffffff;\n        display: flex;\n        align-items: center;\n        justify-content: space-between;\n        padding: 12px 14px;\n      }\n\n      .yhrez-ai-title {\n        margin: 0;\n        font: 700 14px/1.3 Roboto, Arial, sans-serif;\n      }\n\n      .yhrez-ai-close {\n        border: 0;\n        background: rgba(255, 255, 255, 0.2);\n        color: #ffffff;\n        width: 30px;\n        height: 30px;\n        border-radius: 8px;\n        font-size: 14px;\n        cursor: pointer;\n      }\n\n      #kotak-respon {\n        min-height: 240px;\n        max-height: min(410px, calc(100vh - 260px));\n        overflow-y: auto;\n        background: linear-gradient(180deg, #eff6ff 0%, #f8fbff 100%);\n        padding: 12px;\n        display: flex;\n        flex-direction: column;\n        gap: 9px;\n      }\n\n      .yhrez-ai-msg {\n        max-width: 88%;\n        padding: 9px 11px;\n        border-radius: 12px;\n        font: 500 13px/1.45 Poppins, Arial, sans-serif;\n        white-space: pre-wrap;\n        word-break: break-word;\n      }\n\n      .yhrez-ai-msg.bot {\n        align-self: flex-start;\n        color: #1e293b;\n        background: #ffffff;\n        border: 1px solid #dbeafe;\n      }\n\n      .yhrez-ai-msg.user {\n        align-self: flex-end;\n        color: #ffffff;\n        background: #1e40af;\n      }\n\n      .yhrez-ai-footer {\n        display: flex;\n        align-items: center;\n        gap: 8px;\n        border-top: 1px solid #dbeafe;\n        background: #f8fbff;\n        padding: 10px;\n      }\n\n      #input-chat {\n        flex: 1;\n        height: 40px;\n        border: 1px solid #bfdbfe;\n        border-radius: 10px;\n        padding: 0 11px;\n        font: 500 13px Poppins, Arial, sans-serif;\n        color: #0f172a;\n      }\n\n      #input-chat:focus {\n        outline: 0;\n        border-color: #2563eb;\n        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);\n      }\n\n      #tombol-kirim {\n        min-width: 72px;\n        height: 40px;\n        border: 0;\n        border-radius: 10px;\n        background: #1d4ed8;\n        color: #ffffff;\n        font: 700 13px Poppins, Arial, sans-serif;\n        cursor: pointer;\n      }\n\n      #input-chat:disabled,\n      #tombol-kirim:disabled {\n        opacity: 0.65;\n        cursor: not-allowed;\n      }\n\n      .yhrez-ai-sr-only {\n        position: absolute !important;\n        width: 1px !important;\n        height: 1px !important;\n        padding: 0 !important;\n        margin: -1px !important;\n        overflow: hidden !important;\n        clip: rect(0, 0, 0, 0) !important;\n        white-space: nowrap !important;\n        border: 0 !important;\n      }\n\n      @keyframes yhrezAiFadeIn {\n        from { opacity: 0; transform: translateY(8px); }\n        to { opacity: 1; transform: translateY(0); }\n      }\n\n      @media (max-width: 768px) {\n        .yhrez-ai-widget {\n          right: 10px;\n          bottom: 10px;\n        }\n\n        .yhrez-ai-toggle {\n          width: 56px;\n          height: 56px;\n          font-size: 24px;\n        }\n\n        .yhrez-ai-panel {\n          width: min(340px, calc(100vw - 16px));\n          max-height: min(510px, calc(100vh - 88px));\n        }\n\n        #kotak-respon {\n          min-height: 220px;\n        }\n      }\n    ";

    document.head.appendChild(style);
  }

  function buatWidget(konteks) {
    if (document.getElementById("yhrez-ai-widget")) return null;

    var wrapper = document.createElement("div");
    wrapper.className = "yhrez-ai-widget";
    wrapper.id = "yhrez-ai-widget";

    var tooltip = document.createElement("div");
    tooltip.className = "yhrez-ai-tooltip";
    tooltip.id = "yhrez-ai-tooltip";
    wrapper.appendChild(tooltip);

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "yhrez-ai-toggle";
    toggle.id = "yhrez-ai-toggle";
    toggle.setAttribute("aria-label", "Buka Chat Asisten Yh'rez Grafika");
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = '<span aria-hidden="true">&#129302;</span>';
    wrapper.appendChild(toggle);

    var panel = document.createElement("section");
    panel.className = "yhrez-ai-panel";
    panel.id = "yhrez-ai-panel";
    panel.setAttribute("aria-hidden", "true");
    panel.innerHTML =
      '<header class="yhrez-ai-header">' +
      '<h3 class="yhrez-ai-title">Asisten Yh\'rez Grafika</h3>' +
      '<button type="button" class="yhrez-ai-close" id="yhrez-ai-close" aria-label="Tutup chat">&#10005;</button>' +
      "</header>" +
      '<div id="kotak-respon" aria-live="polite"></div>' +
      '<footer class="yhrez-ai-footer">' +
      '<label for="input-chat" class="yhrez-ai-sr-only">Tulis pesan</label>' +
      '<input id="input-chat" type="text" autocomplete="off" placeholder="Tulis pertanyaan Kakak..." />' +
      '<button type="button" id="tombol-kirim">Kirim</button>' +
      "</footer>";

    wrapper.appendChild(panel);
    document.body.appendChild(wrapper);

    var initialText = "Halo Kak, saya Asisten Yh'rez Grafika. Ada yang mau ditanyakan soal layanan cetak, harga, atau cara order?";
    if (konteks.isMapPage) {
      initialText = "Halo! Saya asisten Yh'rez. Di halaman ini Kakak bisa mengisi alamat pengiriman. Masukkan alamat lengkap di kolom pertama agar kami mudah menemukan lokasi Kakak.";
    } else if (konteks.isKatalogPage) {
      initialText = "Halo Kak, saya siap bantu jelaskan layanan di halaman Katalog, termasuk detail harga jilid hardcover dan stempel.";
    } else if (konteks.pageType === "tentang") {
      initialText = "Halo Kak! 😊 Di halaman ini Kakak bisa mengenal lebih dekat perjalanan Yh'rez Grafika. Kami hadir sejak tahun 2024 di Palangka Raya untuk jadi sahabat cetak andalan mahasiswa dan dosen. Ada yang ingin Kakak tanyakan soal misi atau pengalaman kami?";
    } else if (konteks.pageType === "galeri") {
      initialText = "Halo Kak! 😊 Di sini Kakak bisa melihat langsung hasil kerja nyata kami. Semua foto di galeri ini adalah pesanan asli pelanggan Yh'rez Grafika. Mau saya jelaskan detail kualitas untuk produk tertentu?";
    }

    var kotakRespon = panel.querySelector("#kotak-respon");
    var msg = document.createElement("div");
    msg.className = "yhrez-ai-msg bot";
    msg.textContent = initialText;
    kotakRespon.appendChild(msg);

    return wrapper;
  }

  function initChatLogic(konteks) {
    var widget = document.getElementById("yhrez-ai-widget");
    if (!widget) return;

    var tooltip = document.getElementById("yhrez-ai-tooltip");
    var panel = document.getElementById("yhrez-ai-panel");
    var toggle = document.getElementById("yhrez-ai-toggle");
    var closeBtn = document.getElementById("yhrez-ai-close");
    var kotakRespon = document.getElementById("kotak-respon");
    var inputChat = document.getElementById("input-chat");
    var tombolKirim = document.getElementById("tombol-kirim");

    var riwayatPercakapan = [];
    var maxRiwayat = 16;
    var isSending = false;

    function scrollToBottom() {
      kotakRespon.scrollTop = kotakRespon.scrollHeight;
    }

    function tambahPesan(text, role) {
      var bubble = document.createElement("div");
      bubble.className = "yhrez-ai-msg " + (role === "user" ? "user" : "bot");
      bubble.textContent = text;
      kotakRespon.appendChild(bubble);
      scrollToBottom();
      return bubble;
    }

    function openWidget() {
      widget.classList.add("open");
      toggle.setAttribute("aria-expanded", "true");
      panel.setAttribute("aria-hidden", "false");
      hideTooltip();
      setTimeout(function () {
        inputChat.focus();
        scrollToBottom();
      }, 50);
    }

    function closeWidget() {
      widget.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      panel.setAttribute("aria-hidden", "true");
    }

    function showTooltip(text) {
      if (!tooltip) return;
      tooltip.textContent = text;
      tooltip.classList.add("show");
      setTimeout(function () {
        hideTooltip();
      }, 8500);
    }

    function hideTooltip() {
      if (!tooltip) return;
      tooltip.classList.remove("show");
    }

    function simpanRiwayat(role, text) {
      riwayatPercakapan.push({ role: role, text: text });
      if (riwayatPercakapan.length > maxRiwayat) {
        riwayatPercakapan.splice(0, riwayatPercakapan.length - maxRiwayat);
      }
    }

    async function kirimPesan() {
      var pesan = inputChat.value.trim();
      if (!pesan || isSending) return;

      openWidget();
      tambahPesan(pesan, "user");
      inputChat.value = "";
      inputChat.disabled = true;
      tombolKirim.disabled = true;
      isSending = true;

      var statusBubble = tambahPesan("Asisten sedang menyiapkan jawaban...", "bot");

      try {
        var response = await fetch("/api/gemini-chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: pesan,
            history: riwayatPercakapan,
            context: {
              pageTitle: konteks.pageTitle,
              pagePath: konteks.pagePath,
              pageUrl: konteks.pageUrl,
              pageType: konteks.pageType,
            },
          }),
        });

        if (!response.ok) {
          throw new Error("HTTP " + response.status);
        }

        var data = await response.json();
        var reply = typeof data.reply === "string" ? data.reply.trim() : "";
        if (!reply) {
          reply = "Maaf Kak, jawaban belum tersedia. Coba ulangi pertanyaan sebentar lagi ya.";
        }

        simpanRiwayat("user", pesan);
        simpanRiwayat("model", reply);
        statusBubble.textContent = reply;
      } catch (error) {
        statusBubble.textContent = "Maaf Kak, koneksi chat AI sedang bermasalah. Untuk cepat, bisa hubungi WA 0813-4852-0154.";
        console.error("Asisten Pemandu error:", error);
      } finally {
        isSending = false;
        inputChat.disabled = false;
        tombolKirim.disabled = false;
        inputChat.focus();
        scrollToBottom();
      }
    }

    toggle.addEventListener("click", function () {
      if (widget.classList.contains("open")) {
        closeWidget();
      } else {
        openWidget();
      }
    });

    closeBtn.addEventListener("click", closeWidget);

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && widget.classList.contains("open")) {
        closeWidget();
      }
    });

    tombolKirim.addEventListener("click", kirimPesan);
    inputChat.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        kirimPesan();
      }
    });

    if (konteks.isMapPage) {
      var idleTimer = null;
      var alreadyShown = false;
      var events = ["mousemove", "scroll", "keydown", "touchstart", "click"];

      var resetIdleTimer = function () {
        if (alreadyShown) return;
        hideTooltip();
        if (idleTimer) clearTimeout(idleTimer);

        idleTimer = setTimeout(function () {
          if (alreadyShown) return;
          alreadyShown = true;
          showTooltip("Butuh bantuan isi alamat pengiriman? Chat AI siap bantu sekarang.");
          openWidget();
        }, 5000);
      };

      events.forEach(function (evt) {
        window.addEventListener(evt, resetIdleTimer, { passive: true });
      });

      resetIdleTimer();
    }

    if (konteks.pageType === "tentang") {
      setTimeout(function () {
        if (!widget.classList.contains("open")) {
          showTooltip("Ada yang ingin ditanyakan tentang perjalanan kami? 😊");
          openWidget();
        }
      }, 5000); // 5 detik jeda
    }

    if (konteks.pageType === "galeri") {
      setTimeout(function () {
        if (!widget.classList.contains("open")) {
          showTooltip("Mau saya jelaskan detail kualitas untuk produk tertentu? 😊");
          openWidget();
        }
      }, 6000); // 6 detik jeda
    }
  }

  runWhenReady(function () {
    var konteks = deteksiKonteks();
    hapusIkonWALama();
    injectStyle();
    buatWidget(konteks);
    initChatLogic(konteks);
  });
})();
