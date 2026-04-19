
import { useMeeting } from "@videosdk.live/react-sdk";
import { ParticipantView } from "./ParticipantView";
import { PresenterView } from "./PresenterView";

interface ParticipantGridProps {
  participantIds: string[];
}

export const ParticipantGrid = ({ participantIds }: ParticipantGridProps) => {
  const { presenterId, localParticipant } = useMeeting();

  const getGridConfig = (count: number) => {
    if (count === 1) return 'grid-cols-1 max-w-4xl mx-auto';
    if (count === 2) return 'grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto';
    if (count <= 4) return 'grid-cols-1 sm:grid-cols-2 max-w-6xl mx-auto';
    if (count <= 6) return 'grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto';
    return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 max-w-screen-2xl mx-auto';
  };

  // If there is a presentation active
  if (presenterId) {
    const isLocalPresenter = presenterId === localParticipant?.id;
    return (
      <div className="flex-1 w-full h-full flex flex-col md:flex-row gap-4 p-4 overflow-hidden">
        {/* Main Presentation View */}
        <div className="flex-[3] h-full overflow-hidden">
          <PresenterView presenterId={presenterId} isLocalPresenter={isLocalPresenter} />
        </div>

        {/* Side Participants Bar */}
        <div className="flex-1 h-full overflow-y-auto pr-2 space-y-4 scrollbar-hide">
          {participantIds.map((id) => (
            <div key={id} className="w-full aspect-video rounded-xl overflow-hidden shadow-lg border border-white/5">
              <ParticipantView participantId={id} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Normal Grid View
  return (
    <div className="flex-1 w-full overflow-y-auto p-4 custom-scrollbar flex flex-col items-center">
      <div className={`grid gap-4 w-full my-auto ${getGridConfig(participantIds.length)}`}>
        {participantIds.map((id) => (
          <div key={id} className="w-full h-full min-h-[180px] sm:min-h-[220px] aspect-video">
            <ParticipantView participantId={id} />
          </div>
        ))}
      </div>
    </div>
  );
};
