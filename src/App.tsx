import { useEffect, useState } from "react";
import HomePage from "./pages/HomePage";
import ArcadePage from "./pages/ArcadePage";
import TimeTrialPage from "./pages/TimeTrialPage";
import TutorialPage from "./pages/TutorialPage";

type Route = "/" | "/tutorial" | "/arcade" | "/time-trial";

function normalizeRoute(pathname: string): Route {
  if (pathname === "/tutorial") {
    return "/tutorial";
  }
  if (pathname === "/arcade") {
    return "/arcade";
  }
  if (pathname === "/time-trial") {
    return "/time-trial";
  }
  return "/";
}

function navigate(pathname: Route) {
  if (window.location.pathname === pathname) {
    return;
  }
  window.history.pushState({}, "", pathname);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => normalizeRoute(window.location.pathname));

  useEffect(() => {
    const syncRoute = () => setRoute(normalizeRoute(window.location.pathname));
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  if (route === "/tutorial") {
    return <TutorialPage onNavigate={navigate} />;
  }

  if (route === "/arcade") {
    return <ArcadePage onNavigate={navigate} />;
  }

  if (route === "/time-trial") {
    return <TimeTrialPage onNavigate={navigate} />;
  }

  return <HomePage onNavigate={navigate} />;
}
