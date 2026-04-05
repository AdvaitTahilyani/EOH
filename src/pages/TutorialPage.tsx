import ChipExperience from "../components/ChipExperience";

type Route = "/" | "/tutorial" | "/arcade" | "/time-trial";

export default function TutorialPage({ onNavigate }: { onNavigate: (route: Route) => void }) {
  return <ChipExperience mode="tutorial" onNavigate={onNavigate} />;
}
