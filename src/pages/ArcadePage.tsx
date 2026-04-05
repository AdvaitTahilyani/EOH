import ChipExperience from "../components/ChipExperience";

type Route = "/" | "/tutorial" | "/arcade" | "/time-trial";

export default function ArcadePage({ onNavigate }: { onNavigate: (route: Route) => void }) {
  return <ChipExperience mode="arcade" onNavigate={onNavigate} />;
}
