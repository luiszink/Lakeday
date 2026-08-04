export function hasSameOrigin(request: Request) {
  const origin = request.headers.get('origin') ?? request.headers.get('referer');
  if (!origin) {
    return false;
  }

  try {
    const requestOrigin = new URL(request.url).origin;
    return new URL(origin).origin === requestOrigin;
  } catch {
    return false;
  }
}
