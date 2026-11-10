export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "error" in body &&
      typeof body.error === "string"
        ? body.error
        : "The request could not be completed.";
    throw new ApiError(message, response.status);
  }
  return body as T;
}

export function newRequestKey(): string {
  return crypto.randomUUID();
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
