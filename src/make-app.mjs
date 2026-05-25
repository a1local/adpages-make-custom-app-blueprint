export const GOOGLE_ADS_TEXT_LIMITS = {
  minHeadlines: 3,
  maxHeadlines: 15,
  maxHeadlineLength: 30,
  minDescriptions: 2,
  maxDescriptions: 4,
  maxDescriptionLength: 90
};

export const checklistHeaders = ["Phase", "Item", "Owner", "Status", "Evidence"];

export function generateUtmUrl(input = {}) {
  const required = ["baseUrl", "source", "medium", "campaign"];
  const missingRequired = required.filter((key) => !normalizeText(input[key]));
  if (missingRequired.includes("baseUrl")) {
    return {
      module: "generate-utm-url",
      localOnly: true,
      url: "",
      params: {},
      missingRequired
    };
  }

  const url = new URL(String(input.baseUrl));
  const params = {};
  for (const [field, key] of [
    ["source", "utm_source"],
    ["medium", "utm_medium"],
    ["campaign", "utm_campaign"],
    ["term", "utm_term"],
    ["content", "utm_content"]
  ]) {
    const value = normalizeUtmValue(input[field]);
    if (value) {
      url.searchParams.set(key, value);
      params[key] = value;
    }
  }

  return {
    module: "generate-utm-url",
    localOnly: true,
    url: url.toString(),
    params,
    missingRequired
  };
}

export function validateGoogleAdsCopy(input = {}) {
  const limits = { ...GOOGLE_ADS_TEXT_LIMITS, ...(input.limits || {}) };
  const headlines = normalizeArray(input.headlines);
  const descriptions = normalizeArray(input.descriptions);
  const issues = [];
  const warnings = [];

  if (headlines.length < limits.minHeadlines) {
    issues.push(`Add at least ${limits.minHeadlines} headlines.`);
  }
  if (headlines.length > limits.maxHeadlines) {
    issues.push(`Use no more than ${limits.maxHeadlines} headlines.`);
  }
  if (descriptions.length < limits.minDescriptions) {
    issues.push(`Add at least ${limits.minDescriptions} descriptions.`);
  }
  if (descriptions.length > limits.maxDescriptions) {
    issues.push(`Use no more than ${limits.maxDescriptions} descriptions.`);
  }

  headlines.forEach((headline, index) => {
    if (headline.length > limits.maxHeadlineLength) {
      issues.push(`Headline ${index + 1} is ${headline.length} characters; limit is ${limits.maxHeadlineLength}.`);
    }
  });
  descriptions.forEach((description, index) => {
    if (description.length > limits.maxDescriptionLength) {
      issues.push(`Description ${index + 1} is ${description.length} characters; limit is ${limits.maxDescriptionLength}.`);
    }
  });

  if (new Set(headlines.map((value) => value.toLowerCase())).size !== headlines.length) {
    warnings.push("Headlines include duplicates.");
  }
  if (input.finalUrl && !String(input.finalUrl).startsWith("https://")) {
    warnings.push("Final URL should use HTTPS before launch.");
  }

  return {
    module: "validate-ad-copy",
    localOnly: true,
    valid: issues.length === 0,
    issues,
    warnings,
    counts: {
      headlines: headlines.length,
      descriptions: descriptions.length,
      longestHeadline: longestLength(headlines),
      longestDescription: longestLength(descriptions)
    },
    limits
  };
}

export function generateLocalBusinessSchema(input = {}) {
  const required = ["name", "url", "telephone", "serviceType", "address", "serviceAreas"];
  const missingRequired = required.filter((key) => {
    const value = input[key];
    return Array.isArray(value) ? value.length === 0 : !value;
  });
  const address = input.address || {};
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: normalizeText(input.name),
    url: normalizeText(input.url),
    telephone: normalizeText(input.telephone),
    image: normalizeText(input.image),
    address: {
      "@type": "PostalAddress",
      streetAddress: normalizeText(address.streetAddress),
      addressLocality: normalizeText(address.addressLocality),
      addressRegion: normalizeText(address.addressRegion),
      postalCode: normalizeText(address.postalCode),
      addressCountry: normalizeText(address.addressCountry || "AU")
    },
    areaServed: normalizeArray(input.serviceAreas).map((area) => ({
      "@type": "City",
      name: area
    })),
    makesOffer: {
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: normalizeText(input.serviceType)
      }
    }
  };

  removeEmptyValues(schema);

  return {
    module: "generate-local-schema",
    localOnly: true,
    schema,
    scriptTag: `<script type="application/ld+json">${JSON.stringify(schema)}</script>`,
    missingRequired
  };
}

