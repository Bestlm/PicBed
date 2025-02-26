// ==MiruExtension==
// @name         missav
// @version      v0.0.1
// @language     zh-cn
// @license      MIT
// @icon         https://missav.ws/favicon.ico
// @package      missav.app
// @type         bangumi
// @website      https://www.missav.ws
// ==/MiruExtension==
export default class extends Extension {
  base64decode(str) {
    let words = CryptoJS.enc.Base64.parse(str);
    return CryptoJS.enc.Utf8.stringify(words);
  }

  async $req(url, options = {}, count = 3, timeout = 5000) {
    try {
      return await Promise.race([
        this.request(url, options),
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error("Request timed out!"));
          }, timeout);
        }),
      ]);
    } catch (error) {
      if (count > 1) {
        console.log(`[Retry (${count})]: ${url}`);
        return this.$req(url, options, count - 1);
      } else {
        throw error;
      }
    }
  }

  async load() {
    this.domain = "https://www.missav.ws";
  }

  async createFilter(filter) {
    const mainbar = {
      title: "",
      max: 1,
      min: 0,
      default: "/actresses",
      options: {
        "/actresses": "女演员",
        "/categories": "类别",
        "/new": "最新",
      },
    };
    return {
      mainbar,
    };
  }

  async latest(page) {
    const res = await this.request(`/new?page=${page}`, {
      headers: { "Miru-Url": this.domain },
    });
    return res.list.map((e) => ({
      title: e.title,
      url: e.link,
      cover: e.cover,
      update: e.update,
    }));
  }

  async search(kw, page, filter) {
    let url = `/search?query=${kw}&page=${page}`;
    if (!kw) {
      url = filter["mainbar"][0].replace("~", page);
      const res = await this.$req(url, { headers: { "Miru-Url": this.domain } });
      const selector = await this.querySelectorAll(res, "div.card");
      const results = selector.map(async (element) => {
        const html = await element.content;
        const url = await this.getAttributeText(html, "a", "href");
        const title = await this.getAttributeText(html, "a", "title");
        const cover = await this.getAttributeText(html, "img", "src");
        return { title, url, cover };
      });
      return await Promise.all(results);
    }
    const res = await this.$req(url, { headers: { "Miru-Url": this.domain } });
    const items = await this.querySelectorAll(res, "div.card");
    const results = items.map(async (element) => {
      const html = await element.content;
      const url = (await this.getAttributeText(html, "a", "href")) || "";
      const title = (await this.getAttributeText(html, "a", "title")) || "";
      const cover = (await this.getAttributeText(html, "img", "src")) || "";
      return { title, url, cover };
    });
    return await Promise.all(results);
  }

  async detail(url) {
    const res = await this.$req(url, { headers: { "Miru-Url": this.domain } });
    const title = (await this.querySelector(res, "h1.title").text) || "";
    const cover = (await this.getAttributeText(res, ".cover img", "src")) || "";
    const episodes = [];
    const episodeElements = await this.querySelectorAll(res, ".episode-list li");
    for (let element of episodeElements) {
      const name = (await this.querySelector(element, "a").text) || "";
      const url = (await this.getAttributeText(element, "a", "href")) || "";
      episodes.push({ name, url });
    }
    return { title, cover, episodes };
  }

  async watch(url) {
    const res = await this.$req(url, { headers: { "Miru-Url": this.domain } });
    const player = JSON.parse(res.match(/var player_aaaa=({.+?})</)[1]);
    const raw = decodeURIComponent(player.encrypt == 2 ? this.base64decode(player.url) : player.url);
    const resp = await this.$req(`/vid/ty4.php?url=${raw}`, {
      headers: { "Miru-Url": this.domain, Referer: this.domain },
    });
    const link = resp.match(/var vid = '(.+?)';/)[1];
    return { type: link.indexOf(".mp4") > 0 ? "mp4" : "hls", url: link, headers: { Referer: this.domain } };
  }
}