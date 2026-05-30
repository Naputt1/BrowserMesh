import type { Page as PlaywrightPage } from 'playwright-core';

export type AuthCookie = {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
};

export type AuthStorageItem = {
  origin: string;
  key: string;
  value: string;
};

export type AuthConfig = {
  readonly cookies?: readonly AuthCookie[];
  readonly localStorage?: readonly AuthStorageItem[];
  readonly headers?: Record<string, string>;
};

export async function applyAuth(page: PlaywrightPage, config: AuthConfig): Promise<void> {
  const { cookies, localStorage, headers } = config;

  if (cookies?.length) {
    const currentUrl = page.url();
    const defaultDomain = currentUrl && currentUrl !== 'about:blank'
      ? new URL(currentUrl).hostname
      : undefined;

    await page.context().addCookies(
      cookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain ?? defaultDomain,
        path: c.path ?? '/',
        httpOnly: c.httpOnly ?? false,
        secure: c.secure ?? false,
        sameSite: c.sameSite ?? 'Lax',
      })),
    );
  }

  if (headers && Object.keys(headers).length > 0) {
    const cdpSession = await page.context().newCDPSession(page);
    await cdpSession.send('Network.enable');
    await cdpSession.send('Network.setExtraHTTPHeaders', { headers });
  }

  if (localStorage?.length) {
    const byOrigin = new Map<string, AuthStorageItem[]>();
    for (const lsItem of localStorage) {
      const list = byOrigin.get(lsItem.origin) ?? [];
      list.push(lsItem);
      byOrigin.set(lsItem.origin, list);
    }

    for (const [origin, lsItems] of byOrigin) {
      if (origin && origin !== 'about:blank') {
        await page.goto(origin, { waitUntil: 'domcontentloaded' }).catch(() => {});
      }
      for (const lsItem of lsItems) {
        await page.evaluate(
          ({ k, v }: { k: string; v: string }) => {
            window.localStorage.setItem(k, v);
          },
          { k: lsItem.key, v: lsItem.value },
        );
      }
    }
  }
}
