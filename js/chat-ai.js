document.addEventListener("DOMContentLoaded", () => {
  const widget = document.getElementById("ai-chat-widget");
  const tombolToggle = document.getElementById("ai-chat-toggle");
  const tombolTutup = document.getElementById("ai-chat-close");
  const jendelaChat = document.getElementById("ai-chat-window");
  const kotakRespon = document.getElementById("kotak-respon");
  const inputChat = document.getElementById("input-chat");
  const tombolKirim = document.getElementById("tombol-kirim");

  if (!widget || !tombolToggle || !jendelaChat || !kotakRespon || !inputChat || !tombolKirim) return;

  const chatEndpoint = "/api/gemini-chat";
  const riwayatPercakapan = [];
  const maksRiwayat = 12;
  let sedangMengirim = false;

  const geserKeBawah = () => {
    kotakRespon.scrollTop = kotakRespon.scrollHeight;
  };

  const tambahBubble = (teks, tipe) => {
    const bubble = document.createElement("div");
    bubble.className = `ai-chat-message ${tipe === "user" ? "ai-chat-message-user" : "ai-chat-message-bot"}`;
    bubble.textContent = teks;
    kotakRespon.appendChild(bubble);
    geserKeBawah();
    return bubble;
  };

  const aturStatusBuka = (isBuka) => {
    widget.classList.toggle("open", isBuka);
    tombolToggle.setAttribute("aria-expanded", String(isBuka));
    jendelaChat.setAttribute("aria-hidden", String(!isBuka));
    if (isBuka) {
      inputChat.focus();
      geserKeBawah();
    }
  };

  tombolToggle.addEventListener("click", () => {
    aturStatusBuka(!widget.classList.contains("open"));
  });

  if (tombolTutup) {
    tombolTutup.addEventListener("click", () => aturStatusBuka(false));
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && widget.classList.contains("open")) {
      aturStatusBuka(false);
    }
  });

  const simpanRiwayat = (role, text) => {
    riwayatPercakapan.push({ role, text });
    if (riwayatPercakapan.length > maksRiwayat) {
      riwayatPercakapan.splice(0, riwayatPercakapan.length - maksRiwayat);
    }
  };

  const kirimPesan = async () => {
    const pesanUser = inputChat.value.trim();
    if (!pesanUser || sedangMengirim) return;

    aturStatusBuka(true);
    tambahBubble(pesanUser, "user");
    inputChat.value = "";
    sedangMengirim = true;
    inputChat.disabled = true;
    tombolKirim.disabled = true;

    const bubbleStatus = tambahBubble("Asisten sedang mengetik...", "bot");

    try {
      const response = await fetch(chatEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: pesanUser,
          history: riwayatPercakapan,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request gagal dengan status ${response.status}`);
      }

      const hasil = await response.json();
      const jawaban = typeof hasil.reply === "string" && hasil.reply.trim() ? hasil.reply.trim() : "Maaf Kak, jawaban belum tersedia. Silakan coba lagi sebentar.";

      simpanRiwayat("user", pesanUser);
      simpanRiwayat("model", jawaban);
      bubbleStatus.textContent = jawaban;
    } catch (error) {
      bubbleStatus.textContent = "Maaf Kak, chat AI sedang bermasalah. Coba lagi dalam beberapa saat, atau hubungi WhatsApp 0813-4852-0154.";
      console.error("Gagal mengirim chat ke server:", error);
    } finally {
      sedangMengirim = false;
      inputChat.disabled = false;
      tombolKirim.disabled = false;
      inputChat.focus();
      geserKeBawah();
    }
  };

  tombolKirim.addEventListener("click", kirimPesan);
  inputChat.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      kirimPesan();
    }
  });
});
