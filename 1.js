// ==MiruExtension==
// @name         Missav
// @version      v0.0.1
// @lang         zh-cn
// @license      MIT
// @package      missav.ws
// @type         bangumi
// @icon         https://missav.ws/favicon.ico
// @webSite      https://missav.ws
// @nsfw         true
// ==/MiruExtension==

export default class extends Extension {
  async latest() {
    const res = await this.request("/latest-updates");
    const bsxList = await this.querySelectorAll(res, "div.item");
    const novel = [];
    for (const element of bsxList) {
      const html = await element.content;
      const url = await this.getAttributeText(html, "a", "href");
      const title = await this.querySelector(html, "a").text;
      const cover = await this.getAttributeText(html, "img", "data-src");
      novel.push({
        title: title.trim(),
        url,
        cover,
      });
    }
    return novel;
  }

  async search(kw) {
    const res = await this.request(`/search?query=${kw}`);
    const bsxList = await this.querySelectorAll(res, "div.item");
    const novel = [];

    for (const element of bsxList) {
      const html = await element.content;
      const url = await this.getAttributeText(html, "a", "href");
      const title = await this.querySelector(html, "a").text;
      const cover = await this.getAttributeText(html, "img", "data-src");
      novel.push({
        title: title.trim(),
        url,
        cover,
      });
    }
    return novel;
  }

  async detail(url) {
    const res = await this.request(`${url}`, {
      headers: {
        "miru-referer": "https://missav.ws/",
      },
    });

    const title = await this.querySelector(res, "h1.title").text;
    const cover = await this.getAttributeText(res, ".video-cover img", "data-src");
    const desc = await this.querySelector(res, ".video-description").text;

    const episodes = [];
    const epiList = await this.querySelectorAll(res, ".episode-list a");

    for (const element of epiList) {
      const html = await element.content;
      const name = await this.querySelector(html, ".episode-title").text;
      const url = await this.getAttributeText(html, "a", "href");

      episodes.push({
        name: name.trim(),
        url,
      });
    }

    return {
      title: title.trim(),
      cover,
      desc: desc.trim(),
      episodes: [
        {
          title: "Episodes",
          urls: episodes,
        },
      ],
    };
  }

  async watch(url) {
    const res = await this.request(url, {
      headers: {
        "miru-referer": "https://missav.ws/",
      },
    });
    const videoUrl = await this.getAttributeText(res, "video source", "src");
    return {
      type: "video",
      url: videoUrl,
    };
  }
}