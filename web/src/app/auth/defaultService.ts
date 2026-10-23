import { DEMO_MODE } from "@/app/config";
import { demoAccounts } from "./demoAccounts";
import { createLocalAuthService } from "./localAuthService";

/** The service the app uses. The mock for now; swap this one line when there is a backend. */
export const authService = createLocalAuthService({ demo: DEMO_MODE ? demoAccounts : [] });
