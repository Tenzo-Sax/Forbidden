const axios = require("axios");

const BASE_URL = "https://mahis-global-apis.vercel.app/api/sex/xnxx";

module.exports = {
  config: {
    name: "segs",
    aliases: ["xnxx"],
    version: "1.0",
    author: "Mahi",
    countDown: 5,
    role: 0,
    description: { en: "Search and download videos" },
    category: "media",
    guide: { en: "{pn} <query>\n{pn} -d <url>" }
  },

  langs: {
    en: {
      noQuery: "❌ Please provide a query.\nExample: {pn} eren",
      noResult: "❌ No results found for \"%1\"",
      failed: "❌ Failed: %1",
      noDownloadUrl: "❌ Please provide a URL to download.",
      result:
        "🔎 Results for \"%1\"\n\n%2\n\nReply with 1-%3 to download"
    }
  },

  onStart: async function ({ api, event, args, message, getLang }) {
    if (!args.length) return message.reply(getLang("noQuery"));

    const react = async (emoji) => {
      try {
        await api.setMessageReaction(emoji, event.threadID, event.messageID, event.clientContext);
      } catch (_) {}
    };

    if (args[0] === "-d" || args[0] === "dl") {
      const url = args[1];
      if (!url) return message.reply(getLang("noDownloadUrl"));

      await react("⌛");
      try {
        const res = await axios.get(
          `${BASE_URL}?action=download&url=${encodeURIComponent(url)}`,
          { timeout: 30000 }
        );

        const data = res.data;
        if (!data?.status || !data?.result) throw new Error("download failed");

        const r = data.result;
        const videoUrl = r.files?.high || r.files?.low || r.contentUrl;
        if (!videoUrl) throw new Error("no video url");

        await api.sendMessage(
          {
            body: `🎬 ${r.title || "video"}`,
            attachment: videoUrl,
            mediaType: "video"
          },
          event.threadID,
          event
        );

        await react("✅");
      } catch (e) {
        await react("❌");
        return message.reply(getLang("failed", e.message));
      }
      return;
    }

    const query = args.join(" ").trim();
    if (!query) return message.reply(getLang("noQuery"));

    await react("⌛");

    try {
      const res = await axios.get(
        `${BASE_URL}?action=search&query=${encodeURIComponent(query)}`,
        { timeout: 30000 }
      );

      const data = res.data;
      const results = data?.results || [];
      if (!results.length) {
        await react("❌");
        return message.reply(getLang("noResult", query));
      }

      const shown = results.slice(0, 8);
      const list = shown.map((r, i) => {
        const t = r.title || "unknown";
        const info = r.info || "";
        return `${i + 1}. ${t}\n   ${info}`;
      }).join("\n\n");

      const sent = await message.reply(getLang("result", query, list, shown.length));

      global.GoatBot.onReply.set(sent.messageID, {
        commandName: this.config.name,
        messageID: sent.messageID,
        author: event.senderID,
        results: shown,
        type: "search"
      });

      await react("✅");
    } catch (e) {
      await react("❌");
      return message.reply(getLang("failed", e.message));
    }
  },

  onReply: async function ({ api, event, Reply, args, message, getLang }) {
    if (String(event.senderID) !== String(Reply.author)) return;
    if (Reply.type !== "search") return;

    const num = parseInt(args[0], 10);
    const results = Reply.results || [];
    if (!num || num < 1 || num > results.length) return;

    const item = results[num - 1];
    const link = item.link;
    if (!link) return message.reply(getLang("failed", "no link"));

    const react = async (emoji) => {
      try {
        await api.setMessageReaction(emoji, event.threadID, event.messageID, event.clientContext);
      } catch (_) {}
    };

    await react("⌛");

    try {
      const res = await axios.get(
        `${BASE_URL}?action=download&url=${encodeURIComponent(link)}`,
        { timeout: 30000 }
      );

      const data = res.data;
      if (!data?.status || !data?.result) throw new Error("download failed");

      const r = data.result;
      const videoUrl = r.files?.high || r.files?.low || r.contentUrl;
      if (!videoUrl) throw new Error("no video url");

      await api.sendMessage(
        {
          body: `🎬 ${r.title || "video"}`,
          attachment: videoUrl,
          mediaType: "video"
        },
        event.threadID,
        event
      );

      await react("✅");
    } catch (e) {
      await react("❌");
      return message.reply(getLang("failed", e.message));
    }
  }
};
