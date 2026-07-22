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
    chatgpt: "https://apps.apple.com/app/apple-store/id6776908209?pt=128997276&ct=rt_geo_chatgpt&mt=8",
    perplexity: "https://apps.apple.com/app/apple-store/id6776908209?pt=128997276&ct=rt_geo_perplexity&mt=8",
    gemini: "https://apps.apple.com/app/apple-store/id6776908209?pt=128997276&ct=rt_geo_gemini&mt=8",
    claude: "https://apps.apple.com/app/apple-store/id6776908209?pt=128997276&ct=rt_geo_claude&mt=8",
    microsoft_copilot: "https://apps.apple.com/app/apple-store/id6776908209?pt=128997276&ct=rt_geo_microsoft_copilot&mt=8",
    grok: "https://apps.apple.com/app/apple-store/id6776908209?pt=128997276&ct=rt_geo_grok&mt=8",
  });

  const AI_REFERRAL_HOSTS = Object.freeze({
    "chatgpt.com": "chatgpt",
    "perplexity.ai": "perplexity",
    "gemini.google.com": "gemini",
    "claude.ai": "claude",
    "copilot.microsoft.com": "microsoft_copilot",
    "grok.com": "grok",
  });

  const SESSION_ATTRIBUTION_KEY = "routeTrackerStoreAttribution";

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

  function getAiReferralSource(referrer) {
    if (!referrer) {
      return "";
    }

    try {
      const hostname = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
      const match = Object.entries(AI_REFERRAL_HOSTS).find(([host]) => (
        hostname === host || hostname.endsWith(`.${host}`)
      ));
      return match ? match[1] : "";
    } catch (error) {
      return "";
    }
  }

  function getPageContent(pathname) {
    const normalized = String(pathname || "/")
      .replace(/^\/+|\/+$/g, "")
      .replace(/\.html$/i, "")
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "")
      .toLowerCase();
    return normalized || "home";
  }

  function sanitizeAttribution(value) {
    if (!value || typeof value !== "object") {
      return {};
    }
    return TRACKED_UTM_KEYS.reduce((result, key) => {
      if (value[key]) {
        result[key] = String(value[key]);
      }
      return result;
    }, {});
  }

  function readSessionAttribution(storage) {
    if (!storage) {
      return {};
    }
    try {
      return sanitizeAttribution(JSON.parse(storage.getItem(SESSION_ATTRIBUTION_KEY) || "{}"));
    } catch (error) {
      return {};
    }
  }

  function writeSessionAttribution(storage, attribution) {
    if (!storage || Object.keys(attribution).length === 0) {
      return;
    }
    try {
      storage.setItem(SESSION_ATTRIBUTION_KEY, JSON.stringify(attribution));
    } catch (error) {
      // Attribution must never block navigation when storage is unavailable.
    }
  }

  function getAttribution(search, referrer, pathname, sessionAttribution) {
    const incoming = getIncomingUtm(search);
    if (Object.keys(incoming).length > 0) {
      return incoming;
    }

    const source = getAiReferralSource(referrer);
    if (source) {
      return {
        utm_source: source,
        utm_medium: "ai_referral",
        utm_campaign: "rt_geo_referral",
        utm_content: getPageContent(pathname),
      };
    }

    return sanitizeAttribution(sessionAttribution);
  }

  function appendUtm(url, attribution) {
    const baseUrl = root && root.location && root.location.href
      ? root.location.href
      : "https://hayannamuapps.github.io/";
    const parsed = new URL(url, baseUrl);

    Object.entries(attribution).forEach(([key, value]) => {
      if (TRACKED_UTM_KEYS.includes(key) && value) {
        parsed.searchParams.set(key, value);
      }
    });

    return parsed.toString();
  }

  function appendIncomingUtm(url, search) {
    return appendUtm(url, getIncomingUtm(search));
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

  function applyIncomingAttributionToStoreLinks(documentObject, search, context) {
    const documentRef = documentObject || (root && root.document);
    if (!documentRef) {
      return 0;
    }

    const incomingSearch = search === undefined
      ? (root && root.location ? root.location.search : "")
      : search;
    const runtime = context || {};
    const referrer = runtime.referrer === undefined
      ? String(documentRef.referrer || "")
      : runtime.referrer;
    const pathname = runtime.pathname === undefined
      ? (root && root.location ? root.location.pathname : "/")
      : runtime.pathname;
    let storage = runtime.storage;
    if (storage === undefined) {
      try {
        storage = root && root.sessionStorage;
      } catch (error) {
        storage = null;
      }
    }
    const storedAttribution = readSessionAttribution(storage);
    const attribution = getAttribution(incomingSearch, referrer, pathname, storedAttribution);
    if (Object.keys(attribution).length === 0) {
      return 0;
    }
    if (Object.keys(getIncomingUtm(incomingSearch)).length > 0 || getAiReferralSource(referrer)) {
      writeSessionAttribution(storage, attribution);
    }

    const playLinks = documentRef.querySelectorAll('[data-store="play"]');
    playLinks.forEach((link) => {
      link.href = appendUtm(link.href, attribution);
      if (link.dataset) {
        link.dataset.utmTracked = "true";
      }
    });

    const source = String(attribution.utm_source || "").toLowerCase();
    const appleUrl = APPLE_CAMPAIGN_LINKS[source];
    const appStoreLinks = documentRef.querySelectorAll('[data-store="app-store"]');
    if (!appleUrl) {
      return playLinks.length;
    }

    appStoreLinks.forEach((link) => {
      link.href = appleUrl;
      if (link.dataset) {
        link.dataset.appleCampaignTracked = "true";
      }
    });
    return playLinks.length + appStoreLinks.length;
  }

  const api = Object.freeze({
    APPLE_CAMPAIGN_LINKS,
    AI_REFERRAL_HOSTS,
    SESSION_ATTRIBUTION_KEY,
    TRACKED_UTM_KEYS,
    getAiReferralSource,
    getAttribution,
    getIncomingUtm,
    getPageContent,
    readSessionAttribution,
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
