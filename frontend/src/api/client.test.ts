import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api, ApiError } from "./client";

describe("api client", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("parses JSON responses", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => ({ hello: "world" })
    }) as unknown as typeof fetch;

    const result = await api<{ hello: string }>("/ping");
    expect(result.hello).toBe("world");
  });

  it("throws ApiError on non-2xx with JSON detail", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      headers: { get: () => "application/json" },
      json: async () => ({ detail: "Email inválido" })
    }) as unknown as typeof fetch;

    await expect(api("/bad")).rejects.toMatchObject({
      status: 400,
      message: "Email inválido"
    });
    await expect(api("/bad")).rejects.toBeInstanceOf(ApiError);
  });

  it("appends query parameters", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => ({})
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await api("/x", { query: { a: 1, b: "c", d: undefined } });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("a=1");
    expect(url).toContain("b=c");
    expect(url).not.toContain("d=");
  });

  it("attaches Authorization header when auth=true and token exists", async () => {
    localStorage.setItem("rv_auth", JSON.stringify({ state: { token: "abc123" } }));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => ({})
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await api("/secure", { auth: true });
    const opts = fetchMock.mock.calls[0][1] as RequestInit;
    expect((opts.headers as Record<string, string>).Authorization).toBe("Bearer abc123");
  });

  it("sends JSON body on POST", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      headers: { get: () => "application/json" },
      json: async () => ({ ok: true })
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await api("/post", { method: "POST", body: { hello: 1 } });
    const opts = fetchMock.mock.calls[0][1] as RequestInit;
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body as string)).toEqual({ hello: 1 });
  });
});
