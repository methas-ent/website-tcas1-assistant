import { router } from "expo-router";

type RouterHref = Parameters<typeof router.replace>[0];

export function goBackOrReplace(fallbackHref: RouterHref = "/") {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallbackHref);
}
