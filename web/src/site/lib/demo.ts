/** One click from the website into the demo hotel, on the screen given (an /app path). See app/pages/DemoEntry. */
export const demoHref = (to = "/app") => (to === "/app" ? "/app/demo" : `/app/demo?to=${encodeURIComponent(to)}`);
