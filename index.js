require("dotenv").config();
const express = require("express");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || "vXX.X";

function menu() {
  return [
    "🤖 *HAMO BOT*",
    "أهلاً بيك! اختار خدمة بكتابة الأمر:",
    "",
    "1 - القائمة",
    "2 - نكتة",
    "3 - معلومة",
    "4 - مساعدة دراسية",
    "5 - ترجمة (اكتب: ترجم ثم النص)",
    "",
    "مثال: ترجم good morning",
    "مطور البوت: HAMO"
  ].join("\\n");
}

function replyFor(message) {
  const text = (message || "").trim();
  const lower = text.toLowerCase();

  if (!text || ["hi", "hello", "مرحبا", "السلام عليكم", "القائمة", "menu", "1"].includes(lower)) {
    return menu();
  }
  if (lower === "2" || lower.includes("نكتة") || lower.includes("نكت")) {
    const jokes = [
      "مرة كمبيوتر راح للدكتور… قاله عندي فيروس 😂",
      "مدرس رياضيات خلف ولدين… سمّى واحد س والثاني ص 😄",
      "مرة كتاب وقع من على الرف… قال: دي نهاية الفصل!"
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }
  if (lower === "3" || lower.includes("معلومة")) {
    return "هل تعلم؟ الأخطبوط لديه ثلاثة قلوب! 🐙";
  }
  if (lower === "4" || lower.includes("دراسة") || lower.includes("مذاكرة")) {
    return "📚 ابعت سؤالك الدراسي أو صورة واضحة للسؤال، واكتب المادة والصف، وهساعدك تفهم الحل خطوة بخطوة.";
  }
  if (lower.startsWith("ترجم ")) {
    return "🌍 خدمة الترجمة هتحتاج توصيل واجهة ترجمة خارجية بمفتاح API. استلمت النص: " + text.slice(6);
  }
  if (lower === "help" || lower === "مساعدة") {
    return "اكتب «القائمة» لعرض الخدمات، أو ابعت سؤالك مباشرة.";
  }
  return "وصلت رسالتك إلى HAMO BOT ✅\\nالخدمات الذكية المتقدمة تحتاج إضافة مفتاح API. اكتب «القائمة» لعرض الأوامر المتاحة.";
}

async function sendWhatsAppText(to, body) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID || GRAPH_API_VERSION === "vXX.X") {
    console.log("بيانات Meta غير مكتملة. الرسالة التجريبية إلى:", to, body);
    return;
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${PHONE_NUMBER_ID}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body }
    })
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("WhatsApp API error:", data);
  } else {
    console.log("Message sent:", data);
  }
}

// Meta webhook verification
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Incoming WhatsApp messages
app.post("/webhook", async (req, res) => {
  // Respond quickly so Meta does not retry the webhook.
  res.sendStatus(200);

  try {
    const entries = req.body.entry || [];
    for (const entry of entries) {
      for (const change of (entry.changes || [])) {
        const value = change.value || {};
        const messages = value.messages || [];
        for (const message of messages) {
          if (message.type !== "text") continue;
          const from = message.from;
          const incoming = message.text && message.text.body;
          const answer = replyFor(incoming);
          await sendWhatsAppText(from, answer);
        }
      }
    }
  } catch (error) {
    console.error("Webhook processing error:", error);
  }
});

app.get("/", (_req, res) => {
  res.type("text").send("HAMO BOT is running.");
});

app.listen(PORT, () => {
  console.log(`HAMO BOT listening on port ${PORT}`);
});
