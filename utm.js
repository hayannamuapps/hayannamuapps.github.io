/* RouteTracker marketing attribution helpers. */
(function attachRouteTrackerUtm(root) {
  "use strict";

  const TRACKED_UTM_KEYS = Object.freeze([
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
  ]);

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

  const api = Object.freeze({
    TRACKED_UTM_KEYS,
    getIncomingUtm,
    appendIncomingUtm,
    applyIncomingUtmToPlayStoreLinks,
  });

  if (root) {
    root.RouteTrackerUtm = api;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
