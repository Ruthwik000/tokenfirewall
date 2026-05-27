import { TokenFirewallRequestHeaderHints } from "./types";

export const TOKEN_FIREWALL_TASK_TYPE_HEADER = "x-tokenfirewall-task-type";
export const TOKEN_FIREWALL_SMART_ROUTING_HEADER = "x-tokenfirewall-smart-routing";
export const TOKEN_FIREWALL_TAGS_HEADER = "x-tokenfirewall-tags";

type HeaderValue = string | number | boolean | string[] | undefined | null;

interface HeaderGetter {
  get(name: string): string | null;
}

interface HeaderForEach {
  forEach(callback: (value: string, key: string) => void): void;
}

/**
 * Parse TokenFirewall smart-routing controls from request headers.
 */
export function parseTokenFirewallHeaders(headers: unknown): TokenFirewallRequestHeaderHints {
  return {
    taskType: normalizeHeaderText(readHeader(headers, TOKEN_FIREWALL_TASK_TYPE_HEADER)),
    smartRouting: parseSmartRoutingHeader(
      readHeader(headers, TOKEN_FIREWALL_SMART_ROUTING_HEADER)
    ),
    tags: parseTagsHeader(readHeader(headers, TOKEN_FIREWALL_TAGS_HEADER))
  };
}

/**
 * Check whether any TokenFirewall header hints were supplied.
 */
export function hasTokenFirewallHeaderHints(hints: TokenFirewallRequestHeaderHints): boolean {
  return Boolean(
    hints.taskType ||
    hints.smartRouting !== undefined ||
    hints.tags.length > 0
  );
}

function readHeader(headers: unknown, name: string): string | undefined {
  if (!headers) {
    return undefined;
  }

  const getter = headers as Partial<HeaderGetter>;
  if (typeof getter.get === "function") {
    return normalizeHeaderValue(getter.get(name));
  }

  if (Array.isArray(headers)) {
    const match = headers.find(([key]) =>
      typeof key === "string" && key.toLowerCase() === name
    );
    return match ? normalizeHeaderValue(match[1]) : undefined;
  }

  const forEachHeaders = headers as Partial<HeaderForEach>;
  if (typeof forEachHeaders.forEach === "function") {
    let value: string | undefined;
    forEachHeaders.forEach((headerValue, key) => {
      if (key.toLowerCase() === name) {
        value = normalizeHeaderValue(headerValue);
      }
    });
    return value;
  }

  if (typeof headers === "object") {
    const record = headers as Record<string, HeaderValue>;
    const key = Object.keys(record).find((headerName) =>
      headerName.toLowerCase() === name
    );
    return key ? normalizeHeaderValue(record[key]) : undefined;
  }

  return undefined;
}

function normalizeHeaderValue(value: HeaderValue): string | undefined {
  if (Array.isArray(value)) {
    return value.join(",");
  }
  if (value === undefined || value === null) {
    return undefined;
  }
  return String(value);
}

function normalizeHeaderText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function parseSmartRoutingHeader(value: string | undefined): boolean | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (["1", "true", "yes", "on", "enabled"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off", "disabled"].includes(normalized)) {
    return false;
  }

  return undefined;
}

function parseTagsHeader(value: string | undefined): string[] {
  const seen = new Set<string>();
  const tags = value
    ? value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
    : [];

  return tags.filter((tag) => {
    const key = tag.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
