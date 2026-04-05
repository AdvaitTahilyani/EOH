import ChipExperience from "../components/ChipExperience";

type Route = "/" | "/tutorial" | "/arcade" | "/time-trial";

export default function TimeTrialPage({ onNavigate }: { onNavigate: (route: Route) => void }) {
  return <ChipExperience mode="time-trial" onNavigate={onNavigate} />;
}
