import { useEffect, useState } from "react";
import { DEFAULT_FILM, films, type FilmId } from "../content/film";

const STORAGE_KEY = "pethommie.film";

function initial(): FilmId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved in films) return saved as FilmId;
  } catch {
    // Storage blocked; use the default.
  }
  return DEFAULT_FILM;
}

/** Which hero film is showing. Remembered per browser; also sets <html data-film> so the page palette follows. */
export function useFilmChoice() {
  const [filmId, setFilmId] = useState<FilmId>(initial);

  useEffect(() => {
    document.documentElement.dataset.film = filmId;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", films[filmId].paper);
    try {
      localStorage.setItem(STORAGE_KEY, filmId);
    } catch {
      // Not persisted; still applies for this visit.
    }
  }, [filmId]);

  return [filmId, setFilmId] as const;
}
