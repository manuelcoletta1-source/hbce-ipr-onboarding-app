import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import {
  GET,
  POST
} from "../app/api/access/joker-c2/route";

type RouteResponse = {
  ok: boolean;
  status: string;
  data: {
    mode?: string | null;
    result?: {
      decision?: string;
      jokerC2AccessStatus?: string;
    } | null;
  } | null;
  error: {
    code?: string;
    details?: string;
  } | null;
};

async function readJson(
  response: Response
): Promise<RouteResponse> {
  return (await response.json()) as RouteResponse;
}

function buildGetRequest(
  mode?: string
): NextRequest {
  const url = new URL(
    "http://localhost/api/access/joker-c2"
  );

  if (mode !== undefined) {
    url.searchParams.set(
      "mode",
      mode,
    );
  }

  return new NextRequest(url);
}

function buildPostRequest(
  body: string
): NextRequest {
  return new NextRequest(
    "http://localhost/api/access/joker-c2",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body
    }
  );
}

describe(
  "JOKER-C2 explicit demo access modes",
  () => {
    for (const mode of [
      "approved",
      "pending",
      "denied",
      "revoked"
    ] as const) {
      it(
        `evaluates explicit mode ${mode}`,
        async () => {
          const response = await GET(
            buildGetRequest(mode)
          );

          const payload = await readJson(
            response
          );

          expect(response.status).toBe(200);
          expect(payload.ok).toBe(true);
          expect(payload.status).toBe(
            "success"
          );
          expect(payload.data?.mode).toBe(
            mode
          );
          expect(
            payload.data?.result
          ).toBeTruthy();
          expect(payload.error).toBeNull();
        }
      );
    }
  }
);

describe(
  "JOKER-C2 fail-closed request parsing",
  () => {
    it(
      "rejects GET without mode instead of selecting approved",
      async () => {
        const response = await GET(
          buildGetRequest()
        );

        const payload = await readJson(
          response
        );

        expect(response.status).toBe(400);
        expect(payload.ok).toBe(false);
        expect(payload.status).toBe(
          "error"
        );
        expect(payload.data).toBeNull();
        expect(payload.error?.code).toBe(
          "MISSING_MODE"
        );
      }
    );

    it(
      "rejects GET with invalid mode instead of selecting approved",
      async () => {
        const response = await GET(
          buildGetRequest("garbage")
        );

        const payload = await readJson(
          response
        );

        expect(response.status).toBe(400);
        expect(payload.ok).toBe(false);
        expect(payload.data).toBeNull();
        expect(payload.error?.code).toBe(
          "INVALID_MODE"
        );
      }
    );

    it(
      "rejects POST without mode instead of selecting approved",
      async () => {
        const response = await POST(
          buildPostRequest("{}")
        );

        const payload = await readJson(
          response
        );

        expect(response.status).toBe(400);
        expect(payload.ok).toBe(false);
        expect(payload.data).toBeNull();
        expect(payload.error?.code).toBe(
          "MISSING_MODE"
        );
      }
    );

    it(
      "rejects POST with invalid mode instead of selecting approved",
      async () => {
        const response = await POST(
          buildPostRequest(
            JSON.stringify({
              mode: "garbage"
            })
          )
        );

        const payload = await readJson(
          response
        );

        expect(response.status).toBe(400);
        expect(payload.ok).toBe(false);
        expect(payload.data).toBeNull();
        expect(payload.error?.code).toBe(
          "INVALID_MODE"
        );
      }
    );

    it(
      "rejects malformed JSON without constructing an approved fallback",
      async () => {
        const response = await POST(
          buildPostRequest('{"mode":')
        );

        const payload = await readJson(
          response
        );

        expect(response.status).toBe(400);
        expect(payload.ok).toBe(false);
        expect(payload.status).toBe(
          "error"
        );
        expect(payload.data).toBeNull();
        expect(payload.error?.code).toBe(
          "INVALID_JSON"
        );
      }
    );
  }
);
