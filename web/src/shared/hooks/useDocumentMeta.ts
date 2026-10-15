import { useEffect } from "react";

type Meta = {
  title?: string;
  description?: string;
  /** "noindex" keeps a page out of search results. */
  robots?: string;
  themeColor?: string;
};

function setMeta(name: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  const created = !el;
  if (!el) {
    el = document.createElement("meta");
    el.name = name;
    document.head.append(el);
  }
  const previous = el.getAttribute("content");
  el.setAttribute("content", content);
  return () => {
    if (created) el?.remove();
    else if (previous !== null) el?.setAttribute("content", previous);
  };
}

/** Sets the tab title and head meta for the current route, and puts the previous values back on leave. */
export function useDocumentMeta({ title, description, robots, themeColor }: Meta) {
  useEffect(() => {
    const previousTitle = document.title;
    if (title) document.title = title;
    const undo = [
      description && setMeta("description", description),
      robots && setMeta("robots", robots),
      themeColor && setMeta("theme-color", themeColor),
    ];
    return () => {
      document.title = previousTitle;
      undo.forEach((fn) => fn && fn());
    };
  }, [title, description, robots, themeColor]);
}