export function createPageChecklist(input = {}) {
  const owner = normalizeText(input.owner || "Unassigned");
  const pageUrl = normalizeText(input.pageUrl);
  const businessName = normalizeText(input.businessName);
  const location = normalizeText(input.location);
  const primaryOffer = normalizeText(input.primaryOffer);
  const rows = [
    ["Offer", `Confirm the page promises ${primaryOffer || "one clear offer"}.`, owner, "Todo", pageUrl],
    ["Copy", `Check ${businessName || "business"} name, service, and ${location || "location"} references.`, owner, "Todo", pageUrl],
    ["Tracking", "Confirm final URL carries source, medium, campaign, content, and term when relevant.", owner, "Todo", ""],
    ["Forms", "Submit a test lead and confirm attribution fields are preserved.", owner, "Todo", ""],
    ["Schema", "Validate LocalBusiness JSON-LD against the final page content.", owner, "Todo", ""],
    ["Ads", "Review final headlines and descriptions before import.", owner, "Todo", ""],
    ["Trust", "Check reviews, guarantees, licenses, and contact details are visible.", owner, "Todo", ""],
    ["Accessibility", "Check labels, contrast, focus order, and keyboard navigation.", owner, "Todo", ""],
    ["Performance", "Run a mobile performance check after image compression.", owner, "Todo", ""],
    ["Privacy", "Confirm form copy and privacy links match the tracking setup.", owner, "Todo", ""],
    ["QA", "Open the page on mobile and desktop before launch.", owner, "Todo", pageUrl],
    ["Launch", "Record launch date, owner, and rollback notes.", owner, "Todo", ""]
  ].map(([Phase, Item, Owner, Status, Evidence]) => ({ Phase, Item, Owner, Status, Evidence }));

  return {
    module: "create-page-checklist",
    localOnly: true,
    rows,
    csv: toCsv(rows, checklistHeaders),
    summary: {
      totalItems: rows.length,
      pageUrl,
      businessName,
      location,
      primaryOffer
    }
  };
}

export function runScenario(scenario = {}) {
  const results = {};
  const steps = Array.isArray(scenario.steps) ? scenario.steps : [];

  for (const step of steps) {
    const moduleId = step.module;
    if (moduleId === "generate-utm-url") {
      results[moduleId] = generateUtmUrl(step.input);
    } else if (moduleId === "validate-ad-copy") {
      results[moduleId] = validateGoogleAdsCopy(step.input);
    } else if (moduleId === "generate-local-schema") {
      results[moduleId] = generateLocalBusinessSchema(step.input);
    } else if (moduleId === "create-page-checklist") {
      results[moduleId] = createPageChecklist(step.input);
    } else {
      throw new Error(`Unknown module: ${moduleId}`);
    }
  }

  return {
    scenarioName: normalizeText(scenario.name || "Untitled scenario"),
    localOnly: true,
    blueprintOnly: true,
    results
  };
}

export function toCsv(rows, headers) {
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))
  ].join("\n");
}

function normalizeArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map(normalizeText).filter(Boolean);
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeUtmValue(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function longestLength(values) {
  return values.reduce((max, value) => Math.max(max, value.length), 0);
}

function removeEmptyValues(value) {
  if (!value || typeof value !== "object") {
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (child && typeof child === "object") {
      removeEmptyValues(child);
    }
    if (child === "" || child === undefined || child === null) {
      delete value[key];
    }
    if (Array.isArray(child) && child.length === 0) {
      delete value[key];
    }
  }
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}
