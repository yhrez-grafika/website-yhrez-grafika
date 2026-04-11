const GEMINI_MODEL = "gemini-1.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const BASE_SYSTEM_INSTRUCTION = `Kamu adalah Asisten Pemandu Website Yh'rez Grafika di Palangka Raya.

Peran utama:
1. Menjawab pertanyaan layanan percetakan (harga, estimasi, opsi produk).
2. Menjadi pemandu website: jelaskan fungsi kolom input, langkah order, dan arah navigasi halaman.
3. Berikan jawaban ringkas, ramah, sopan, dan mudah dipahami.

Data bisnis penting yang wajib akurat:
- Jilid Hardcover: Rp40rb-Rp50rb per buku (tergantung ketebalan/pengerjaan).
- Nota NCR (1/4 folio): sekitar Rp100.000 per rim (isi 40 buku).
- Stempel otomatis/flash: Rp50rb-Rp85rb.
- ID Card PVC: sekitar Rp15rb per kartu.
- Alamat toko: Jl. Sangga Buana II, No.01 Palangka Raya.
- WhatsApp pemesanan cepat: 0813-4852-0154.

Aturan respons:
- Gunakan sapaan "Kak" atau "Halo sobat Yh'rez".
- Jika pertanyaan menyangkut harga, tampilkan poin-poin agar jelas.
- Jika user bertanya layanan yang tidak tersedia (banner/baliho), tolak sopan dan arahkan ke layanan yang tersedia.
- Jika user bingung isi form atau kolom, jelaskan langkah yang praktis langkah demi langkah.
- Akhiri dengan ajakan tindakan (contoh: lanjut isi data, pilih produk, atau hubungi WA).`;

function kirimJSON(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function amanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function bacaBody(req) {
  if (typeof req.body === "object" && req.body !== null) {
    return req.body;
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }

  if (!chunks.length) return {};

  try {
    const raw = Buffer.concat(chunks).toString("utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function normalisasiHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .map((item) => {
      const role = item && item.role === "model" ? "model" : "user";
      const text = amanText(item && item.text);
      if (!text) return null;

      return {
        role,
        parts: [{ text }],
      };
    })
    .filter(Boolean)
    .slice(-16);
}

function normalisasiContext(context) {
  const ctx = context && typeof context === "object" ? context : {};

  return {
    pageType: amanText(ctx.pageType) || "umum",
    pageTitle: amanText(ctx.pageTitle) || "Halaman tanpa judul",
    pagePath: amanText(ctx.pagePath) || "/",
    pageUrl: amanText(ctx.pageUrl) || "",
  };
}

function buildSystemInstruction(context, isFirstTurn) {
  const bagianKonteks = ["", "Konteks halaman saat ini:", `- Tipe halaman: ${context.pageType}`, `- Judul halaman: ${context.pageTitle}`, `- Path halaman: ${context.pagePath}`];

  if (context.pageUrl) {
    bagianKonteks.push(`- URL halaman: ${context.pageUrl}`);
  }

  if (context.pageType === "map") {
    bagianKonteks.push(
      "",
      "Panduan khusus halaman MAP:",
      "- Fokus bantu user isi alamat pengiriman dengan benar.",
      "- Jelaskan bahwa kolom pertama harus alamat lengkap (jalan, nomor, patokan).",
      "- Bantu jelaskan fungsi kolom detail alamat, kota, provinsi, kode pos, negara.",
      "- Jika ini jawaban AI pertama di percakapan, buka dengan kalimat persis berikut:",
      "  Halo! Saya asisten Yh'rez. Di halaman ini Kakak bisa mengisi alamat pengiriman. Masukkan alamat lengkap di kolom pertama agar kami mudah menemukan lokasi Kakak.",
    );

    if (isFirstTurn) {
      bagianKonteks.push("- Karena ini chat pertama, WAJIB gunakan sapaan pembuka persis seperti kalimat di atas, lalu lanjutkan jawaban.");
    }
  }

  if (context.pageType === "katalog") {
    bagianKonteks.push("", "Panduan khusus halaman KATALOG:", "- Prioritaskan penjelasan layanan populer.", "- Siapkan jawaban detail harga jilid hardcover dan stempel saat ditanya.", "- Arahkan user ke produk yang relevan di katalog atau tombol order.");
  }

  if (context.pageType === "produk") {
    bagianKonteks.push("", "Panduan halaman PRODUK:", "- Jelaskan manfaat produk yang sedang dibuka dan langkah order cepat.");
  }

  if (context.pageType === "tentang") {
    bagianKonteks.push(
      "",
      "Panduan khusus halaman TENTANG KAMI:",
      "- Fokus pada storytelling, bukan hard-selling. Ceritakan misi dan sejarah bisnis dengan nada inspiratif dan ramah.",
      "- Jika ditanya tentang usaha ini, jelaskan bahwa bisnis dimulai dari niat tulus membantu kelancaran tugas akademik mahasiswa (skripsi, laporan).",
      "- Tekankan bahwa fokus utama kami adalah pelayanan yang responsif, rapi, dan cepat karena kami sangat menghargai waktu mahasiswa yang berharga.",
      "- Sebutkan bahwa kami juga bangga menjadi mitra terpercaya bagi instansi pemerintah dan pelaku UMKM di Palangka Raya.",
      "- Gunakan gaya bahasa yang penuh semangat sebagai usaha lokal yang sedang tumbuh dan berkembang.",
    );
  }

  if (context.pageType === "galeri") {
    bagianKonteks.push(
      "",
      "Panduan khusus halaman GALERI:",
      "- Peranmu adalah pemandu yang menjelaskan kualitas hasil cetak di galeri. Tawarkan untuk menjelaskan detail kualitas produk yang dilihat user.",
      "- Jika ditanya tentang hasil foto, jelaskan standar kualitas kami:",
      "  - Jilid Hardcover: Tekankan kerapian sudut (siku), tulisan emas yang tidak pudar, dan ketahanan lem yang kuat.",
      "  - Stempel & ID Card: Jelaskan tentang ketajaman warna dan presisi cetakan yang terlihat profesional.",
      "  - Nota NCR: Jelaskan bahwa tulisan tembus dengan jelas ke rangkap di bawahnya, tidak buram.",
      "- Saat menjelaskan kualitas, selalu tambahkan pesan proaktif ini: 'Hasil cetak yang rapi adalah prioritas kami karena kami tahu ini untuk keperluan penting Kakak (seperti Skripsi atau Identitas Kerja).'",
    );
  }

  return `${BASE_SYSTEM_INSTRUCTION}\n${bagianKonteks.join("\n")}`;
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    kirimJSON(res, 405, { error: "Method tidak didukung." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    kirimJSON(res, 500, { error: "GEMINI_API_KEY belum diset di environment server." });
    return;
  }

  const body = await bacaBody(req);
  const message = amanText(body.message);
  if (!message) {
    kirimJSON(res, 400, { error: "Pesan tidak boleh kosong." });
    return;
  }

  const history = normalisasiHistory(body.history);
  const context = normalisasiContext(body.context);
  const systemInstruction = buildSystemInstruction(context, history.length === 0);

  const contents = [
    ...history,
    {
      role: "user",
      parts: [{ text: message }],
    },
  ];

  try {
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        generationConfig: {
          temperature: 0.2,
          topP: 0.9,
          maxOutputTokens: 700,
        },
        contents,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const detail = data && data.error && data.error.message ? data.error.message : "Gagal memproses permintaan ke Gemini.";
      throw new Error(detail);
    }

    const reply =
      data && data.candidates && data.candidates[0] && data.candidates[0].content && Array.isArray(data.candidates[0].content.parts)
        ? data.candidates[0].content.parts
            .map((part) => (typeof part.text === "string" ? part.text : ""))
            .join("\n")
            .trim()
        : "";

    kirimJSON(res, 200, {
      reply: reply || "Maaf Kak, saya belum bisa memberi jawaban sekarang. Silakan coba lagi sebentar.",
    });
  } catch (error) {
    console.error("Gemini API error:", error);
    kirimJSON(res, 500, {
      error: "Gagal mengambil jawaban AI.",
    });
  }
};
