/* RouteTracker marketing attribution helpers. */
(function attachRouteTrackerUtm(root) {
  "use strict";

  const TRACKED_UTM_KEYS = Object.freeze([
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
  ]);

  const APPLE_CAMPAIGN_LINKS = Object.freeze({
    reddit: "https://apps.apple.com/app/apple-store/id6776908209?pt=128997276&ct=rt_202607_reddit&mt=8",
    threads: "https://apps.apple.com/app/apple-store/id6776908209?pt=128997276&ct=rt_202607_threads&mt=8",
    x: "https://apps.apple.com/app/apple-store/id6776908209?pt=128997276&ct=rt_202607_x&mt=8",
    instagram: "https://apps.apple.com/app/apple-store/id6776908209?pt=128997276&ct=rt_202607_instagram&mt=8",
  });

  function toSearchParams(search) {
    if (search instanceof URLSearchParams) {
      return search;
    }
    return new URLSearchParams(String(search || ""));
  }

  function getIncomingUtm(search) {
    const params = toSearchParams(search);
    return TRACKED_UTM_KEYS.reduce((result, key) => {
      const value = params.get(key);
      if (value) {
        result[key] = value;
      }
      return result;
    }, {});
  }

  function appendIncomingUtm(url, search) {
    const baseUrl = root && root.location && root.location.href
      ? root.location.href
      : "https://hayannamuapps.github.io/";
    const parsed = new URL(url, baseUrl);
    const incoming = getIncomingUtm(search);

    Object.entries(incoming).forEach(([key, value]) => {
      parsed.searchParams.set(key, value);
    });

    return parsed.toString();
  }

  function applyIncomingUtmToPlayStoreLinks(documentObject, search) {
    const documentRef = documentObject || (root && root.document);
    if (!documentRef) {
      return 0;
    }

    const incomingSearch = search === undefined
      ? (root && root.location ? root.location.search : "")
      : search;
    const incoming = getIncomingUtm(incomingSearch);
    if (Object.keys(incoming).length === 0) {
      return 0;
    }

    const links = documentRef.querySelectorAll('[data-store="play"]');
    links.forEach((link) => {
      link.href = appendIncomingUtm(link.href, incomingSearch);
      if (link.dataset) {
        link.dataset.utmTracked = "true";
      }
    });
    return links.length;
  }

  function applyIncomingAttributionToStoreLinks(documentObject, search) {
    const documentRef = documentObject || (root && root.document);
    if (!documentRef) {
      return 0;
    }

    const incomingSearch = search === undefined
      ? (root && root.location ? root.location.search : "")
      : search;
    const incoming = getIncomingUtm(incomingSearch);
    if (Object.keys(incoming).length === 0) {
      return 0;
    }

    const playCount = applyIncomingUtmToPlayStoreLinks(documentRef, incomingSearch);
    const source = String(incoming.utm_source || "").toLowerCase();
    const appleUrl = APPLE_CAMPAIGN_LINKS[source];
    const appStoreLinks = documentRef.querySelectorAll('[data-store="app-store"]');
    if (!appleUrl) {
      return playCount;
    }

    appStoreLinks.forEach((link) => {
      link.href = appleUrl;
      if (link.dataset) {
        link.dataset.appleCampaignTracked = "true";
      }
    });
    return playCount + appStoreLinks.length;
  }

  const api = Object.freeze({
    APPLE_CAMPAIGN_LINKS,
    TRACKED_UTM_KEYS,
    getIncomingUtm,
    appendIncomingUtm,
    applyIncomingAttributionToStoreLinks,
    applyIncomingUtmToPlayStoreLinks,
  });

  if (root) {
    root.RouteTrackerUtm = api;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
