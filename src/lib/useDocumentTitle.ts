import { useEffect } from 'react';

const SITE_NAME = 'SescoHub';

/**
 * Sets document.title per page. This is a client-rendered SPA (no SSR), so
 * this only affects the browser tab / bookmark title and client-side
 * navigation — it does not change what search engine crawlers or social
 * previews see for that specific route (those come from the static tags in
 * index.html). A lightweight, dependency-free stand-in for react-helmet
 * given the app doesn't otherwise need a full head-management library.
 */
export function useDocumentTitle(title: string, description?: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title ? `${title} | ${SITE_NAME}` : SITE_NAME;

    let descTag: HTMLMetaElement | null = null;
    let previousDescription: string | null = null;
    if (description) {
      descTag = document.querySelector('meta[name="description"]');
      if (descTag) {
        previousDescription = descTag.getAttribute('content');
        descTag.setAttribute('content', description);
      }
    }

    return () => {
      document.title = previousTitle;
      if (descTag && previousDescription !== null) {
        descTag.setAttribute('content', previousDescription);
      }
    };
  }, [title, description]);
}
