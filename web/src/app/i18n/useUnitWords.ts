import { useStore } from "@/app/store/AppStore";
import { useAppT } from "./useAppT";

/** The words for the hotel's places, as it calls them in Settings: cages, rooms or spaces. */
export function useUnitWords() {
  const { t } = useAppT();
  const { data } = useStore();
  return t.units[data.settings.unitTerm];
}
