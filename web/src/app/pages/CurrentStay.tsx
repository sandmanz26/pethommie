import { useState } from "react";
import { Navigate } from "react-router-dom";
import { todayBoard, todayISO } from "@/app/domain/logic";
import { useStore } from "@/app/store/AppStore";

/**
 * /app/bookings/current: the stay of a pet who is here now (or, failing that, arriving today), so a link can open
 * "one stay" without knowing its id. With nobody here, the list of bookings.
 */
export function CurrentStay() {
  const { data } = useStore();
  const [today] = useState(todayISO);
  const board = todayBoard(data, today);
  const stay = board.inHouse[0] ?? board.arriving[0];
  return <Navigate to={stay ? `/app/bookings/${stay.id}` : "/app/bookings"} replace />;
}
