(function () {
  const waNotif = new Audio("./assets/sounds/notifikasi1.mp3");
  waNotif.preload = "auto";
  waNotif.volume = 0.5;

  let audioSiapDiputar = false;
  let tungguInteraksiUlang = false;
  let notifikasiSudahDijadwalkan = false;

  function unlockAudioSekali() {
    if (audioSiapDiputar) return Promise.resolve();

    waNotif.muted = true;
    waNotif.currentTime = 0;

    const unlockPromise = waNotif.play();
    if (!unlockPromise || typeof unlockPromise.then !== "function") {
      waNotif.pause();
      waNotif.currentTime = 0;
      waNotif.muted = false;
      audioSiapDiputar = true;
      return Promise.resolve();
    }

    return unlockPromise
      .then(() => {
        waNotif.pause();
        waNotif.currentTime = 0;
        waNotif.muted = false;
        audioSiapDiputar = true;
      })
      .catch((error) => {
        waNotif.muted = false;
        throw error;
      });
  }

  function putarSuara() {
    waNotif.currentTime = 0;
    const playPromise = waNotif.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        tungguInteraksiUlang = true;
      });
    }
  }

  function tampilkanBubbleDanSuara() {
    const waFloat = document.querySelector(".wa-float");
    if (!waFloat) return;

    // Tambahkan efek suara
    waFloat.classList.add("show");
    putarSuara();

    // Pastikan tombol melayang ini juga memicu konversi Google Ads saat diklik
    waFloat.addEventListener("click", function (e) {
      const url = this.getAttribute("href");
      if (typeof gtag_report_conversion === "function") {
        // Jangan cegah default di sini agar script.js tetap bisa menangani pembukaan link
        gtag_report_conversion(url);
      }
    });
  }

  function jalankanNotifikasiAwal() {
    if (notifikasiSudahDijadwalkan) return;
    notifikasiSudahDijadwalkan = true;

    unlockAudioSekali()
      .catch(() => {})
      .finally(() => {
        setTimeout(() => {
          tampilkanBubbleDanSuara();
        }, 3000);
      });
  }

  function cobaPutarSaatInteraksiUlang() {
    if (!tungguInteraksiUlang) return;
    tungguInteraksiUlang = false;

    unlockAudioSekali()
      .catch(() => {})
      .finally(() => {
        putarSuara();
      });
  }

  window.addEventListener("click", jalankanNotifikasiAwal, { once: true });
  window.addEventListener("scroll", jalankanNotifikasiAwal, { once: true, passive: true });
  window.addEventListener("click", cobaPutarSaatInteraksiUlang, { passive: true });
  window.addEventListener("scroll", cobaPutarSaatInteraksiUlang, { passive: true });
  window.addEventListener("touchstart", cobaPutarSaatInteraksiUlang, { passive: true });
})();
